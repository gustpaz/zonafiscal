/**
 * Sistema de Verificação de Prazos LGPD
 * Verifica solicitações pendentes e envia alertas quando o prazo estiver próximo
 */

import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import { sendDeadlineReminder } from '@/lib/lgpd-emails';
import { SUPER_ADMIN_EMAILS } from '@/lib/admin-permissions';

const adminDb = getFirestore(adminApp);

interface PendingRequest {
  id: string;
  userId: string;
  requestedAt: string;
  type: string;
  daysRemaining: number;
}

/**
 * Verifica solicitações pendentes e retorna as que estão próximas do prazo
 */
export async function checkPendingRequests(): Promise<PendingRequest[]> {
  try {
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const twelveDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);

    const pendingRequests: PendingRequest[] = [];

    // 1. Verificar solicitações de reativação pendentes
    const reactivationRequestsSnap = await adminDb
      .collection('reactivation_requests')
      .where('status', '==', 'awaiting_approval')
      .get();

    reactivationRequestsSnap.docs.forEach(doc => {
      const data = doc.data();
      const requestDate = new Date(data.requestedAt);
      const daysSinceRequest = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = 15 - daysSinceRequest;

      // Alertar quando restarem 3 dias ou menos
      if (daysRemaining <= 3 && daysRemaining > 0) {
        pendingRequests.push({
          id: doc.id,
          userId: data.userId,
          requestedAt: data.requestedAt,
          type: 'Reativação de Conta',
          daysRemaining,
        });
      }
    });

    // 2. Verificar logs de auditoria para outras solicitações
    const auditLogsSnap = await adminDb
      .collection('data_processing_audit')
      .where('action', 'in', ['export', 'delete', 'anonymize'])
      .where('timestamp', '>=', fifteenDaysAgo.toISOString())
      .where('timestamp', '<=', twelveDaysAgo.toISOString())
      .get();

    auditLogsSnap.docs.forEach(doc => {
      const data = doc.data();
      const requestDate = new Date(data.timestamp);
      const daysSinceRequest = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = 15 - daysSinceRequest;

      if (daysRemaining <= 3 && daysRemaining > 0) {
        pendingRequests.push({
          id: doc.id,
          userId: data.userId,
          requestedAt: data.timestamp,
          type: getActionTypeName(data.action),
          daysRemaining,
        });
      }
    });

    return pendingRequests;
  } catch (error) {
    console.error('Erro ao verificar solicitações pendentes:', error);
    return [];
  }
}

/**
 * Envia alertas de prazo para os administradores
 */
export async function sendDeadlineAlerts(): Promise<number> {
  try {
    const pendingRequests = await checkPendingRequests();

    if (pendingRequests.length === 0) {
      console.log('✅ Nenhuma solicitação próxima do prazo');
      return 0;
    }

    console.log(`⚠️ ${pendingRequests.length} solicitações próximas do prazo`);

    // Buscar admins do sistema
    const adminsSnap = await adminDb
      .collection('users')
      .where('adminRole', 'in', ['Super Admin', 'Admin'])
      .get();

    const adminEmails = adminsSnap.docs
      .map(doc => doc.data().email)
      .filter(email => email);

    // Se não houver admins, usar os super admins hardcoded
    const emailsToNotify = adminEmails.length > 0 
      ? adminEmails 
      : ['gustpaz@gmail.com', 'admin@zonafiscal.com'];

    let emailsSent = 0;

    // Enviar email para cada solicitação pendente
    for (const request of pendingRequests) {
      for (const adminEmail of emailsToNotify) {
        const sent = await sendDeadlineReminder(
          adminEmail,
          request.type,
          request.daysRemaining,
          request.requestedAt
        );

        if (sent) {
          emailsSent++;
        }
      }

      // Registrar que o alerta foi enviado
      await adminDb.collection('data_processing_audit').add({
        userId: request.userId,
        action: 'deadline_alert_sent',
        dataType: 'notification',
        timestamp: new Date().toISOString(),
        purpose: `Alerta de prazo LGPD enviado (${request.daysRemaining} dias restantes)`,
        legalBasis: 'legal_obligation',
      });
    }

    console.log(`✅ ${emailsSent} alertas de prazo enviados`);
    return emailsSent;
  } catch (error) {
    console.error('Erro ao enviar alertas de prazo:', error);
    return 0;
  }
}

/**
 * Helper para traduzir tipo de ação
 */
function getActionTypeName(action: string): string {
  const actionNames: Record<string, string> = {
    'export': 'Exportação de Dados',
    'delete': 'Exclusão de Dados',
    'anonymize': 'Anonimização de Dados',
    'revert_anonymization': 'Reversão de Anonimização',
  };

  return actionNames[action] || 'Solicitação LGPD';
}

/**
 * Função para ser executada diariamente (cron job ou scheduled task)
 * Pode ser chamada via API route ou Firebase Functions
 */
export async function runDailyLGPDCheck(): Promise<void> {
  try {
    console.log('🔍 Iniciando verificação diária de prazos LGPD...');
    
    const alertsSent = await sendDeadlineAlerts();
    
    console.log(`✅ Verificação diária concluída. ${alertsSent} alertas enviados.`);
  } catch (error) {
    console.error('❌ Erro na verificação diária de LGPD:', error);
  }
}

