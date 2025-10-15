/**
 * Sistema de Envio de Emails LGPD
 * Envia emails relacionados a solicitações LGPD
 */

import { Resend } from 'resend';
import ReactivationRequestEmail from '@/emails/reactivation-request';
import LGPDDeadlineReminderEmail from '@/emails/lgpd-deadline-reminder';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envia email de solicitação de reativação
 */
export async function sendReactivationEmail(
  email: string,
  userId: string,
  userName?: string
): Promise<boolean> {
  try {
    const reactivationLink = `${process.env.NEXT_PUBLIC_APP_URL}/reativar-conta?token=${userId}`;

    const { data, error } = await resend.emails.send({
      from: 'Zona Fiscal - DPO <dpo@zonafiscal.com.br>',
      to: [email],
      subject: '🔄 Solicitação de Reativação de Conta - Zona Fiscal',
      react: ReactivationRequestEmail({
        userName,
        reactivationLink,
      }),
    });

    if (error) {
      console.error('Erro ao enviar email de reativação:', error);
      return false;
    }

    console.log('✅ Email de reativação enviado:', data?.id);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de reativação:', error);
    return false;
  }
}

/**
 * Envia lembrete de prazo LGPD para admins
 */
export async function sendDeadlineReminder(
  adminEmail: string,
  requestType: string,
  daysRemaining: number,
  requestDate: string,
  adminName?: string
): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Zona Fiscal - Sistema LGPD <sistema@zonafiscal.com.br>',
      to: [adminEmail],
      subject: `⚠️ Prazo LGPD: ${daysRemaining} dias restantes - ${requestType}`,
      react: LGPDDeadlineReminderEmail({
        requestType,
        daysRemaining,
        requestDate,
        userName: adminName,
      }),
    });

    if (error) {
      console.error('Erro ao enviar lembrete de prazo:', error);
      return false;
    }

    console.log('✅ Lembrete de prazo enviado:', data?.id);
    return true;
  } catch (error) {
    console.error('Erro ao enviar lembrete de prazo:', error);
    return false;
  }
}

/**
 * Envia email de confirmação de exclusão de dados
 */
export async function sendDataDeletionConfirmation(
  email: string,
  userName?: string,
  deleteType: 'anonymize' | 'permanent' = 'permanent'
): Promise<boolean> {
  try {
    const subject = deleteType === 'anonymize'
      ? '✅ Seus Dados Foram Anonimizados - Zona Fiscal'
      : '✅ Sua Conta Foi Excluída - Zona Fiscal';

    const message = deleteType === 'anonymize'
      ? `Seus dados pessoais foram anonimizados conforme solicitado. Se desejar reativar sua conta, entre em contato com dpo@zonafiscal.com.br.`
      : `Sua conta e todos os seus dados foram excluídos permanentemente conforme solicitado. Esta ação é irreversível.`;

    const { data, error } = await resend.emails.send({
      from: 'Zona Fiscal - DPO <dpo@zonafiscal.com.br>',
      to: [email],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #72A7A7;">Confirmação de ${deleteType === 'anonymize' ? 'Anonimização' : 'Exclusão'}</h1>
            <p>Olá ${userName || 'Usuário'},</p>
            <p>${message}</p>
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Seus Direitos (LGPD)</strong></p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
                Você exerceu seu direito à ${deleteType === 'anonymize' ? 'anonimização' : 'exclusão'} de dados
                conforme o Art. 18, VI da LGPD (Lei nº 13.709/2018).
              </p>
            </div>
            <p style="font-size: 14px; color: #666;">
              Dúvidas? Entre em contato: dpo@zonafiscal.com.br
            </p>
            <p style="font-size: 12px; color: #999;">
              © ${new Date().getFullYear()} Zona Fiscal. Todos os direitos reservados.
            </p>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar confirmação de exclusão:', error);
      return false;
    }

    console.log('✅ Email de confirmação enviado:', data?.id);
    return true;
  } catch (error) {
    console.error('Erro ao enviar confirmação de exclusão:', error);
    return false;
  }
}

