import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { notifyNewPayment, notifyUpgrade, notifyCancellation, notifyFailedPayment } from '@/lib/slack-notifications';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';

const adminDb = getFirestore(adminApp);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    // Validação básica para webhook (aceitar application/json com ou sem charset)
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      logSecurityEvent('Invalid webhook content-type', { contentType }, req);
      return createErrorResponse('Content-Type deve ser application/json', 400);
    }

    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    // Verificar assinatura do webhook
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      
      // Log do evento recebido (sem dados sensíveis)
      logSecurityEvent('Stripe webhook received', { 
        type: event.type, 
        id: event.id,
        created: event.created 
      }, req);
      
    } catch (err) {
      logSecurityEvent('Webhook signature verification failed', { error: err.message }, req);
      console.error('⚠️ Webhook signature verification failed:', err);
      return createErrorResponse('Webhook signature verification failed', 400);
    }

    console.log('✅ Webhook recebido:', event.type);

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`🔔 Evento não tratado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// Handler para checkout completado
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`🔍 Checkout session recebida:`, {
      id: session.id,
      metadata: session.metadata,
      subscription: session.subscription,
      customer: session.customer
    });
    
    const userId = session.metadata?.userId;
    if (!userId) {
      console.error('❌ userId não encontrado no metadata:', session.metadata);
      return;
    }

    console.log(`💳 Checkout completado para usuário: ${userId}`);

    // Buscar dados do usuário (Admin SDK)
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    const previousPlan = userData?.plan || 'Gratuito';

    // Buscar detalhes da subscription para identificar o plano
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0]?.price.id;
    
    // Detectar qual plano baseado no priceId
    let newPlan = 'Pro'; // Default
    
    // Buscar planos do Firestore para identificar qual foi assinado (Admin SDK)
    const plansSnap = await adminDb.collection('plans').get();
    
    for (const planDoc of plansSnap.docs) {
      const planData = planDoc.data();
      if (planData.priceIdMonthly === priceId || planData.priceIdYearly === priceId) {
        newPlan = planData.name;
        break;
      }
    }

    // Atualizar usuário com informações do Stripe (Admin SDK)
    await userRef.update({
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      plan: newPlan,
      status: 'Ativo',
      convertedAt: new Date().toISOString()
    });

    console.log(`✅ Usuário ${userId} atualizado para plano ${newPlan}`);
    
    // Notificar no Slack
    if (previousPlan === 'Gratuito') {
      // Novo pagamento
      await notifyNewPayment(
        userData?.name || 'Usuário',
        newPlan,
        (subscription.items.data[0]?.price.unit_amount || 0) / 100
      );
    } else {
      // Upgrade
      await notifyUpgrade(
        userData?.name || 'Usuário',
        previousPlan,
        newPlan
      );
    }
  } catch (error) {
    console.error('❌ Erro ao processar checkout:', error);
  }
}

// Handler para mudança de assinatura
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    
    // Buscar usuário pelo customerId (Admin SDK)
    const usersSnap = await adminDb.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .get();

    if (usersSnap.empty) {
      console.error(`❌ Usuário não encontrado para customer: ${customerId}`);
      return;
    }

    const userDoc = usersSnap.docs[0];
    const userId = userDoc.id;

    // Determinar status baseado na assinatura
    const status = subscription.status === 'active' ? 'Ativo' : 'Inativo';
    
    // Detectar plano baseado no price_id
    const priceId = subscription.items.data[0]?.price.id;
    let newPlan = 'Pro'; // Default
    
    if (priceId) {
      const plansSnap = await adminDb.collection('plans').get();
      
      for (const planDoc of plansSnap.docs) {
        const planData = planDoc.data();
        if (planData.priceIdMonthly === priceId || planData.priceIdYearly === priceId) {
          newPlan = planData.name;
          break;
        }
      }
    }

    // Verificar se há cancelamento pendente
    const updateData: any = {
      stripeSubscriptionId: subscription.id,
      plan: newPlan,
      status
    };

    // Se subscription tem cancel_at_period_end, marcar como cancelando
    if (subscription.cancel_at_period_end) {
      const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
      updateData.subscriptionCancelAt = expiresAt;
      updateData.subscriptionStatus = 'canceling';
      console.log(`⏱️ Assinatura será cancelada em: ${expiresAt}`);
    }

    await adminDb.collection('users').doc(userId).update(updateData);

    console.log(`✅ Assinatura atualizada para usuário ${userId}: ${newPlan} (${status})`);
  } catch (error) {
    console.error('❌ Erro ao processar mudança de assinatura:', error);
  }
}

// Handler para assinatura cancelada
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    
    const usersSnap = await adminDb.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .get();

    if (usersSnap.empty) return;

    const userDoc = usersSnap.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    const previousPlan = userData.plan || 'Pro';
    
    // Atualizar usuário para Gratuito
    await adminDb.collection('users').doc(userId).update({
      plan: 'Gratuito',
      status: 'Ativo',
      stripeSubscriptionId: null,
      subscriptionCancelAt: null,
      subscriptionStatus: null,
    });

    console.log(`✅ Usuário ${userId} voltou para plano Gratuito`);
    
    // Arquivar transações excedentes (manter apenas 50)
    await archiveExcessTransactions(userId);
    
    // Notificar cancelamento no Slack
    await notifyCancellation(
      userData.name || 'Usuário',
      previousPlan
    );
  } catch (error) {
    console.error('❌ Erro ao processar cancelamento:', error);
  }
}

/**
 * Arquiva transações excedentes quando usuário volta para plano Gratuito
 * Mantém apenas as 50 transações mais recentes ativas
 */
async function archiveExcessTransactions(userId: string) {
  try {
    console.log(`📦 Arquivando transações excedentes para userId: ${userId}`);
    
    // 1. Buscar todas as transações do usuário (não arquivadas)
    const transactionsSnap = await adminDb.collection('transactions')
      .where('userId', '==', userId)
      .where('archived', '!=', true)
      .orderBy('archived')
      .orderBy('date', 'desc')
      .get();

    const transactions = transactionsSnap.docs;
    const totalTransactions = transactions.length;

    console.log(`📊 Total de transações ativas: ${totalTransactions}`);

    if (totalTransactions <= 50) {
      console.log(`✅ Usuário tem ${totalTransactions} transações. Nenhuma precisa ser arquivada.`);
      return;
    }

    // 2. Manter apenas as 50 mais recentes, arquivar o resto
    const transactionsToArchive = transactions.slice(50); // Pega do índice 50 em diante
    const now = new Date().toISOString();

    console.log(`📦 Arquivando ${transactionsToArchive.length} transações...`);

    // 3. Arquivar em lote usando batch
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    
    for (let i = 0; i < transactionsToArchive.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = transactionsToArchive.slice(i, i + batchSize);
      
      chunk.forEach(transactionDoc => {
        batch.update(transactionDoc.ref, {
          archived: true,
          archivedAt: now,
        });
      });
      
      batches.push(batch.commit());
    }

    await Promise.all(batches);

    console.log(`✅ ${transactionsToArchive.length} transações arquivadas com sucesso`);
  } catch (error) {
    console.error('❌ Erro ao arquivar transações:', error);
    // Não falhar o processo de cancelamento por causa do arquivamento
  }
}

// Handler para fatura paga
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    
    // Buscar usuário (Admin SDK)
    const usersSnap = await adminDb.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .get();

    if (usersSnap.empty) return;

    const userDoc = usersSnap.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Salvar pagamento na coleção de pagamentos (Admin SDK)
    const paymentId = `payment_${invoice.id}`;
    const amount = (invoice.amount_paid || 0) / 100;
    
    await adminDb.collection('payments').doc(paymentId).set({
      id: paymentId,
      userId,
      userName: userData.name || 'Usuário',
      userEmail: userData.email || '',
      stripeInvoiceId: invoice.id,
      stripeCustomerId: customerId,
      planName: userData.plan || 'Pro Mensal',
      amount,
      currency: invoice.currency || 'brl',
      status: 'Pago',
      date: new Date((invoice.created || 0) * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    console.log(`✅ Pagamento registrado: ${paymentId} - R$ ${amount}`);
  } catch (error) {
    console.error('❌ Erro ao registrar pagamento:', error);
  }
}

// Handler para falha de pagamento
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    
    const usersSnap = await adminDb.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .get();

    if (usersSnap.empty) return;

    const userDoc = usersSnap.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Registrar pagamento falhado (Admin SDK)
    const paymentId = `payment_${invoice.id}`;
    const amount = (invoice.amount_due || 0) / 100;
    
    await adminDb.collection('payments').doc(paymentId).set({
      id: paymentId,
      userId,
      userName: userData.name || 'Usuário',
      userEmail: userData.email || '',
      stripeInvoiceId: invoice.id,
      stripeCustomerId: customerId,
      planName: userData.plan || 'Pro Mensal',
      amount,
      currency: invoice.currency || 'brl',
      status: 'Falhou',
      date: new Date((invoice.created || 0) * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    console.log(`⚠️ Pagamento falhou: ${paymentId}`);
    
    // Notificar falha no Slack
    await notifyFailedPayment(
      userData.name || 'Usuário',
      amount
    );
  } catch (error) {
    console.error('❌ Erro ao registrar falha de pagamento:', error);
  }
}

