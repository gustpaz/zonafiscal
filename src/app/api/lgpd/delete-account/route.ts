import { NextRequest } from 'next/server';
import { withValidation, createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { anonymizeUserData, deleteUserDataPermanently } from '@/lib/lgpd-consent-admin';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

const deleteAccountSchema = z.object({
  passwordVerified: z.boolean().refine(val => val === true, {
    message: 'Senha deve ser verificada antes de prosseguir'
  }),
  deleteType: z.enum(['anonymize', 'permanent'], {
    errorMap: () => ({ message: 'Tipo de exclusão inválido' })
  }),
  reason: z.string().max(500, 'Motivo muito longo').optional(),
});

export const POST = withValidation(
  deleteAccountSchema,
  { requireAuth: false, sanitize: true }
)(async (req: NextRequest, validatedData) => {
  try {
    // Verificar autenticação via Firebase Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logSecurityEvent('Unauthorized account deletion attempt - no token', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      logSecurityEvent('Unauthorized account deletion attempt - invalid token', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }
    const { deleteType, reason, passwordVerified } = validatedData;

    // Verificar se a senha foi validada no frontend
    if (!passwordVerified) {
      logSecurityEvent('Account deletion attempt without password verification', { userId }, req);
      return createErrorResponse('Senha deve ser verificada antes de prosseguir', 403);
    }

    if (deleteType === 'anonymize') {
      // Anonimizar dados (soft delete)
      await anonymizeUserData(userId, reason);
      
      return createSuccessResponse({
        success: true,
        message: 'Seus dados foram anonimizados com sucesso. Você será desconectado.',
        type: 'anonymize',
      });
    } else {
      // Exclusão permanente (hard delete)
      await deleteUserDataPermanently(userId, reason);
      
      return createSuccessResponse({
        success: true,
        message: 'Sua conta e todos os seus dados foram excluídos permanentemente.',
        type: 'permanent',
      });
    }
  } catch (error: any) {
    logSecurityEvent('Account deletion error', { error: error.message }, req);
    console.error('Erro ao excluir conta:', error);
    return createErrorResponse('Erro ao processar exclusão de conta', 500);
  }
});

