import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { deleteUserDataPermanently } from '@/lib/lgpd-consent-admin';
import { verifyAdminAuth } from '@/lib/api-admin-auth';
import { PERMISSIONS } from '@/lib/admin-permissions';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const auth = await verifyAdminAuth(req, PERMISSIONS.LGPD_DELETE_PERMANENTLY);
    if (!auth.success) {
      logSecurityEvent('Unauthorized permanent delete attempt', {}, req);
      return auth.error;
    }

    const { userId } = await req.json();

    if (!userId) {
      return createErrorResponse('userId é obrigatório', 400);
    }

    // Excluir permanentemente todos os dados do usuário
    await deleteUserDataPermanently(
      userId,
      `Exclusão permanente solicitada pelo admin ${auth.userId}`
    );

    logSecurityEvent('User permanently deleted by admin', { userId, adminId: auth.userId }, req);

    return createSuccessResponse({
      success: true,
      message: 'Todos os dados do usuário foram excluídos permanentemente.',
    });
  } catch (error: any) {
    logSecurityEvent('Permanent delete error', { error: error.message }, req);
    console.error('Erro ao excluir usuário permanentemente:', error);
    return createErrorResponse('Erro ao excluir usuário permanentemente', 500);
  }
}

