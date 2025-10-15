"use client";

import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Plan } from "./types";

export async function getPlansAdminClient(): Promise<Plan[]> {
  try {
    const plansRef = collection(db, 'plans');
    const plansSnap = await getDocs(plansRef);
    
    // Buscar todos os usuários para contar assinantes
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    // Contar assinantes por plano
    const subscriberCounts: Record<string, number> = {};
    usersSnap.docs.forEach(doc => {
      const userData = doc.data();
      const planName = userData.plan || 'Gratuito';
      subscriberCounts[planName] = (subscriberCounts[planName] || 0) + 1;
    });
    
    const plans: Plan[] = plansSnap.docs.map(doc => {
      const planData = doc.data() as Plan;
      return {
        ...planData,
        id: doc.id,
        subscribers: subscriberCounts[planData.name] || 0
      };
    });
    
    // Ordenar por preço
    return plans.sort((a, b) => a.price - b.price);
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    throw error;
  }
}

export async function savePlanClient(plan: Plan): Promise<void> {
  try {
    const planRef = doc(db, 'plans', plan.id);
    
    // Garantir que nenhum campo seja undefined
    const cleanPlan: Plan = {
      ...plan,
      features: {
        transactions: plan.features.transactions ?? 0,
        aiReportLimit: plan.features.aiReportLimit ?? 0,
        teamMembersIncluded: plan.features.teamMembersIncluded ?? 0,
        pricePerMember: plan.features.pricePerMember ?? 0,
        aiTips: plan.features.aiTips ?? false,
        pdfExport: plan.features.pdfExport ?? false,
        prioritySupport: plan.features.prioritySupport ?? false,
        forecast: plan.features.forecast ?? false,
        goalsAndBudgets: plan.features.goalsAndBudgets ?? false,
        accountingReports: plan.features.accountingReports ?? false,
        csvImport: plan.features.csvImport ?? false,
      }
    };
    
    await setDoc(planRef, cleanPlan);
  } catch (error) {
    console.error("Erro ao salvar plano:", error);
    throw error;
  }
}

