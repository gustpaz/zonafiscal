import { NextRequest } from 'next/server';
import { createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { exportUserData } from '@/lib/lgpd-consent-admin';
import { verifyAdminAuth } from '@/lib/api-admin-auth';
import { PERMISSIONS } from '@/lib/admin-permissions';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const auth = await verifyAdminAuth(req, PERMISSIONS.LGPD_EXPORT_DATA);
    if (!auth.success) {
      logSecurityEvent('Unauthorized admin export attempt', {}, req);
      return auth.error;
    }

    // Obter userId da query string
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return createErrorResponse('userId é obrigatório', 400);
    }

    // Exportar dados do usuário
    const userData = await exportUserData(userId);

    // Criar arquivo JSON para download
    const jsonData = JSON.stringify(userData, null, 2);
    const blob = Buffer.from(jsonData, 'utf-8');

    logSecurityEvent('Admin exported user data', { userId, adminId: auth.userId }, req);

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-${userId}-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    logSecurityEvent('Admin export error', { error: error.message }, req);
    console.error('Erro ao exportar dados:', error);
    return createErrorResponse('Erro ao exportar dados', 500);
  }
}

