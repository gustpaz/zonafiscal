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

    // Obter userId da query string
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return createErrorResponse('userId é obrigatório', 400);
    }

    // Buscar logs de auditoria do usuário
    const logsSnap = await adminDb
      .collection('data_processing_audit')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const logs = logsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return createSuccessResponse({
      logs,
      total: logs.length,
      userId,
    });
  } catch (error: any) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return createErrorResponse('Erro ao buscar logs de auditoria', 500);
  }
}

