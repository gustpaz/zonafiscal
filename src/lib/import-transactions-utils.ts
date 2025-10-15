/**
 * Utilitários para Importação de Transações
 * Sistema de detecção de duplicatas e validação
 */

import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction } from './types';

interface TransactionMatch {
  id: string;
  similarity: number;
  transaction: Transaction;
}

/**
 * Gera um hash único para uma transação
 * Usado para detectar duplicatas exatas
 */
export function generateTransactionHash(
  date: string,
  description: string,
  amount: number
): string {
  const normalizedDesc = description.trim().toLowerCase();
  const dateOnly = new Date(date).toISOString().split('T')[0];
  const normalizedAmount = amount.toFixed(2);
  
  return `${dateOnly}-${normalizedDesc}-${normalizedAmount}`;
}

/**
 * Verifica se uma transação já existe no banco
 * Busca por data, descrição e valor similares
 */
export async function checkDuplicateTransaction(
  userId: string,
  date: string,
  description: string,
  amount: number
): Promise<{ isDuplicate: boolean; matches: TransactionMatch[] }> {
  try {
    // Buscar transações no mesmo dia
    const dateOnly = new Date(date).toISOString().split('T')[0];
    const startDate = new Date(dateOnly);
    const endDate = new Date(dateOnly);
    endDate.setHours(23, 59, 59, 999);

    // Caminho correto: users/{userId}/transactions
    const transactionsRef = collection(db, `users/${userId}/transactions`);
    
    // Tentar query otimizada primeiro (para transações novas com dateString)
    const qOptimized = query(
      transactionsRef,
      where('dateString', '==', dateOnly)
    );
    
    let snapshot = await getDocs(qOptimized);
    
    // Se não encontrou nada com dateString, busca todas (transações antigas)
    if (snapshot.empty) {
      snapshot = await getDocs(transactionsRef);
    }
    const matches: TransactionMatch[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Converter data do Firestore Timestamp para string ISO
      let transactionDate: string;
      if (data.date && typeof data.date === 'object' && 'seconds' in data.date) {
        const timestamp = new Timestamp(data.date.seconds, data.date.nanoseconds);
        transactionDate = timestamp.toDate().toISOString();
      } else if (typeof data.date === 'string') {
        transactionDate = data.date;
      } else {
        transactionDate = new Date().toISOString();
      }
      
      const t: Transaction = {
        ...data,
        id: doc.id,
        date: transactionDate,
      } as Transaction;
      
      // Filtrar apenas transações do mesmo dia
      const tDateOnly = transactionDate.split('T')[0];
      if (tDateOnly !== dateOnly) {
        return; // Pula se não for do mesmo dia
      }
      
      // Verificar se é duplicata exata (mesma data, descrição e valor)
      const isSameDescription = t.description.trim().toLowerCase() === description.trim().toLowerCase();
      const isSameAmount = Math.abs(t.amount - amount) < 0.01; // Tolerância de 1 centavo
      
      if (isSameDescription && isSameAmount) {
        matches.push({
          id: doc.id,
          similarity: 100,
          transaction: { ...t, id: doc.id },
        });
      } else {
        // Verificar similaridade parcial
        const similarity = calculateSimilarity(t, description, amount);
        if (similarity > 80) {
          matches.push({
            id: doc.id,
            similarity,
            transaction: { ...t, id: doc.id },
          });
        }
      }
    });

    return {
      isDuplicate: matches.length > 0,
      matches,
    };
  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error);
    return { isDuplicate: false, matches: [] };
  }
}

/**
 * Calcula similaridade entre transações
 */
function calculateSimilarity(
  existingTransaction: Transaction,
  newDescription: string,
  newAmount: number
): number {
  let similarity = 0;

  // Similaridade de descrição (Levenshtein simplificado)
  const desc1 = existingTransaction.description.trim().toLowerCase();
  const desc2 = newDescription.trim().toLowerCase();
  
  if (desc1 === desc2) {
    similarity += 60;
  } else if (desc1.includes(desc2) || desc2.includes(desc1)) {
    similarity += 40;
  } else {
    // Calcular palavras em comum
    const words1 = desc1.split(/\s+/);
    const words2 = desc2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w)).length;
    const totalWords = Math.max(words1.length, words2.length);
    similarity += (commonWords / totalWords) * 40;
  }

  // Similaridade de valor
  const amountDiff = Math.abs(existingTransaction.amount - newAmount);
  const amountPercent = (amountDiff / existingTransaction.amount) * 100;
  
  if (amountDiff < 0.01) {
    similarity += 40; // Valor exato
  } else if (amountPercent < 1) {
    similarity += 30; // Diferença < 1%
  } else if (amountPercent < 5) {
    similarity += 20; // Diferença < 5%
  }

  return Math.round(similarity);
}

/**
 * Verifica duplicatas em lote para múltiplas transações
 */
export async function checkBatchDuplicates(
  userId: string,
  transactions: Array<{ date: string; description: string; amount: number }>
): Promise<Map<number, TransactionMatch[]>> {
  const duplicatesMap = new Map<number, TransactionMatch[]>();

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const result = await checkDuplicateTransaction(userId, t.date, t.description, t.amount);
    
    if (result.isDuplicate) {
      duplicatesMap.set(i, result.matches);
    }
  }

  return duplicatesMap;
}

/**
 * Formata informações sobre o período de importação
 */
export function getImportPeriodInfo(transactions: Array<{ date: string }>): {
  startDate: Date;
  endDate: Date;
  monthYear: string;
  count: number;
} {
  if (transactions.length === 0) {
    return {
      startDate: new Date(),
      endDate: new Date(),
      monthYear: '',
      count: 0,
    };
  }

  const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const monthYear = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return {
    startDate,
    endDate,
    monthYear,
    count: transactions.length,
  };
}

