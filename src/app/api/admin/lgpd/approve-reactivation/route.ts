import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import { verifyAdminAuth } from '@/lib/api-admin-auth';
import { PERMISSIONS } from '@/lib/admin-permissions';

const adminDb = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const auth = await verifyAdminAuth(req, PERMISSIONS.LGPD_REVERT_ANONYMIZATION);
    if (!auth.success) {
      logSecurityEvent('Unauthorized reactivation approval attempt', {}, req);
      return auth.error;
    }

    const { token, approved } = await req.json();

    if (!token) {
      return createErrorResponse('Token é obrigatório', 400);
    }

    // Buscar solicitação de reativação
    const reactivationRef = adminDb.collection('reactivation_requests').doc(token);
    const reactivationSnap = await reactivationRef.get();

    if (!reactivationSnap.exists) {
      return createErrorResponse('Solicitação não encontrada', 404);
    }

    const reactivationData = reactivationSnap.data();
    const userId = reactivationData?.userId;

    if (approved) {
      // APROVAR - Restaurar dados do usuário
      const userRef = adminDb.collection('users').doc(userId);
      const submittedData = reactivationData?.submittedData;

      await userRef.update({
        name: submittedData?.name,
        email: submittedData?.email,
        cpf: submittedData?.cpf,
        phone: submittedData?.phone || null,
        anonymized: false,
        revertingAnonymization: false,
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: auth.userId,
      });

      // Atualizar solicitação
      await reactivationRef.update({
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: auth.userId,
      });

      // Registrar auditoria
      await adminDb.collection('data_processing_audit').add({
        userId,
        action: 'reactivation_approved',
        dataType: 'user_profile',
        timestamp: new Date().toISOString(),
        purpose: 'Conta anonimizada reativada pelo admin',
        legalBasis: 'consent',
        adminId: auth.userId,
      });

      logSecurityEvent('Reactivation approved', { userId, adminId: auth.userId }, req);

      return createSuccessResponse({
        success: true,
        message: 'Reativação aprovada com sucesso. O usuário pode fazer login novamente.',
      });
    } else {
      // REJEITAR
      await reactivationRef.update({
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: auth.userId,
      });

      // Registrar auditoria
      await adminDb.collection('data_processing_audit').add({
        userId,
        action: 'reactivation_rejected',
        dataType: 'user_profile',
        timestamp: new Date().toISOString(),
        purpose: 'Solicitação de reativação rejeitada pelo admin',
        legalBasis: 'legal_obligation',
        adminId: auth.userId,
      });

      logSecurityEvent('Reactivation rejected', { userId, adminId: auth.userId }, req);

      return createSuccessResponse({
        success: true,
        message: 'Reativação rejeitada.',
      });
    }
  } catch (error: any) {
    logSecurityEvent('Reactivation approval error', { error: error.message }, req);
    console.error('Erro ao processar aprovação:', error);
    return createErrorResponse('Erro ao processar aprovação', 500);
  }
}

