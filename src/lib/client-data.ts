"use client";

import { db } from "./firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, writeBatch, Timestamp } from "firebase/firestore";
import type { Transaction } from "./types";

export async function getTransactionsClient(userId: string): Promise<Transaction[]> {
  if (!userId) {
    return [];
  }
  
  const transactionsCol = collection(db, `users/${userId}/transactions`);
  
  try {
    const snapshot = await getDocs(transactionsCol);
    
    const transactions = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Converter data
      let dateString: string;
      if (data.date && typeof data.date === 'object' && 'seconds' in data.date) {
        const timestamp = new Timestamp(data.date.seconds, data.date.nanoseconds);
        dateString = timestamp.toDate().toISOString();
      } else if (typeof data.date === 'string') {
        dateString = data.date;
      } else {
        dateString = new Date().toISOString();
      }
      
      return {
        ...data,
        id: doc.id,
        date: dateString
      } as Transaction;
    });
    
    // Ordenar por data decrescente (mais recentes primeiro)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return transactions;
    
  } catch (error: any) {
    console.error("Erro ao buscar transações:", error.message);
    return [];
  }
}

export async function addTransactionClient(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
  const { userId, ...transactionData } = transaction;
  if (!userId) {
    throw new Error("User ID is missing");
  }
  
  const collectionRef = collection(db, `users/${userId}/transactions`);
  const transactionDate = new Date(transaction.date);
  const dateString = transactionDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const dataToSave = {
    ...transactionData,
    userId,
    date: Timestamp.fromDate(transactionDate),
    dateString: dateString, // Campo adicional para queries otimizadas
  };
  
  try {
    const docRef = await addDoc(collectionRef, dataToSave);
    return { ...transaction, id: docRef.id };
  } catch (error: any) {
    console.error("Erro ao criar transação:", error.message);
    throw error;
  }
}

export async function updateTransactionClient(
  userId: string,
  id: string,
  data: Partial<Omit<Transaction, 'id' | 'userId'>>,
  applyToFuture: boolean = false
): Promise<Transaction> {
  const docRef = doc(db, `users/${userId}/transactions`, id);
  
  try {
    const transactionSnap = await getDoc(docRef);
    if (!transactionSnap.exists()) {
      throw new Error("Transação não encontrada");
    }
    
    const originalTransaction = transactionSnap.data() as Transaction;
    
    const updatePayload: any = {};
    Object.keys(data).forEach(key => {
      if (data[key as keyof typeof data] !== undefined) {
        if (key === 'date' && typeof data.date === 'string') {
          updatePayload.date = Timestamp.fromDate(new Date(data.date));
        } else {
          updatePayload[key] = data[key as keyof typeof data];
        }
      }
    });
    
    // Atualizar a transação atual
    await updateDoc(docRef, updatePayload);
    
    // Se for parcela e applyToFuture, atualizar parcelas futuras
    if (applyToFuture && originalTransaction.installmentId) {
      const transactionsCol = collection(db, `users/${userId}/transactions`);
      const futureQuery = query(
        transactionsCol,
        where('installmentId', '==', originalTransaction.installmentId),
        where('currentInstallment', '>', originalTransaction.currentInstallment)
      );
      
      const futureSnapshot = await getDocs(futureQuery);
      const batch = writeBatch(db);
      
      futureSnapshot.docs.forEach(docSnap => {
        batch.update(doc(db, `users/${userId}/transactions`, docSnap.id), updatePayload);
      });
      
      await batch.commit();
    }
    
    // Buscar a transação atualizada para retornar com todos os dados corretos
    const updatedSnap = await getDoc(docRef);
    const updatedData = updatedSnap.data();
    
    // Converter data se necessário
    let dateString = originalTransaction.date;
    if (updatedData && updatedData.date) {
      if (typeof updatedData.date === 'object' && 'seconds' in updatedData.date) {
        const timestamp = new Timestamp(updatedData.date.seconds, updatedData.date.nanoseconds);
        dateString = timestamp.toDate().toISOString();
      }
    }
    
    const completeTransaction = {
      ...originalTransaction,
      ...data,
      ...updatedData,
      id,
      userId,
      date: dateString
    } as Transaction;
    
    return completeTransaction;
  } catch (error: any) {
    console.error("Erro ao atualizar transação:", error.message);
    throw error;
  }
}

export async function deleteTransactionClient(userId: string, id: string): Promise<void> {
  const docRef = doc(db, `users/${userId}/transactions`, id);
  
  try {
    await deleteDoc(docRef);
  } catch (error: any) {
    console.error("Erro ao deletar transação:", error.message);
    throw error;
  }
}
