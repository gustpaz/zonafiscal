"use client";

import { addTransactionClient, updateTransactionClient, deleteTransactionClient } from "./client-data";
import { addAuditLogClient } from "./client-audit";
import { addMonths } from "date-fns";
import type { Transaction } from "./types";

type UnvalidatedTransaction = Omit<Transaction, 'id'>;

interface AuditInfo {
  userId: string;
  userName: string;
}

export async function addTransactionClientAction(
  data: UnvalidatedTransaction,
  auditInfo: AuditInfo
): Promise<{ success: boolean; error?: string; transactions?: Transaction[] }> {
  try {
    const isInstallment = data.paymentType === 'parcelado' && (data.installments || 0) > 1;
    const createdTransactions: Transaction[] = [];

    if (isInstallment) {
      const installmentAmount = data.amount / data.installments!;
      const originalDescription = data.description;
      const installmentId = `inst-${Date.now()}`;
      
      for (let i = 0; i < data.installments!; i++) {
        const installmentDate = addMonths(new Date(data.date), i);
        
        const transactionData: UnvalidatedTransaction = {
          ...data,
          userId: auditInfo.userId,
          amount: installmentAmount,
          date: installmentDate.toISOString(),
          description: `${originalDescription} (${i + 1}/${data.installments})`,
          paymentType: 'parcelado',
          installments: data.installments,
          currentInstallment: i + 1,
          installmentId: installmentId,
        };
        
        const newTransaction = await addTransactionClient(transactionData);
        createdTransactions.push(newTransaction);
      }
    } else {
      // Handle single transactions
      const transactionData: UnvalidatedTransaction = {
        ...data,
        userId: auditInfo.userId,
        installments: 1,
        currentInstallment: 1,
      };
      
      const newTransaction = await addTransactionClient(transactionData);
      createdTransactions.push(newTransaction);
    }
    
    // Criar log de auditoria
    await addAuditLogClient({
      ...auditInfo,
      action: 'create',
      entity: 'transaction',
      entityId: createdTransactions[0]?.id || 'batch',
      date: new Date().toISOString(),
      details: `Criada transação "${data.description}" no valor de R$ ${data.amount.toFixed(2)}.`,
    });

    return { success: true, transactions: createdTransactions };
    
  } catch (error: any) {
    console.error("Erro ao criar transação:", error.message);
    return { success: false, error: error.message };
  }
}

export async function updateTransactionClientAction(
  id: string,
  data: Partial<UnvalidatedTransaction & { userId: string }>,
  applyToFuture: boolean = false,
  auditInfo: AuditInfo
): Promise<{ success: boolean; error?: string; updatedTransaction?: Transaction }> {
  try {
    const updatedTransaction = await updateTransactionClient(auditInfo.userId, id, data, applyToFuture);
    
    // Criar log de auditoria
    let details = `Atualizada transação "${data.description || updatedTransaction.description}".`;
    if (applyToFuture) {
      details += ' Alterações aplicadas às parcelas futuras.';
    }
    
    await addAuditLogClient({
      ...auditInfo,
      action: 'update',
      entity: 'transaction',
      entityId: id,
      date: new Date().toISOString(),
      details: details,
    });
    
    return { success: true, updatedTransaction };
  } catch (error: any) {
    console.error("Erro ao atualizar transação:", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteTransactionClientAction(
  id: string,
  description: string,
  auditInfo: AuditInfo
): Promise<{ success: boolean; error?: string; deletedId?: string }> {
  try {
    await deleteTransactionClient(auditInfo.userId, id);
    
    // Criar log de auditoria
    await addAuditLogClient({
      ...auditInfo,
      action: 'delete',
      entity: 'transaction',
      entityId: id,
      date: new Date().toISOString(),
      details: `Excluída transação "${description}".`,
    });
    
    return { success: true, deletedId: id };
  } catch (error: any) {
    console.error("Erro ao deletar transação:", error.message);
    return { success: false, error: error.message };
  }
}
