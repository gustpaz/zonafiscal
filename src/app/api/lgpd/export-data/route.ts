import { NextRequest } from 'next/server';
import { exportUserData, logDataProcessing } from '@/lib/lgpd-consent-admin';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação via Firebase Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logSecurityEvent('Unauthorized data export attempt - no token', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      logSecurityEvent('Unauthorized data export attempt - invalid token', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }

    // Exportar dados do usuário
    const userData = await exportUserData(userId);

    // Criar arquivo JSON para download
    const jsonData = JSON.stringify(userData, null, 2);
    const blob = Buffer.from(jsonData, 'utf-8');

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="meus-dados-${userId}-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    logSecurityEvent('Data export error', { error: error.message }, req);
    console.error('Erro ao exportar dados:', error);
    return createErrorResponse('Erro ao exportar dados', 500);
  }
}

