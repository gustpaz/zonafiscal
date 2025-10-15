"use client";

import { getUserByIdClient } from "./client-admin-data";
import { getPlansClient } from "./client-plans";
import type { User, Plan } from "./types";
import { getEffectivePlan } from "./subscription-utils";

/**
 * Verifica se o usuário tem acesso a uma feature específica baseada no plano
 */
export async function checkPlanFeature(userId: string, feature: keyof Plan['features']): Promise<boolean> {
  try {
    // Buscar dados do usuário
    const user = await getUserByIdClient(userId);
    if (!user) return false;

    // Buscar planos disponíveis
    const plans = await getPlansClient();
    
    // Usar plano efetivo (considera cancelamento pendente)
    const effectivePlanName = getEffectivePlan(user);
    const userPlan = plans.find(plan => plan.name === effectivePlanName);
    if (!userPlan) return false;

    // Verificar se a feature está habilitada no plano
    return userPlan.features[feature] === true;
  } catch (error) {
    console.error("Erro ao verificar feature do plano:", error);
    return false;
  }
}

/**
 * Verifica se o usuário pode importar CSV
 */
export async function canImportCSV(userId: string): Promise<boolean> {
  return await checkPlanFeature(userId, 'csvImport');
}

/**
 * Verifica se o usuário pode exportar PDF
 */
export async function canExportPDF(userId: string): Promise<boolean> {
  return await checkPlanFeature(userId, 'pdfExport');
}

/**
 * Verifica se o usuário pode usar previsão de despesas
 */
export async function canUseForecast(userId: string): Promise<boolean> {
  return await checkPlanFeature(userId, 'forecast');
}

/**
 * Verifica se o usuário pode usar relatórios contábeis
 */
export async function canUseAccountingReports(userId: string): Promise<boolean> {
  return await checkPlanFeature(userId, 'accountingReports');
}

/**
 * Retorna informações sobre o plano do usuário
 */
export async function getUserPlanInfo(userId: string): Promise<{
  plan: string;
  features: Plan['features'];
  canImportCSV: boolean;
  canExportPDF: boolean;
  canUseForecast: boolean;
  canUseAccountingReports: boolean;
} | null> {
  try {
    const user = await getUserByIdClient(userId);
    if (!user) return null;

    const plans = await getPlansClient();
    
    // Usar plano efetivo (considera cancelamento pendente)
    const effectivePlanName = getEffectivePlan(user);
    const userPlan = plans.find(plan => plan.name === effectivePlanName);
    
    if (!userPlan) return null;

    return {
      plan: effectivePlanName,
      features: userPlan.features,
      canImportCSV: userPlan.features.csvImport,
      canExportPDF: userPlan.features.pdfExport,
      canUseForecast: userPlan.features.forecast,
      canUseAccountingReports: userPlan.features.accountingReports,
    };
  } catch (error) {
    console.error("Erro ao obter informações do plano:", error);
    return null;
  }
}
