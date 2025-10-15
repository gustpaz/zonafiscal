"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { Plan } from "./types";

export async function getPlansClient(includeRetention: boolean = false): Promise<Plan[]> {
  try {
    const plansRef = collection(db, 'plans');
    const q = query(plansRef, where('status', '==', 'Ativo'));
    const plansSnap = await getDocs(q);
    
    let plans: Plan[] = plansSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Plan));
    
    // Filtrar por visibilidade se necessário
    if (!includeRetention) {
      plans = plans.filter(p => !p.visibility || p.visibility === 'public');
    }
    
    // Ordenar: Gratuito primeiro, depois Pro
    return plans.sort((a, b) => a.price - b.price);
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    // Retornar planos padrão como fallback
    return [
      {
        id: 'gratuito',
        name: 'Gratuito',
        price: 0,
        subscribers: 0,
        status: 'Ativo',
        features: {
          transactions: 50,
          aiTips: true,
          pdfExport: false,
          prioritySupport: false,
          forecast: false,
          goalsAndBudgets: true,
          teamMembersIncluded: 0,
          aiReportLimit: 2,
          pricePerMember: 0,
          accountingReports: false,
          csvImport: false
        }
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29.90,
        priceIdMonthly: '',
        priceIdYearly: '',
        subscribers: 0,
        status: 'Ativo',
        features: {
          transactions: -1,
          aiTips: true,
          pdfExport: true,
          prioritySupport: true,
          forecast: true,
          goalsAndBudgets: true,
          teamMembersIncluded: 1,
          aiReportLimit: 10,
          pricePerMember: 9.90,
          accountingReports: true,
          csvImport: true
        }
      }
    ];
  }
}

