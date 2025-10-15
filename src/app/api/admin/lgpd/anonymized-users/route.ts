import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-validation';
import { adminAuth } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import { requirePermission, PERMISSIONS } from '@/lib/admin-permissions';

const adminDb = getFirestore(adminApp);

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação e permissões de admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('Não autorizado', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return createErrorResponse('Não autorizado', 401);
    }

    // Verificar permissões de admin
    const hasAccess = await requirePermission(decodedToken.uid, PERMISSIONS.LGPD_VIEW_USERS);
    if (!hasAccess) {
      return createErrorResponse('Acesso negado - requer permissões de admin', 403);
    }

    // Buscar todos os usuários anonimizados
    const usersSnap = await adminDb
      .collection('users')
      .where('anonymized', '==', true)
      .get();

    const anonymizedUsers = usersSnap.docs.map(doc => {
      const data = doc.data();
      return {
        userId: doc.id,
        anonymizedAt: data.anonymizedAt || null,
        anonymizationReason: data.anonymizationReason || 'Não informado',
        originalEmail: data.email, // Será "anonimizado_xxx@removido.com"
        canRevert: true, // Pode ser revertido se ainda existir no sistema
      };
    });

    return createSuccessResponse({
      users: anonymizedUsers,
      total: anonymizedUsers.length,
    });
  } catch (error: any) {
    console.error('Erro ao buscar usuários anonimizados:', error);
    return createErrorResponse('Erro ao buscar usuários anonimizados', 500);
  }
}

