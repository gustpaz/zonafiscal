
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import type { Stripe } from 'stripe';
import { updateUser as updateUserInDb, findUserByStripeCustomerId, getUserById } from '@/lib/admin-data';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.created',
]);

export async function POST(req: Request) {
  // Validação básica para webhook
  const contentType = req.headers.get('content-type');
  if (contentType !== 'application/json') {
    logSecurityEvent('Invalid webhook content-type', { contentType }, req);
    return createErrorResponse('Content-Type deve ser application/json', 400);
  }

  const body = await req.text();
  const sig = headers().get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      logSecurityEvent('Webhook signature missing', { hasSig: !!sig, hasSecret: !!webhookSecret }, req);
      console.error('Webhook secret or signature not provided.');
      return createErrorResponse('Webhook secret not configured', 400);
    }
    
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    
    // Log do evento recebido (sem dados sensíveis)
    logSecurityEvent('Stripe webhook received', { 
      type: event.type, 
      id: event.id,
      created: event.created 
    }, req);
    
  } catch (err: any) {
    logSecurityEvent('Webhook signature verification failed', { error: err.message }, req);
    console.error(`❌ Error message: ${err.message}`);
    return createErrorResponse(`Webhook Error: ${err.message}`, 400);
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          const userId = checkoutSession.subscription_data?.metadata?.userId;

          if (checkoutSession.mode === 'subscription' && checkoutSession.customer && userId) {
            const userToUpdate = await getUserById(userId);
            if (userToUpdate) {
                userToUpdate.stripeCustomerId = checkoutSession.customer.toString();
                userToUpdate.convertedAt = new Date().toISOString(); // Set conversion date
                await updateUserInDb(userToUpdate);
                console.log(`Checkout completo para o usuário ${userId}. Cliente Stripe: ${checkoutSession.customer.toString()}.`);
            }
          }
          break;

        case 'customer.subscription.created':
          const createdSubscription = event.data.object as Stripe.Subscription;
          const userOnCreate = await findUserByStripeCustomerId(createdSubscription.customer as string);
          if (userOnCreate) {
            // Salva o ID da assinatura e atualiza o status do plano
            userOnCreate.stripeSubscriptionId = createdSubscription.id;
            userOnCreate.plan = 'Pro';
            userOnCreate.status = 'Ativo';
            await updateUserInDb(userOnCreate);
            console.log(`Assinatura ${createdSubscription.id} criada e salva para o usuário ${userOnCreate.id}.`);
          }
          break;

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object as Stripe.Subscription;
          // Lógica para atualizar o status do plano do usuário (ex: cancelado no fim do período)
           const userToUpdateOnUpdate = await findUserByStripeCustomerId(updatedSubscription.customer as string);
           if (userToUpdateOnUpdate) {
               if (updatedSubscription.cancel_at_period_end) {
                   userToUpdateOnUpdate.status = 'Inativo';
               } else {
                   userToUpdateOnUpdate.status = 'Ativo';
                   userToUpdateOnUpdate.plan = 'Pro';
               }
               await updateUserInDb(userToUpdateOnUpdate);
           }
          console.log(`Assinatura ${updatedSubscription.id} foi atualizada. Status: ${updatedSubscription.status}`);
          break;

        case 'customer.subscription.deleted':
           const deletedSubscription = event.data.object as Stripe.Subscription;
           // Lógica para rebaixar o usuário para o plano Gratuito
           const userToDowngrade = await findUserByStripeCustomerId(deletedSubscription.customer as string);
           if (userToDowngrade) {
               userToDowngrade.plan = 'Gratuito';
               userToDowngrade.status = 'Ativo';
               userToDowngrade.stripeSubscriptionId = undefined; // Remove o ID da assinatura
               await updateUserInDb(userToDowngrade);
               console.log(`Usuário ${userToDowngrade.id} foi rebaixado para o plano Gratuito.`);
           }
          break;
        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      logSecurityEvent('Webhook handler failed', { error: error.message, eventType: event.type }, req);
      console.error(error);
      return createErrorResponse('Webhook handler failed. View your function logs.', 400);
    }
  }

  return createSuccessResponse({ received: true, processed: relevantEvents.has(event.type) });
}
