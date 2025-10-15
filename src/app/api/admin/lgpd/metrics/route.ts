import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-validation';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import { verifyAdminAuth } from '@/lib/api-admin-auth';
import { PERMISSIONS } from '@/lib/admin-permissions';

const adminDb = getFirestore(adminApp);

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const auth = await verifyAdminAuth(req, PERMISSIONS.LGPD_VIEW_LOGS);
    if (!auth.success) {
      return auth.error;
    }

    // Buscar todas as métricas LGPD
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Total de usuários anonimizados
    const anonymizedUsersSnap = await adminDb
      .collection('users')
      .where('anonymized', '==', true)
      .get();
    const totalAnonymized = anonymizedUsersSnap.size;

    // 2. Solicitações de reativação
    const reactivationRequestsSnap = await adminDb
      .collection('reactivation_requests')
      .get();
    
    const pendingReactivations = reactivationRequestsSnap.docs.filter(
      doc => doc.data().status === 'awaiting_approval'
    ).length;

    // 3. Solicitações pendentes (aguardando resposta há mais de 7 dias)
    const overdueLogs = await adminDb
      .collection('data_processing_audit')
      .where('action', 'in', ['export', 'delete', 'anonymize', 'revert_anonymization'])
      .where('timestamp', '<', fifteenDaysAgo.toISOString())
      .get();
    
    const overdueCount = overdueLogs.size;

    // 4. Solicitações nos últimos 30 dias
    const recentLogsSnap = await adminDb
      .collection('data_processing_audit')
      .where('timestamp', '>=', thirtyDaysAgo.toISOString())
      .get();
    
    const requestsLast30Days = recentLogsSnap.size;

    // 5. Solicitações por tipo (últimos 30 dias)
    const actionCounts: Record<string, number> = {};
    recentLogsSnap.docs.forEach(doc => {
      const action = doc.data().action;
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    // 6. Exportações de dados (últimos 30 dias)
    const exportsCount = recentLogsSnap.docs.filter(
      doc => doc.data().action === 'export'
    ).length;

    // 7. Tempo médio de resposta
    const completedRequests = await adminDb
      .collection('reactivation_requests')
      .where('status', 'in', ['approved', 'rejected'])
      .get();

    let totalResponseTime = 0;
    let countCompleted = 0;

    completedRequests.docs.forEach(doc => {
      const data = doc.data();
      if (data.requestedAt && (data.approvedAt || data.rejectedAt)) {
        const requestDate = new Date(data.requestedAt);
        const responseDate = new Date(data.approvedAt || data.rejectedAt);
        const diffDays = Math.floor((responseDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
        totalResponseTime += diffDays;
        countCompleted++;
      }
    });

    const averageResponseDays = countCompleted > 0 
      ? Math.round(totalResponseTime / countCompleted) 
      : 0;

    // 8. Alertas de prazo (solicitações com mais de 12 dias)
    const twelveDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
    const urgentRequestsSnap = await adminDb
      .collection('reactivation_requests')
      .where('status', '==', 'awaiting_approval')
      .where('requestedAt', '<', twelveDaysAgo.toISOString())
      .get();
    
    const urgentRequestsCount = urgentRequestsSnap.size;

    return createSuccessResponse({
      metrics: {
        totalAnonymized,
        pendingReactivations,
        overdueRequests: overdueCount,
        requestsLast30Days,
        exportsLast30Days: exportsCount,
        averageResponseDays,
        urgentRequests: urgentRequestsCount,
        actionCounts,
      },
      updatedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Erro ao buscar métricas:', error);
    return createErrorResponse('Erro ao buscar métricas', 500);
  }
}

