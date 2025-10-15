import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-validation';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';

const adminDb = getFirestore(adminApp);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return createErrorResponse('Token é obrigatório', 400);
    }

    // Verificar se existe uma solicitação de reativação pendente
    const reactivationRef = adminDb.collection('reactivation_requests').doc(token);
    const reactivationSnap = await reactivationRef.get();

    if (!reactivationSnap.exists) {
      return createErrorResponse('Token inválido ou não encontrado', 404);
    }

    const reactivationData = reactivationSnap.data();

    // Verificar se já foi processada
    if (reactivationData?.status !== 'pending') {
      return createErrorResponse('Esta solicitação já foi processada', 400);
    }

    // Verificar se expirou (7 dias)
    const requestedAt = new Date(reactivationData?.requestedAt);
    const expiresAt = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (new Date() > expiresAt) {
      return createErrorResponse('Token expirado', 400);
    }

    return createSuccessResponse({
      valid: true,
      userId: reactivationData?.userId,
    });
  } catch (error: any) {
    console.error('Erro ao validar token:', error);
    return createErrorResponse('Erro ao validar token', 500);
  }
}

