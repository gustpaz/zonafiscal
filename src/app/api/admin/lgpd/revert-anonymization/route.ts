import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import { verifyAdminAuth } from '@/lib/api-admin-auth';
import { PERMISSIONS } from '@/lib/admin-permissions';
import { sendReactivationEmail } from '@/lib/lgpd-emails';

const adminDb = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const auth = await verifyAdminAuth(req, PERMISSIONS.LGPD_REVERT_ANONYMIZATION);
    if (!auth.success) {
      logSecurityEvent('Unauthorized revert anonymization attempt', {}, req);
      return auth.error;
    }

    const { userId } = await req.json();

    if (!userId) {
      return createErrorResponse('userId é obrigatório', 400);
    }

    // Verificar se o usuário existe e está anonimizado
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return createErrorResponse('Usuário não encontrado', 404);
    }

    const userData = userSnap.data();
    if (!userData?.anonymized) {
      return createErrorResponse('Usuário não está anonimizado', 400);
    }

    // Marcar como "revertendo" e criar uma solicitação de dados
    await userRef.update({
      revertingAnonymization: true,
      revertRequestedAt: new Date().toISOString(),
      revertRequestedBy: auth.userId,
    });

    // Criar uma "solicitação de reativação" que o usuário deverá preencher
    const reactivationRef = adminDb.collection('reactivation_requests').doc(userId);
    await reactivationRef.set({
      userId,
      requestedAt: new Date().toISOString(),
      requestedBy: auth.userId,
      status: 'pending',
      originalAnonymizationDate: userData.anonymizedAt,
      originalAnonymizationReason: userData.anonymizationReason,
    });

    // Enviar email para o usuário solicitando que forneça os dados novamente
    const emailSent = await sendReactivationEmail(
      userData.email,
      userId,
      userData.name || 'Usuário'
    );

    if (!emailSent) {
      console.warn('⚠️ Falha ao enviar email de reativação, mas a solicitação foi criada');
    }

    // Registrar ação de auditoria
    await adminDb.collection('data_processing_audit').add({
      userId,
      action: 'revert_anonymization',
      dataType: 'user_profile',
      timestamp: new Date().toISOString(),
      purpose: 'Reversão de anonimização solicitada pelo admin',
      legalBasis: 'legal_obligation',
      adminId: auth.userId,
    });

    logSecurityEvent('Anonymization revert requested', { userId, adminId: auth.userId }, req);

    return createSuccessResponse({
      success: true,
      message: 'Solicitação de reversão criada com sucesso. O usuário será notificado.',
      reactivationRequestId: userId,
    });
  } catch (error: any) {
    logSecurityEvent('Revert anonymization error', { error: error.message }, req);
    console.error('Erro ao reverter anonimização:', error);
    return createErrorResponse('Erro ao reverter anonimização', 500);
  }
}

