/**
 * Sistema de Histórico de Importações
 * Rastreia importações em lote para permitir desfazer
 */

import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';

export interface ImportBatch {
  id?: string;
  userId: string;
  fileName: string;
  importedAt: string;
  transactionCount: number;
  duplicatesIgnored: number;
  period: {
    startDate: string;
    endDate: string;
    monthYear: string;
  };
  status: 'completed' | 'undone';
  transactionIds: string[];
}

/**
 * Cria um registro de importação em lote
 */
export async function createImportBatch(
  userId: string,
  fileName: string,
  transactionCount: number,
  duplicatesIgnored: number,
  period: { startDate: string; endDate: string; monthYear: string },
  transactionIds: string[]
): Promise<string> {
  try {
    const batchData: Omit<ImportBatch, 'id'> = {
      userId,
      fileName,
      importedAt: new Date().toISOString(),
      transactionCount,
      duplicatesIgnored,
      period,
      status: 'completed',
      transactionIds,
    };

    const batchRef = await addDoc(collection(db, 'import_batches'), batchData);
    console.log('✅ Batch de importação criado:', batchRef.id);
    return batchRef.id;
  } catch (error) {
    console.error('Erro ao criar batch de importação:', error);
    throw error;
  }
}

/**
 * Busca todos os batches de importação de um usuário
 */
export async function getImportBatches(userId: string): Promise<ImportBatch[]> {
  try {
    const batchesRef = collection(db, 'import_batches');
    const q = query(
      batchesRef,
      where('userId', '==', userId),
      where('status', '==', 'completed'),
      orderBy('importedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ImportBatch));
  } catch (error) {
    console.error('Erro ao buscar batches de importação:', error);
    return [];
  }
}

/**
 * Desfaz uma importação em lote (exclui todas as transações)
 */
export async function undoImportBatch(userId: string, batchId: string): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    // Buscar o batch
    const batchRef = doc(db, 'import_batches', batchId);
    const batchSnapshot = await getDocs(query(collection(db, 'import_batches'), where('__name__', '==', batchId)));
    
    if (batchSnapshot.empty) {
      return { success: false, deletedCount: 0, error: 'Batch não encontrado' };
    }

    const batch = batchSnapshot.docs[0].data() as ImportBatch;

    // Verificar se o batch pertence ao usuário
    if (batch.userId !== userId) {
      return { success: false, deletedCount: 0, error: 'Não autorizado' };
    }

    // Excluir todas as transações do batch
    let deletedCount = 0;
    const transactionsRef = collection(db, `users/${userId}/transactions`);

    for (const transactionId of batch.transactionIds) {
      try {
        const transactionDoc = doc(transactionsRef, transactionId);
        await deleteDoc(transactionDoc);
        deletedCount++;
      } catch (error) {
        console.warn(`Não foi possível excluir transação ${transactionId}:`, error);
      }
    }

    // Marcar o batch como desfeito
    await updateDoc(batchRef, {
      status: 'undone',
      undoneAt: new Date().toISOString(),
    });

    console.log(`✅ Importação desfeita: ${deletedCount} transações excluídas`);
    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('Erro ao desfazer importação:', error);
    return { success: false, deletedCount: 0, error: error.message };
  }
}

/**
 * Conta quantas transações de um batch ainda existem
 */
export async function countBatchTransactions(userId: string, transactionIds: string[]): Promise<number> {
  try {
    const transactionsRef = collection(db, `users/${userId}/transactions`);
    let count = 0;

    for (const transactionId of transactionIds) {
      try {
        const transactionDoc = doc(transactionsRef, transactionId);
        const snapshot = await getDocs(query(collection(db, `users/${userId}/transactions`), where('__name__', '==', transactionId)));
        if (!snapshot.empty) {
          count++;
        }
      } catch (error) {
        // Transação não existe
      }
    }

    return count;
  } catch (error) {
    console.error('Erro ao contar transações do batch:', error);
    return 0;
  }
}

