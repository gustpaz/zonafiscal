/**
 * Filtros para Auditoria
 * Período de carência para transações importadas
 */

import type { Transaction } from './types';

// Período de carência em horas (24h padrão)
export const IMPORT_GRACE_PERIOD_HOURS = 24;

/**
 * Verifica se uma transação importada ainda está no período de carência
 */
export function isInGracePeriod(transaction: Transaction): boolean {
  if (!transaction.isImported || !transaction.importedAt) {
    return false; // Não é importada, não tem período de carência
  }

  const importedDate = new Date(transaction.importedAt);
  const now = new Date();
  const hoursSinceImport = (now.getTime() - importedDate.getTime()) / (1000 * 60 * 60);

  return hoursSinceImport < IMPORT_GRACE_PERIOD_HOURS;
}

/**
 * Filtra transações importadas que ainda estão no período de carência
 * (não devem aparecer na auditoria ainda)
 */
export function filterTransactionsForAudit(transactions: Transaction[]): Transaction[] {
  return transactions.filter(t => !isInGracePeriod(t));
}

/**
 * Separa transações em "auditáveis" e "em carência"
 */
export function separateTransactionsByAudit(transactions: Transaction[]): {
  auditable: Transaction[];
  inGracePeriod: Transaction[];
} {
  const auditable: Transaction[] = [];
  const inGracePeriod: Transaction[] = [];

  transactions.forEach(t => {
    if (isInGracePeriod(t)) {
      inGracePeriod.push(t);
    } else {
      auditable.push(t);
    }
  });

  return { auditable, inGracePeriod };
}

/**
 * Calcula tempo restante do período de carência
 */
export function getRemainingGracePeriod(transaction: Transaction): {
  hours: number;
  minutes: number;
  expired: boolean;
} {
  if (!transaction.isImported || !transaction.importedAt) {
    return { hours: 0, minutes: 0, expired: true };
  }

  const importedDate = new Date(transaction.importedAt);
  const now = new Date();
  const hoursSinceImport = (now.getTime() - importedDate.getTime()) / (1000 * 60 * 60);

  if (hoursSinceImport >= IMPORT_GRACE_PERIOD_HOURS) {
    return { hours: 0, minutes: 0, expired: true };
  }

  const remainingHours = IMPORT_GRACE_PERIOD_HOURS - hoursSinceImport;
  const hours = Math.floor(remainingHours);
  const minutes = Math.floor((remainingHours - hours) * 60);

  return { hours, minutes, expired: false };
}

