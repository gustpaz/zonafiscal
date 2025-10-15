
'use server';

import { stripe } from '.';
import type { Stripe } from 'stripe';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const adminDb = getFirestore(adminApp);

const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:9002/';
  // Make sure to include `https` in production URLs.
  url = url.includes('http') ? url : `https://${url}`;
  // Make sure to include a trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
  return url;
};

export async function createCheckoutSession(userId: string, priceId: string) {
    try {
        // Usar Admin SDK para buscar usuário (bypassa regras Firestore)
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error("User not found");
        
        const user = userDoc.data() as any;

        const lineItems = [
            { 
                price: priceId, 
                quantity: 1,
            }
        ];
        
        // Find price details to pass value to success page
        const priceDetails = await stripe.prices.retrieve(priceId);
        const successUrl = new URL(`${getURL()}pricing/success`);
        successUrl.searchParams.append('session_id', '{CHECKOUT_SESSION_ID}');
        successUrl.searchParams.append('value', (priceDetails.unit_amount! / 100).toString());
        successUrl.searchParams.append('currency', priceDetails.currency);


        console.log(`🔍 Criando checkout para userId: ${userId}, email: ${user.email}`);
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            customer: user.stripeCustomerId, // Use existing customer ID if available
            line_items: lineItems,
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: successUrl.toString(),
            cancel_url: `${getURL()}pricing/cancel`,
            metadata: {
                userId: userId,
                companyId: user.companyId || '',
            },
            subscription_data: {
                metadata: {
                    userId: userId,
                    companyId: user.companyId || '',
                }
            },
            // Se não houver customerId, o Stripe cria um novo
            customer_update: user.stripeCustomerId ? { name: 'metadata' } : undefined,
            customer_email: user.stripeCustomerId ? undefined : user.email,
        });
        
        console.log(`✅ Checkout session criada: ${session.id}, metadata: ${JSON.stringify(session.metadata)}`);

        return { url: session.url };
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw new Error('Failed to create checkout session');
    }
}

