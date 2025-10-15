

'use server';

import { z } from 'zod';
import { alertOnFinancialRisk, type AlertOnFinancialRiskInput } from "@/ai/flows/alert-on-financial-risk";
import { provideFinancialAdvice } from "@/ai/flows/provide-financial-advice";
import { suggestTransactionCategory, type SuggestTransactionCategoryInput } from "@/ai/flows/suggest-transaction-category";
import { generateFinancialReport, type GenerateFinancialReportOutput } from "@/ai/flows/generate-financial-report";
import { 
    addTransaction, 
    addAuditLog, 
    deleteTransaction, 
    updateTransaction, 
    getAuditLogs,
    getUserSupportTickets,
    addSupportTicket,
    getTransactions,
    addOrUpdateGoal as dbAddOrUpdateGoal,
    addOrUpdateBudget as dbAddOrUpdateBudget,
    deleteGoal as dbDeleteGoal,
    deleteBudget as dbDeleteBudget,
    updateUserInDb,
} from "./data";
import { 
    getTicketById as getTicketByIdDB,
    addTicketReply as addTicketReplyDB,
    getUserById,
    getPlanByName,
    inviteNewTeamMember,
    removeTeamMemberById,
    verifyAdmin,
    fetchTeamMembers,
} from "./admin-data";
import type { AuditInfo, AuditLog, SupportTicket, TicketReply, Transaction, User, Goal, Budget } from "./types";
import { createHash } from 'crypto';
import { isSameMonth, addMonths } from 'date-fns';

// This function needs to be identical to the one in the audit page and data.ts
function createAuditHash(logData: Omit<AuditLog, 'hash' | 'id'>): string {
  const logString = `${logData.date}${logData.userId}${logData.userName}${logData.action}${logData.entity}${logData.entityId}${logData.details}${logData.previousHash}`;
  return createHash('sha256').update(logString).digest('hex');
}

// Zod Schemas for input validation
const transactionSchema = z.object({
  description: z.string().min(2).max(200),
  amount: z.coerce.number().positive(),
  date: z.string(),
  type: z.enum(["income", "expense"]),
  category: z.enum(["personal", "business", "mixed", "loan_to_business", "loan_to_personal"]),
  paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "transfer", "boleto"]),
  paymentSource: z.enum(["personal", "business"]),
  paymentType: z.enum(["avista", "parcelado"]),
  installments: z.number().min(1).optional(),
  currentInstallment: z.number().min(1).optional(),
  installmentId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type UnvalidatedTransaction = Omit<Transaction, 'id'>;

export async function getTransactionsAction(userId: string, filter?: 'personal' | 'business'): Promise<Transaction[]> {
    if (!userId) {
        console.error("getTransactionsAction called without a userId.");
        return [];
    }
    return getTransactions(userId, filter);
}

