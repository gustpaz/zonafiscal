import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { runDailyLGPDCheck } from '@/lib/lgpd-deadline-checker';

/**
 * Endpoint para verificação diária de prazos LGPD
 * Deve ser chamado por um cron job (Vercel Cron, GitHub Actions, etc)
 * 
 * Configuração no vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/lgpd-deadline-check",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar se a requisição vem do cron (Vercel Cron Header)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Proteção: Apenas cron jobs ou requisições autorizadas
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logSecurityEvent('Unauthorized cron job attempt', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }

    // Executar verificação diária
    await runDailyLGPDCheck();

    logSecurityEvent('LGPD deadline check executed', {}, req);

    return createSuccessResponse({
      success: true,
      message: 'Verificação de prazos LGPD executada com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logSecurityEvent('LGPD deadline check error', { error: error.message }, req);
    console.error('Erro na verificação de prazos LGPD:', error);
    return createErrorResponse('Erro na verificação de prazos', 500);
  }
}

