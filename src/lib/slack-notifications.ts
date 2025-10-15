export interface SlackNotification {
  type: 'new_user' | 'new_payment' | 'upgrade' | 'cancellation' | 'failed_payment';
  title: string;
  message: string;
  data?: Record<string, any>;
  color?: 'good' | 'warning' | 'danger';
}

export async function sendSlackNotification(notification: SlackNotification): Promise<boolean> {
  try {
    // Usar URL absoluta quando chamado do servidor
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const response = await fetch(`${baseUrl}/api/slack/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar notificação Slack:', error);
    return false;
  }
}

// Notificação de novo usuário
export async function notifyNewUser(userName: string, userEmail: string, utmSource?: string) {
  return sendSlackNotification({
    type: 'new_user',
    title: '🎉 Novo Usuário Cadastrado',
    message: `*${userName}* (${userEmail}) acabou de se cadastrar!`,
    data: {
      email: userEmail,
      source: utmSource || 'direct'
    },
    color: 'good'
  });
}

// Notificação de novo pagamento
export async function notifyNewPayment(userName: string, plan: string, amount: number) {
  return sendSlackNotification({
    type: 'new_payment',
    title: '💰 Novo Pagamento Recebido',
    message: `*${userName}* assinou o plano *${plan}* por *R$ ${amount.toFixed(2)}*!`,
    data: {
      plan,
      amount
    },
    color: 'good'
  });
}

// Notificação de upgrade
export async function notifyUpgrade(userName: string, fromPlan: string, toPlan: string) {
  return sendSlackNotification({
    type: 'upgrade',
    title: '⬆️ Upgrade de Plano',
    message: `*${userName}* fez upgrade de *${fromPlan}* para *${toPlan}*!`,
    data: {
      fromPlan,
      toPlan
    },
    color: 'good'
  });
}

// Notificação de cancelamento
export async function notifyCancellation(userName: string, plan: string) {
  return sendSlackNotification({
    type: 'cancellation',
    title: '😢 Cancelamento',
    message: `*${userName}* cancelou o plano *${plan}*.`,
    data: {
      plan
    },
    color: 'warning'
  });
}

// Notificação de falha de pagamento
export async function notifyFailedPayment(userName: string, amount: number) {
  return sendSlackNotification({
    type: 'failed_payment',
    title: '⚠️ Falha no Pagamento',
    message: `Pagamento de *R$ ${amount.toFixed(2)}* de *${userName}* falhou!`,
    data: {
      amount
    },
    color: 'danger'
  });
}