export async function addTransactionAction(data: UnvalidatedTransaction, auditInfo: AuditInfo): Promise<{ success: boolean; error?: string; transactions?: Transaction[] }> {
  const validation = transactionSchema.safeParse(data);
  if (!validation.success) {
    console.error("Validation failed:", validation.error.errors);
    return { success: false, error: "Dados da transação inválidos." };
  }

  const values = validation.data;
  
  try {
    const isInstallment = values.paymentType === 'parcelado' && (values.installments || 0) > 1;
    const createdTransactions: Transaction[] = [];

    if (isInstallment) {
      const installmentAmount = values.amount / values.installments!;
      const originalDescription = values.description;
      const installmentId = `inst-${Date.now()}`;
      
      for (let i = 0; i < values.installments!; i++) {
        const installmentDate = addMonths(new Date(values.date), i);
        
        const transactionData: UnvalidatedTransaction = {
            ...values,
            userId: auditInfo.userId,
            amount: installmentAmount,
            date: installmentDate.toISOString(),
            description: `${originalDescription} (${i + 1}/${values.installments})`,
            paymentType: 'parcelado',
            installments: values.installments,
            currentInstallment: i + 1,
            installmentId: installmentId,
        };
        const newTransaction = await addTransaction(transactionData);
        createdTransactions.push(newTransaction);
      }
    } else {
      // Handle single transactions
      const transactionData: UnvalidatedTransaction = {
          ...values,
          userId: auditInfo.userId,
          installments: 1,
          currentInstallment: 1,
      };
      const newTransaction = await addTransaction(transactionData);
      createdTransactions.push(newTransaction);
    }
    
    await addAuditLog({
        ...auditInfo,
        action: 'create',
        entity: 'transaction',
        entityId: 'batch_or_single',
        date: new Date().toISOString(),
        details: `Criada transação "${values.description}" no valor de R$ ${values.amount.toFixed(2)}.`,
    });

    return { success: true, transactions: createdTransactions };
  } catch (error: any) {
    console.error("Error during `addTransactionAction`:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTransactionAction(id: string, data: Partial<UnvalidatedTransaction & { userId: string }>, applyToFuture: boolean = false, auditInfo: AuditInfo): Promise<{ success: boolean; error?: string; updatedTransaction?: Transaction; }> {
    const partialSchema = transactionSchema.partial();
    const validation = partialSchema.safeParse(data);

    if (!validation.success) {
        console.error("Validation failed:", validation.error.errors);
        return { success: false, error: "Dados da transação inválidos." };
    }

    try {
        const updatedTransaction = await updateTransaction(auditInfo.userId, id, validation.data, applyToFuture);

        let details = `Atualizada transação "${data.description || 'ID: ' + id}".`;
        if (applyToFuture) {
            details += ' Alterações aplicadas às parcelas futuras.';
        }

        await addAuditLog({
            ...auditInfo,
            action: 'update',
            entity: 'transaction',
            entityId: id,
            date: new Date().toISOString(),
            details: details,
        });

        return { success: true, updatedTransaction };
    } catch (error: any) {
        console.error("Error updating transaction:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteTransactionAction(id: string, description: string, auditInfo: AuditInfo) {
    try {
        await deleteTransaction(auditInfo.userId, id);
        
        await addAuditLog({
            ...auditInfo,
            action: 'delete',
            entity: 'transaction',
            entityId: id,
            date: new Date().toISOString(),
            details: `Excluída transação "${description}".`,
        });

        return { success: true, deletedId: id };
    } catch (error: any) {
        console.error("Error deleting transaction:", error);
        return { success: false, error: error.message };
    }
}

export async function suggestCategoryAction(input: SuggestTransactionCategoryInput) {
    try {
        const result = await suggestTransactionCategory(input);
        return result;
    } catch (error) {
        console.error("Error in suggestCategoryAction:", error);
        return null;
    }
}

export async function getFinancialRiskAlertAction(input: AlertOnFinancialRiskInput) {
    try {
        const result = await alertOnFinancialRisk(input);
        return result;
    } catch (error) {
        console.error("Error in getFinancialRiskAlertAction:", error);
        return { alertMessage: 'Falha ao obter alerta da IA.', alertType: 'none' };
    }
}

export async function getFinancialAdviceAction(userId: string) {
    if (!userId) {
        console.error("getFinancialAdviceAction called without a userId.");
        return { insights: [] };
    }
    try {
        const transactions = await getTransactions(userId);
        if (transactions.length === 0) {
            return { insights: [] };
        }
        const result = await provideFinancialAdvice({ transactions });
        return result;
    } catch (error) {
        console.error("Error in getFinancialAdviceAction:", error);
        return null;
    }
}

export async function generateFinancialReportAction(
  input: { name: string; userId: string; startDate: string; endDate: string }
): Promise<{ success: boolean; data?: GenerateFinancialReportOutput; error?: string }> {
  try {
    const user = await getUserById(input.userId);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const plan = await getPlanByName(user.plan);
    if (!plan) {
      return { success: false, error: 'Plano do usuário não encontrado.' };
    }

    // Verificar se o plano tem acesso a relatórios com IA
    if (!plan.features.aiTips) {
      return { success: false, error: 'Esta funcionalidade não está disponível no seu plano. Faça upgrade para gerar relatórios com IA.' };
    }

    // Resetar a contagem se for um novo mês
    const now = new Date();
    const lastReset = user.reportGenerationTimestamp ? new Date(user.reportGenerationTimestamp) : now;
    if (!isSameMonth(now, lastReset)) {
      user.aiReportsGenerated = 0;
    }
    
    const usageCount = user.aiReportsGenerated || 0;
    const usageLimit = plan.features.aiReportLimit;

    if (usageLimit !== -1 && usageCount >= usageLimit) {
      return { success: false, error: `Limite de ${usageLimit} relatórios por mês atingido. Faça upgrade para gerar mais.` };
    }
    
    const allTransactions = await getTransactions(input.userId);
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
    
    // Incrementar e salvar a contagem de uso
    user.aiReportsGenerated = (user.aiReportsGenerated || 0) + 1;
    user.reportGenerationTimestamp = now.toISOString();
    await updateUserInDb(user, {userId: user.id, userName: user.name}); // Ação silenciosa, sem log de auditoria

    return { success: true, data: result };

  } catch (error) {
    console.error("Error in generateFinancialReportAction:", error);
    return { success: false, error: 'Ocorreu um erro ao gerar o relatório.' };
  }
}

export async function exportAuditReportAction(auditInfo: AuditInfo): Promise<{ success: boolean; csvData?: string; error?: string; }> {
    try {
        const auditLogs = await getAuditLogs(auditInfo.userId);
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
            log.isValid ? "Verificado" : "Adulterado",
            `"${new Date(log.date).toLocaleString('pt-BR')}"`,
            `"${log.userName}"`,
            actionLabels[log.action],
            `"${log.details.replace(/"/g, '""')}"`,
            log.hash,
            log.previousHash ?? 'Bloco Gênesis'
        ].join(','));

        const csvData = [headers.join(','), ...rows].join('\n');

        return { success: true, csvData };

    } catch (error) {
        console.error("Error exporting audit report:", error);
        return { success: false, error: "Falha ao gerar o relatório de auditoria." };
    }
}

export async function importTransactionsAction(transactions: Omit<Transaction, 'id'>[], auditInfo: AuditInfo): Promise<{ success: boolean; count?: number; transactionIds?: string[]; error?: string; }> {
  try {
    const transactionWithUserSchema = transactionSchema.extend({ userId: z.string() });
    
    let importedCount = 0;
    const transactionIds: string[] = [];
    
    for (const t of transactions) {
        const dataToValidate = { ...t, userId: auditInfo.userId };
        const validation = transactionWithUserSchema.safeParse(dataToValidate);
        
        if(validation.success) {
            const createdTransaction = await addTransaction(validation.data);
            transactionIds.push(createdTransaction.id!);
            importedCount++;
        }
    }

    if (importedCount > 0) {
      try {
        await addAuditLog({
          ...auditInfo,
          action: 'create',
          entity: 'transaction',
          entityId: 'batch_import',
          date: new Date().toISOString(),
          details: `Importadas ${importedCount} transações via arquivo CSV.`,
        });
      } catch (auditError: any) {
        // Não falha a importação por causa do audit log
      }
    }
    
    return { success: true, count: importedCount, transactionIds };
  } catch (error: any) {
    console.error("Error importing transactions:", error);
    return { success: false, error: error.message };
  }
}


// Support Ticket Actions
export async function getUserTickets(userId: string): Promise<SupportTicket[]> {
    return getUserSupportTickets(userId);
}

export async function createTicket(data: Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'replies'>): Promise<{ success: boolean, error?: string }> {
    try {
        await addSupportTicket(data);
        return { success: true };
    } catch(error) {
        return { success: false, error: 'Não foi possível criar o ticket.' };
    }
}

export async function getTicketById(ticketId: string) {
    return getTicketByIdDB(ticketId);
}

export async function addTicketReply(ticketId: string, reply: Omit<TicketReply, 'id' | 'createdAt'>, auditInfo: AuditInfo) {
    const result = await addTicketReplyDB(ticketId, reply);
    return result;
}

// Team Management Actions
export async function getTeamMembers(userId: string): Promise<User[]> {
    try {
        return await fetchTeamMembers(userId);
    } catch (error) {
        // The error is already emitted by fetchTeamMembersFromFirestore,
        // so we just return an empty array to prevent the UI from crashing.
        return [];
    }
}

export async function inviteTeamMember(ownerId: string, email: string): Promise<{ success: boolean; error?: string; owner?: User; shouldCharge?: boolean; inviteLink?: string; inviteToken?: string }> {
    try {
        const owner = await getUserById(ownerId);
        if (!owner || owner.role !== 'Dono') throw new Error("Apenas o dono da conta pode convidar membros.");
        if (!owner.companyId) throw new Error("Dono da conta sem ID de empresa.");
        
        const plan = await getPlanByName(owner.plan);
        if (!plan) throw new Error("Plano do usuário não encontrado.");

        const team = await getTeamMembers(ownerId);
        const currentMemberCount = team.length;
        const includedMembers = plan.features.teamMembersIncluded || 0;

        if (includedMembers === 0) {
            throw new Error("Seu plano não permite adicionar membros à equipe.");
        }

        const result = await inviteNewTeamMember(
          owner.companyId, 
          email,
          owner.name,
          owner.name, // companyName = nome do dono
          owner.plan
        );
        
        const shouldCharge = currentMemberCount >= includedMembers;
        
        // Extrair token do link
        const inviteToken = result.inviteLink?.split('token=')[1];
        
        return { 
          success: true, 
          owner, 
          shouldCharge,
          inviteLink: result.inviteLink,
          inviteToken
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function removeTeamMember(ownerId: string, memberId: string): Promise<{ success: boolean, error?: string, owner?: User, wasPaidMember?: boolean }> {
    try {
        const owner = await getUserById(ownerId);
        if (!owner || owner.role !== 'Dono') throw new Error("Apenas o dono da conta pode remover membros.");
        
        const member = await getUserById(memberId);
        if (!member || member.companyId !== owner.companyId) throw new Error("Membro não encontrado ou não pertence a esta equipe.");

        const plan = await getPlanByName(owner.plan);
        if (!plan) throw new Error("Plano do usuário não encontrado.");
        
        const team = await getTeamMembers(ownerId);
        const currentMemberCount = team.length;
        const includedMembers = plan.features.teamMembersIncluded || 0;
        
        // Determina se o membro que está sendo removido era um membro pago
        const wasPaidMember = currentMemberCount > includedMembers;

        await removeTeamMemberById(memberId);
        return { success: true, owner, wasPaidMember };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateTeamMemberPermissions(ownerId: string, memberId: string, permissions: User['teamPermissions']): Promise<{ success: boolean, error?: string }> {
    try {
        const owner = await getUserById(ownerId);
        if (!owner || owner.role !== 'Dono') throw new Error("Apenas o dono da conta pode alterar permissões.");

        const member = await getUserById(memberId);
        if (!member || member.companyId !== owner.companyId || member.role !== 'Membro') throw new Error("Membro inválido.");

        member.teamPermissions = permissions;
        await updateUserInDb(member, { userId: ownerId, userName: owner.name });
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// Goals and Budgets Actions
export async function addOrUpdateGoal(goalData: Omit<Goal, 'id' | 'currentAmount'>, auditInfo: AuditInfo): Promise<Goal> {
    const completeGoalData = { ...goalData, userId: auditInfo.userId } as Goal;

    const action = completeGoalData.id ? 'update' : 'create';
    const result = await dbAddOrUpdateGoal(completeGoalData);
    await addAuditLog({
      ...auditInfo,
      action: action,
      entity: 'goal',
      entityId: result.id,
      date: new Date().toISOString(),
      details: `Meta "${result.title}" foi ${action === 'create' ? 'criada' : 'atualizada'}.`,
    });
    return result;
}

export async function addOrUpdateBudget(budgetData: Omit<Budget, 'id' | 'spentAmount'>, auditInfo: AuditInfo) {
    const completeBudgetData = { ...budgetData, userId: auditInfo.userId } as Budget;
    
    const action = completeBudgetData.id ? 'update' : 'create';
    const result = await dbAddOrUpdateBudget(completeBudgetData);
    await addAuditLog({
      ...auditInfo,
      action: action,
      entity: 'budget',
      entityId: result.id,
      date: new Date().toISOString(),
      details: `Orçamento "${result.name}" foi ${action === 'create' ? 'criado' : 'atualizado'}.`,
    });
    return result;
}

export async function deleteGoal(id: string, auditInfo: AuditInfo) {
    const goal = await dbDeleteGoal(auditInfo.userId, id);

    await addAuditLog({
      ...auditInfo,
      action: 'delete',
      entity: 'goal',
      entityId: id,
      date: new Date().toISOString(),
      details: `Meta "${goal.title}" foi excluída.`,
    });
    return goal;
}

export async function deleteBudget(id: string, auditInfo: AuditInfo) {
    const budget = await dbDeleteBudget(auditInfo.userId, id);

    await addAuditLog({
      ...auditInfo,
      action: 'delete',
      entity: 'budget',
      entityId: id,
      date: new Date().toISOString(),
      details: `Orçamento "${budget.name}" foi excluído.`,
    });
    return budget;
}

export async function getUsageStatus(userId: string): Promise<{ limit: number, count: number }> {
    const user = await getUserById(userId);
    if (!user) return { limit: 0, count: 0 };
    
    const plan = await getPlanByName(user.plan);
    const limit = plan?.features.aiReportLimit ?? 0;
    
    // Reset count if it's a new month
    const now = new Date();
    const lastReset = user.reportGenerationTimestamp ? new Date(user.reportGenerationTimestamp) : now;
    const count = !isSameMonth(now, lastReset) ? 0 : user.aiReportsGenerated || 0;

    return { limit, count };
}