export async function createCustomerPortalSession(userId: string) {
    try {
        // Usar Admin SDK para buscar usuário (bypassa regras Firestore)
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error("User not found");
        
        const user = userDoc.data() as any;
        if (!user.stripeCustomerId) throw new Error("Stripe Customer ID not found.");

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${getURL()}settings`,
        });

        return { url: portalSession.url };
    } catch (error) {
        console.error('Error creating customer portal session:', error);
        throw new Error('Failed to create customer portal session');
    }
}

async function getSubscriptionItem(subscriptionId: string): Promise<Stripe.SubscriptionItem | undefined> {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items'],
        });
        // Assumimos que há apenas um item de assinatura (o plano Pro)
        return subscription.items.data[0];
    } catch (error) {
        console.error("Error retrieving subscription item:", error);
        return undefined;
    }
}

export async function addUserToSubscription(subscriptionId: string) {
    try {
        const subscriptionItem = await getSubscriptionItem(subscriptionId);
        if (!subscriptionItem) {
            throw new Error("Subscription item not found.");
        }

        await stripe.subscriptionItems.update(subscriptionItem.id, {
            quantity: subscriptionItem.quantity + 1,
            proration_behavior: 'create_prorations' // Cobra o valor proporcional imediatamente
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error adding user to subscription:", error);
        return { success: false, error: error.message };
    }
}


export async function removeUserFromSubscription(subscriptionId: string) {
    try {
        const subscriptionItem = await getSubscriptionItem(subscriptionId);
        if (!subscriptionItem) {
            throw new Error("Subscription item not found.");
        }

        if (subscriptionItem.quantity <= 1) {
            // Instead of throwing an error, we just don't do anything.
            // This prevents issues if the owner tries to remove the last user (themselves) via team management.
            // Subscription cancellation should be handled in the customer portal.
            console.log("Cannot remove the last user from the subscription via team management.");
            return { success: true };
        }

        await stripe.subscriptionItems.update(subscriptionItem.id, {
            quantity: subscriptionItem.quantity - 1,
            proration_behavior: 'create_prorations'
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error removing user from subscription:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Atualiza o plano de uma subscription existente (para downgrade/upgrade)
 */
export async function updateSubscriptionPlan(userId: string, newPriceId: string) {
    try {
        console.log(`🔄 Iniciando atualização de plano para userId: ${userId}, newPriceId: ${newPriceId}`);
        
        // 1. Buscar usuário (Admin SDK)
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error("User not found");
        }
        
        const userData = userDoc.data() as any;
        const subscriptionId = userData.stripeSubscriptionId;
        
        if (!subscriptionId) {
            throw new Error("No active subscription found");
        }

        // 2. Buscar plano pelo priceId no Firestore para obter o nome
        const plansSnap = await adminDb.collection('plans').get();
        let newPlanName = 'Light'; // Default
        
        for (const planDoc of plansSnap.docs) {
            const planData = planDoc.data();
            if (planData.priceIdMonthly === newPriceId || planData.priceIdYearly === newPriceId) {
                newPlanName = planData.name;
                break;
            }
        }

        console.log(`📋 Plano identificado: ${newPlanName}`);

        // 3. Atualizar subscription no Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentItemId = subscription.items.data[0].id;

        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            items: [{
                id: currentItemId,
                price: newPriceId,
            }],
            proration_behavior: 'create_prorations', // Ajuste proporcional de valores
        });

        console.log(`✅ Subscription atualizada no Stripe: ${updatedSubscription.id}`);

        // 4. Atualizar plano do usuário no Firestore
        await adminDb.collection('users').doc(userId).update({
            plan: newPlanName,
        });

        console.log(`✅ Usuário ${userId} atualizado para plano ${newPlanName}`);

        return { 
            success: true, 
            newPlan: newPlanName,
            message: `Plano atualizado com sucesso para ${newPlanName}!`
        };
    } catch (error: any) {
        console.error("Error updating subscription plan:", error);
        return { 
            success: false, 
            error: error.message || "Erro ao atualizar plano"
        };
    }
}

/**
 * Busca informações da subscription do usuário
 */
export async function getSubscriptionInfo(userId: string) {
    try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return null;
        }
        
        const userData = userDoc.data() as any;
        const subscriptionId = userData.stripeSubscriptionId;
        
        if (!subscriptionId) {
            return null;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        return {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
    } catch (error: any) {
        console.error("Error getting subscription info:", error);
        return null;
    }
}

/**
 * Cancela uma subscription no fim do período pago
 */
export async function cancelSubscription(userId: string) {
    try {
        console.log(`❌ Iniciando cancelamento de subscription para userId: ${userId}`);
        
        // 1. Buscar usuário (Admin SDK)
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error("User not found");
        }
        
        const userData = userDoc.data() as any;
        const subscriptionId = userData.stripeSubscriptionId;
        
        if (!subscriptionId) {
            throw new Error("No active subscription found");
        }

        // 2. Cancelar subscription no fim do período
        const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        const expiresAt = new Date(canceledSubscription.current_period_end * 1000);
        
        console.log(`✅ Subscription cancelada. Expira em: ${expiresAt.toISOString()}`);

        // 3. Atualizar Firestore com flag de cancelamento pendente
        await adminDb.collection('users').doc(userId).update({
            subscriptionCancelAt: expiresAt.toISOString(),
            subscriptionStatus: 'canceling', // Status intermediário
            previousPlan: userData.plan, // Salvar plano atual para manter acesso
        });

        console.log(`✅ Usuário ${userId} marcado como cancelamento pendente`);

        return { 
            success: true, 
            expiresAt: expiresAt.toISOString(),
            message: `Assinatura cancelada. Você terá acesso até ${expiresAt.toLocaleDateString('pt-BR')}`
        };
    } catch (error: any) {
        console.error("Error canceling subscription:", error);
        return { 
            success: false, 
            error: error.message || "Erro ao cancelar assinatura"
        };
    }
}
