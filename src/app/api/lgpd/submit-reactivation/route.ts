import { NextRequest } from 'next/server';
import { withValidation, createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import { z } from 'zod';

const adminDb = getFirestore(adminApp);

const reactivationSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato 000.000.000-00'),
  phone: z.string().optional(),
});

export const POST = withValidation(
  reactivationSchema,
  { requireAuth: false, sanitize: true }
)(async (req: NextRequest, validatedData) => {
  try {
    const { token, name, email, cpf, phone } = validatedData;

    // Verificar se o token existe e está pendente
    const reactivationRef = adminDb.collection('reactivation_requests').doc(token);
    const reactivationSnap = await reactivationRef.get();

    if (!reactivationSnap.exists) {
      logSecurityEvent('Invalid reactivation token', { token }, req);
      return createErrorResponse('Token inválido', 404);
    }

    const reactivationData = reactivationSnap.data();

    if (reactivationData?.status !== 'pending') {
      return createErrorResponse('Esta solicitação já foi processada', 400);
    }

    // Verificar se expirou
    const requestedAt = new Date(reactivationData?.requestedAt);
    const expiresAt = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (new Date() > expiresAt) {
      return createErrorResponse('Token expirado', 400);
    }

    const userId = reactivationData?.userId;

    // Atualizar a solicitação com os dados fornecidos
    await reactivationRef.update({
      status: 'awaiting_approval',
      submittedAt: new Date().toISOString(),
      submittedData: {
        name,
        email,
        cpf,
        phone,
      },
      ipAddress: req.ip || req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    // Registrar ação de auditoria
    await adminDb.collection('data_processing_audit').add({
      userId,
      action: 'reactivation_data_submitted',
      dataType: 'user_profile',
      timestamp: new Date().toISOString(),
      purpose: 'Usuário forneceu dados para reativação de conta anonimizada',
      legalBasis: 'consent',
    });

    logSecurityEvent('Reactivation data submitted', { userId, token }, req);

    return createSuccessResponse({
      success: true,
      message: 'Seus dados foram recebidos. Aguarde aprovação do administrador.',
    });
  } catch (error: any) {
    logSecurityEvent('Reactivation submission error', { error: error.message }, req);
    console.error('Erro ao processar reativação:', error);
    return createErrorResponse('Erro ao processar reativação', 500);
  }
});

