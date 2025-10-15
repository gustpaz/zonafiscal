// Script temporário para criar planos iniciais no Firestore
// Execute uma vez e depois pode deletar

import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Plan } from "../lib/types";

const defaultPlans: Plan[] = [
  {
    id: 'gratuito',
    name: 'Gratuito',
    price: 0,
    subscribers: 0,
    status: 'Ativo',
    features: {
      transactions: 50,
      aiTips: false,
      pdfExport: false,
      prioritySupport: false,
      forecast: false,
      goalsAndBudgets: false,
      teamMembersIncluded: 0,
      aiReportLimit: 2,
      pricePerMember: 0,
      accountingReports: false
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.90,
    priceIdMonthly: "price_1PStA1RxmG12W2h4kL7d2j3d",
    priceIdYearly: "price_1PStA1RxmG12W2h44kGq5b1t",
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
      accountingReports: true
    }
  }
];

export async function initializePlans() {
  try {
    console.log("🔍 Verificando se já existem planos no Firestore...");
    
    const plansRef = collection(db, 'plans');
    const plansSnap = await getDocs(plansRef);
    
    if (plansSnap.size > 0) {
      console.log(`✅ Já existem ${plansSnap.size} planos no Firestore. Nada a fazer.`);
      return { success: true, created: 0, message: "Planos já existem" };
    }
    
    console.log("📝 Criando planos padrão no Firestore...");
    
    for (const plan of defaultPlans) {
      const planRef = doc(db, 'plans', plan.id);
      await setDoc(planRef, plan);
      console.log(`✅ Plano "${plan.name}" criado com sucesso!`);
    }
    
    console.log("🎉 Todos os planos foram criados!");
    return { success: true, created: defaultPlans.length, message: "Planos criados com sucesso" };
    
  } catch (error) {
    console.error("❌ Erro ao inicializar planos:", error);
    return { success: false, error };
  }
}

