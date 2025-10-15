"use client";

import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import type { AuditLog } from "./types";
import { createHash } from 'crypto';

function createAuditHash(logData: Omit<AuditLog, 'hash' | 'id'>): string {
  const logString = `${logData.date}${logData.userId}${logData.userName}${logData.action}${logData.entity}${logData.entityId}${logData.details}${logData.previousHash}`;
  return createHash('sha256').update(logString).digest('hex');
}

export async function addAuditLogClient(log: Omit<AuditLog, 'id' | 'hash' | 'previousHash'>): Promise<void> {
  const userId = log.userId;
  if (!userId) throw new Error("User ID is required to add an audit log.");
  
  try {
    const auditCol = collection(db, `users/${userId}/auditLogs`);
    const lastLogQuery = query(auditCol, orderBy('date', 'desc'), limit(1));
    
    const lastLogSnapshot = await getDocs(lastLogQuery);
    const previousHash = lastLogSnapshot.empty ? null : lastLogSnapshot.docs[0].data().hash;

    const logDataWithPrevHash = { ...log, previousHash };
    const hash = createAuditHash(logDataWithPrevHash);

    const newLogData = {
      ...logDataWithPrevHash,
      hash,
      date: Timestamp.fromDate(new Date(log.date))
    };

    await addDoc(auditCol, newLogData);
  } catch (error) {
    console.error("Erro ao criar log de auditoria:", error);
    // Não falha se o log não for criado, apenas loga o erro
  }
}

export async function getAuditLogsClient(userId: string): Promise<AuditLog[]> {
  if (!userId) return [];
  
  const auditCol = collection(db, `users/${userId}/auditLogs`);
  const q = query(auditCol, orderBy('date', 'desc'));
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: (data.date as Timestamp).toDate().toISOString(),
    } as AuditLog;
  });
}

export async function exportAuditReportClient(userId: string): Promise<{ success: boolean; csvData?: string; error?: string }> {
  try {
    const auditLogs = await getAuditLogsClient(userId);
    const sortedLogs = [...auditLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let previousHash: string | null = null;
    const verifiedLogs = sortedLogs.map(log => {
      const isHashValid = createAuditHash({ ...log, previousHash }) === log.hash;
      const isChainValid = log.previousHash === previousHash;
      const isValid = isHashValid && isChainValid;
      previousHash = log.hash;
      return { ...log, isValid };
    });

    const headers = [
      "Status de Integridade",
      "Data e Hora",
      "Usuário",
      "Ação",
      "Detalhes",
      "Hash do Bloco",
      "Hash Anterior"
    ];
    
    const actionLabels: Record<AuditLog["action"], string> = {
      create: "Criação",
      update: "Atualização",
      delete: "Exclusão",
    };

    const rows = verifiedLogs.reverse().map(log => [
      log.isValid ? "✓ Válido" : "✗ Inválido",
      new Date(log.date).toLocaleString('pt-BR'),
      log.userName,
      actionLabels[log.action],
      log.details,
      log.hash.substring(0, 16) + '...',
      log.previousHash ? log.previousHash.substring(0, 16) + '...' : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return { success: true, csvData: csvContent };
  } catch (error) {
    console.error("Error exporting audit report:", error);
    return { success: false, error: 'Ocorreu um erro ao exportar o relatório.' };
  }
}
