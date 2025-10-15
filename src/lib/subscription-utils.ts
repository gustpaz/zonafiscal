/**
 * Utilitários para verificar status de assinatura e acesso a recursos
 */

import type { User } from "./types";

/**
 * Verifica se o usuário tem acesso aos recursos premium
 * Considera tanto o plano atual quanto cancelamento pendente
 */
export function hasActivePremiumAccess(userData: User | null | undefined): boolean {
  if (!userData) return false;

  // Se tem assinatura ativa, tem acesso
  if (userData.stripeSubscriptionId && userData.plan !== 'Gratuito') {
    return true;
  }

  // Se tem cancelamento pendente e ainda não expirou, tem acesso
  if (userData.subscriptionStatus === 'canceling' && userData.subscriptionCancelAt) {
    const expiresAt = new Date(userData.subscriptionCancelAt);
    const now = new Date();
    return now < expiresAt; // Ainda tem acesso se não expirou
  }

  return false;
}

/**
 * Retorna o plano efetivo do usuário (considerando cancelamento pendente)
 */
export function getEffectivePlan(userData: User | null | undefined): string {
  if (!userData) return 'Gratuito';

  // Se tem cancelamento pendente mas ainda não expirou, mantém plano atual
  if (userData.subscriptionStatus === 'canceling' && userData.subscriptionCancelAt) {
    const expiresAt = new Date(userData.subscriptionCancelAt);
    const now = new Date();
    
    if (now < expiresAt) {
      // Ainda tem acesso, retorna o plano que tinha antes
      // Se previousPlan não foi salvo, assumir que era Pro (mais comum)
      return userData.previousPlan || 'Pro';
    }
  }

  return userData.plan || 'Gratuito';
}

/**
 * Verifica se a assinatura está cancelando
 */
export function isSubscriptionCanceling(userData: User | null | undefined): boolean {
  if (!userData) return false;
  
  return userData.subscriptionStatus === 'canceling' && !!userData.subscriptionCancelAt;
}

/**
 * Retorna a data de expiração se houver cancelamento pendente
 */
export function getSubscriptionExpiryDate(userData: User | null | undefined): Date | null {
  if (!userData || !userData.subscriptionCancelAt) return null;
  
  return new Date(userData.subscriptionCancelAt);
}

