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
    const auth = await verifyAdminAuth(req, PERMISSIONS.LGPD_VIEW_USERS);
    if (!auth.success) {
      return auth.error;
    }

    // Buscar todas as solicitações de reativação
    const requestsSnap = await adminDb
      .collection('reactivation_requests')
      .orderBy('requestedAt', 'desc')
      .get();

    const requests = requestsSnap.docs.map(doc => ({
      token: doc.id,
      ...doc.data(),
    }));

    // Filtrar apenas pendentes e aguardando aprovação
    const pendingRequests = requests.filter(
      req => req.status === 'pending' || req.status === 'awaiting_approval'
    );

    return createSuccessResponse({
      requests: pendingRequests,
      total: pendingRequests.length,
    });
  } catch (error: any) {
    console.error('Erro ao buscar solicitações:', error);
    return createErrorResponse('Erro ao buscar solicitações', 500);
  }
}

