"use client";

import { generateFinancialReport } from "@/ai/flows/generate-financial-report";
import type { GenerateFinancialReportOutput } from "@/ai/flows/generate-financial-report";
import { getUserByIdClient, getPlanByNameClient } from "./client-admin-data";
import { getTransactionsClient } from "./client-data";
import { isSameMonth } from "date-fns";
import { db } from "./firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { createReportPlaceholder, updateReportWithResult, updateReportWithError } from "./client-reports-storage";

export async function generateFinancialReportClient(input: {
  name: string;
  userId: string;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; data?: GenerateFinancialReportOutput; error?: string; reportId?: string }> {
  let reportId: string | null = null;
  
  try {
    const user = await getUserByIdClient(input.userId);
    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    const plan = await getPlanByNameClient(user.plan);
    if (!plan) {
      return { success: false, error: "Plano do usuário não encontrado." };
    }

    // Resetar a contagem se for um novo mês
    const now = new Date();
    const lastReset = user.reportGenerationTimestamp
      ? new Date(user.reportGenerationTimestamp)
      : now;
    if (!isSameMonth(now, lastReset)) {
      user.aiReportsGenerated = 0;
    }

    const usageCount = user.aiReportsGenerated || 0;
    const usageLimit = plan.features.aiReportLimit;

    if (usageLimit !== -1 && usageCount >= usageLimit) {
      return {
        success: false,
        error: `Limite de ${usageLimit} relatórios por mês atingido. Faça upgrade para gerar mais.`,
      };
    }

    // Criar placeholder do relatório
    reportId = await createReportPlaceholder(
      input.userId,
      input.name,
      input.startDate,
      input.endDate
    );

    const allTransactions = await getTransactionsClient(input.userId);
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    const filteredTransactions = allTransactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    const result = await generateFinancialReport({
      transactions: filteredTransactions,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    // Salvar resultado do relatório
    await updateReportWithResult(input.userId, reportId, result);

    // Atualizar contador de uso
    user.aiReportsGenerated = usageCount + 1;
    user.reportGenerationTimestamp = now.toISOString();

    const userDocRef = doc(db, "users", user.id);
    await updateDoc(userDocRef, {
      aiReportsGenerated: user.aiReportsGenerated,
      reportGenerationTimestamp: Timestamp.fromDate(now),
    });

    return { success: true, data: result, reportId };
  } catch (error: any) {
    console.error("Error in generateFinancialReportClient:", error);
    
    // Atualizar relatório com erro se foi criado
    if (reportId) {
      await updateReportWithError(
        input.userId,
        reportId,
        error.message || "Ocorreu um erro ao gerar o relatório."
      );
    }
    
    return { success: false, error: error.message || "Ocorreu um erro ao gerar o relatório." };
  }
}

