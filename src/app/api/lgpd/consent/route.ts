import { NextRequest } from 'next/server';
import { withValidation, createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { saveUserConsent, getUserConsent, ConsentType } from '@/lib/lgpd-consent-admin';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase-admin';

const consentSchema = z.object({
  essential: z.boolean().optional(),
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
  personalization: z.boolean().optional(),
  data_processing: z.boolean().optional(),
  data_sharing: z.boolean().optional(),
});

export const POST = withValidation(
  consentSchema,
  { requireAuth: false, sanitize: false }
)(async (req: NextRequest, validatedData) => {
  try {
    // Verificar autenticação via Firebase Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logSecurityEvent('Unauthorized consent update attempt - no token', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      logSecurityEvent('Unauthorized consent update attempt - invalid token', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }
    const ipAddress = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Salvar consentimentos
    await saveUserConsent(userId, validatedData, { ipAddress, userAgent });

    return createSuccessResponse({
      success: true,
      message: 'Consentimentos salvos com sucesso',
    });
  } catch (error: any) {
    logSecurityEvent('Consent save error', { error: error.message }, req);
    console.error('Erro ao salvar consentimentos:', error);
    return createErrorResponse('Erro ao salvar consentimentos', 500);
  }
});

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação via Firebase Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('Não autorizado', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      return createErrorResponse('Não autorizado', 401);
    }

    // Obter consentimentos
    const consent = await getUserConsent(userId);

    if (!consent) {
      return createSuccessResponse({
        consents: {},
        hasConsented: false,
      });
    }

    return createSuccessResponse({
      consents: consent.consents,
      lastUpdated: consent.lastUpdated,
      consentVersion: consent.consentVersion,
      hasConsented: true,
    });
  } catch (error: any) {
    console.error('Erro ao obter consentimentos:', error);
    return createErrorResponse('Erro ao obter consentimentos', 500);
  }
}

