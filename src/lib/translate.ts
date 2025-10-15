/**
 * Funções de tradução e formatação para o português
 */

import type { PaymentMethod, TransactionCategory, TransactionType } from './types';

/**
 * Traduz método de pagamento para português
 */
export function translatePaymentMethod(method: PaymentMethod): string {
  const translations: Record<PaymentMethod, string> = {
    'pix': 'PIX',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'cash': 'Dinheiro',
    'transfer': 'Transferência',
    'boleto': 'Boleto',
  };

  return translations[method] || method;
}

/**
 * Traduz categoria de transação para português
 */
export function translateCategory(category: TransactionCategory): string {
  const translations: Record<TransactionCategory, string> = {
    'personal': 'Pessoal',
    'business': 'Empresarial',
    'mixed': 'Misto',
    'loan_to_business': 'Empréstimo para Empresa',
    'loan_to_personal': 'Empréstimo para Pessoal',
  };

  return translations[category] || category;
}

/**
 * Traduz tipo de transação para português
 */
export function translateTransactionType(type: TransactionType): string {
  const translations: Record<TransactionType, string> = {
    'income': 'Receita',
    'expense': 'Despesa',
  };

  return translations[type] || type;
}

/**
 * Traduz status de usuário
 */
export function translateUserStatus(status: 'Ativo' | 'Inativo' | 'Suspenso'): string {
  // Já está em português, mas mantém para consistência
  return status;
}

/**
 * Traduz plano
 */
export function translatePlan(plan: string): string {
  const translations: Record<string, string> = {
    'Gratuito': 'Gratuito',
    'Pro': 'Pro',
    'Business': 'Business',
    'Free': 'Gratuito',
  };

  return translations[plan] || plan;
}

/**
 * Traduz prioridade de ticket
 */
export function translatePriority(priority: 'Normal' | 'Alta'): string {
  // Já está em português
  return priority;
}

/**
 * Traduz status de ticket
 */
export function translateTicketStatus(status: 'Aberto' | 'Em Andamento' | 'Resolvido'): string {
  // Já está em português
  return status;
}

/**
 * Formata valor monetário em Real brasileiro
 */
export function formatCurrency(value: number): string {
  const cleanValue = Math.round((value || 0) * 100) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cleanValue);
}

/**
 * Formata data para pt-BR
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora para pt-BR
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('pt-BR');
}

