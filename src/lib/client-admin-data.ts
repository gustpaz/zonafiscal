"use client";

import { db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import type { User, Plan } from "./types";
import { getPlansClient } from "./client-plans";
import { isSameMonth } from "date-fns";

export async function getUserByIdClient(userId: string): Promise<User | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const data = userDoc.data();
    return {
      ...data,
      id: userDoc.id,
      signupDate: data.signupDate || new Date().toISOString()
    } as User;
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return null;
  }
}

export async function getPlanByNameClient(planName: string): Promise<Plan | null> {
  try {
    const plansCol = collection(db, 'plans');
    const q = query(plansCol, where('name', '==', planName));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Tentar buscar nos planos client como fallback
      const clientPlans = await getPlansClient();
      const clientPlan = clientPlans.find(p => p.name === planName);
      if (clientPlan) {
        return clientPlan;
      }
      // Retornar plano padrão se não encontrar
      return {
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
          accountingReports: false
        }
      };
    }
    
    const data = snapshot.docs[0].data();
    return {
      ...data,
      id: snapshot.docs[0].id
    } as Plan;
  } catch (error) {
    console.error("Erro ao buscar plano:", error);
    // Em caso de erro, retornar plano gratuito como fallback
    return {
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
        accountingReports: false
      }
    };
  }
}

export async function getUsageStatusClient(userId: string): Promise<{ limit: number, count: number, plan: Plan | null }> {
  try {
    const user = await getUserByIdClient(userId);
    if (!user) return { limit: 0, count: 0, plan: null };
    
    const plan = await getPlanByNameClient(user.plan);
    const limit = plan?.features.aiReportLimit ?? 0;
    
    // Reset count if it's a new month
    const now = new Date();
    const lastReset = user.reportGenerationTimestamp ? new Date(user.reportGenerationTimestamp) : now;
    const count = !isSameMonth(now, lastReset) ? 0 : user.aiReportsGenerated || 0;

    return { limit, count, plan };
  } catch (error) {
    console.error("Erro ao buscar status de uso:", error);
    return { limit: 0, count: 0, plan: null };
  }
}

export async function getTeamMembersClient(userId: string): Promise<User[]> {
  try {
    // Buscar o usuário atual para pegar o companyId
    const currentUser = await getUserByIdClient(userId);
    if (!currentUser || !currentUser.companyId) {
      return [currentUser].filter(Boolean) as User[];
    }
    
    // Buscar todos os usuários da mesma empresa
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('companyId', '==', currentUser.companyId));
    const snapshot = await getDocs(q);
    
    const teamMembers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        signupDate: data.signupDate || new Date().toISOString()
      } as User;
    });
    
    return teamMembers;
  } catch (error) {
    console.error("Erro ao buscar membros da equipe:", error);
    return [];
  }
}