import { WebClient } from '@slack/web-api';
import { getSlackConfig } from '@/lib/admin-slack-config';
import { withValidation, createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { z } from 'zod';

// Schema de validação para notificações Slack
const slackNotificationSchema = z.object({
  type: z.enum(['new_user', 'new_payment', 'upgrade', 'cancellation', 'failed_payment', 'custom'], {
    errorMap: () => ({ message: 'Tipo de notificação inválido' })
  }),
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(100, 'Título muito longo'),
  message: z.string()
    .min(1, 'Mensagem é obrigatória')
    .max(1000, 'Mensagem muito longa'),
  data: z.record(z.string(), z.any()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB').optional()
});

export const POST = withValidation(
  slackNotificationSchema,
  { requireAuth: false, sanitize: true }
)(async (req, validatedData) => {
  try {
    // Buscar configuração do Firestore (prioridade) ou fallback para env
    const config = await getSlackConfig();
    
    const slackToken = config?.botToken || process.env.SLACK_BOT_TOKEN;
    const slackChannel = config?.channelId || process.env.SLACK_CHANNEL_ID || '#geral';
    const isEnabled = config?.enabled !== false; // Enabled por padrão se não configurado
    
    if (!slackToken) {
      logSecurityEvent('Slack notification without token', { type: validatedData.type }, req);
      console.warn('SLACK_BOT_TOKEN não configurado');
      return createErrorResponse('Slack não configurado', 400);
    }
    
    if (!isEnabled) {
      console.log('Notificações Slack desabilitadas');
      return createSuccessResponse({ success: true, message: 'Notificações desabilitadas' });
    }

    const { type, title, message, data, color } = validatedData;
    
    const slack = new WebClient(slackToken);
    
    // Emoji por tipo
    const emoji = {
      new_user: ':tada:',
      new_payment: ':moneybag:',
      upgrade: ':arrow_up:',
      cancellation: ':cry:',
      failed_payment: ':warning:'
    }[type] || ':bell:';
    
    // Criar blocos de mensagem
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      }
    ];
    
    // Adicionar campos de dados se houver
    if (data && Object.keys(data).length > 0) {
      const fields = Object.entries(data).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}:* ${value}`
      }));
      
      blocks.push({
        type: 'section',
        fields: fields.slice(0, 10) // Máximo 10 campos
      });
    }
    
    // Adicionar divider
    blocks.push({
      type: 'divider'
    });
    
    // Adicionar timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} às {time}|${new Date().toLocaleString('pt-BR')}>`
        }
      ]
    });
    
    // Enviar mensagem
    await slack.chat.postMessage({
      channel: slackChannel,
      text: `${emoji} ${title}: ${message}`,
      blocks,
      unfurl_links: false,
      unfurl_media: false
    });
    
    return createSuccessResponse({ success: true, message: 'Notificação enviada com sucesso' });
  } catch (error: any) {
    logSecurityEvent('Slack notification error', { error: error.message, type }, req);
    console.error('Erro ao enviar notificação Slack:', error);
    return createErrorResponse('Erro ao enviar notificação Slack', 500);
  }
}

