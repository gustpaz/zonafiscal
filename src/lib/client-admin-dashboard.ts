"use client";

import { collection, getDocs, query, where, Timestamp, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "./types";

export interface MonthlyUserGrowth {
  month: string;
  users: number;
}

export interface RecentActivity {
  type: 'user' | 'transaction' | 'report';
  title: string;
  description: string;
  timestamp: string;
}

export interface AdminGoals {
  monthlyUsers: number;
  monthlyRevenue: number;
}

export interface AdminDashboardData {
  totalUsers: number;
  mrr: number;
  activeToday: number;
  totalTransactions: number;
  recentUsers: User[];
  userGrowthData: MonthlyUserGrowth[];
  recentActivities: RecentActivity[];
  goals: AdminGoals;
  featureFlags: {
    pdfExport: boolean;
    csvImport: boolean;
  };
}

export async function getAdminDashboardDataClient(): Promise<AdminDashboardData> {
  try {
    // Buscar todos os usuários
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const users: User[] = usersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));

    // Total de usuários
    const totalUsers = users.length;

    // Calcular MRR (Monthly Recurring Revenue)
    // Assumindo que usuários com plano "Pro" pagam R$ 29,90/mês
    const proUsers = users.filter(u => u.plan === 'Pro' && u.status === 'Ativo');
    const mrr = proUsers.length * 29.90;

    // Buscar total de transações de todos os usuários
    let totalTransactions = 0;
    for (const user of users) {
      try {
        const transactionsRef = collection(db, `users/${user.id}/transactions`);
        const transactionsSnap = await getDocs(transactionsRef);
        totalTransactions += transactionsSnap.size;
      } catch (error) {
        console.warn(`Erro ao buscar transações do usuário ${user.id}:`, error);
        // Continua mesmo se um usuário específico falhar
      }
    }

    // Active today (simulado - em produção seria baseado em lastLoginDate)
    // Por enquanto, vamos considerar usuários ativos como aqueles com status "Ativo"
    const activeToday = users.filter(u => u.status === 'Ativo').length;

    // Usuários recentes (últimos 5)
    const recentUsers = users
      .sort((a, b) => {
        const dateA = a.signupDate ? new Date(a.signupDate).getTime() : 0;
        const dateB = b.signupDate ? new Date(b.signupDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);

    // Calcular crescimento mensal de usuários (últimos 6 meses)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const userGrowthData: MonthlyUserGrowth[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthNames[targetMonth.getMonth()];
      
      const usersInMonth = users.filter(user => {
        if (!user.signupDate) return false;
        const signupDate = new Date(user.signupDate);
        return signupDate.getMonth() === targetMonth.getMonth() && 
               signupDate.getFullYear() === targetMonth.getFullYear();
      }).length;
      
      userGrowthData.push({
        month: monthKey,
        users: usersInMonth
      });
    }

    // Buscar atividades recentes
    const recentActivities: RecentActivity[] = [];
    
    // 1. Últimos usuários cadastrados
    if (recentUsers.length > 0) {
      const latestUser = recentUsers[0];
      recentActivities.push({
        type: 'user',
        title: 'Novo usuário cadastrado',
        description: `${latestUser.name || latestUser.email}`,
        timestamp: latestUser.signupDate || new Date().toISOString()
      });
    }
    
    // 2. Total de transações recentes (últimas 24h)
    let recentTransactionsCount = 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const user of users) {
      try {
        const transactionsRef = collection(db, `users/${user.id}/transactions`);
        const transactionsSnap = await getDocs(transactionsRef);
        
        transactionsSnap.docs.forEach(doc => {
          const txData = doc.data();
          if (txData.date) {
            const txDate = new Date(txData.date);
            if (txDate > oneDayAgo) {
              recentTransactionsCount++;
            }
          }
        });
      } catch (error) {
        // Ignora erros de usuários específicos
      }
    }
    
    if (recentTransactionsCount > 0) {
      recentActivities.push({
        type: 'transaction',
        title: `${recentTransactionsCount} novas transações`,
        description: 'Registradas nas últimas 24 horas',
        timestamp: new Date().toISOString()
      });
    }
    
    // 3. Relatórios gerados (últimas 24h)
    let recentReportsCount = 0;
    
    for (const user of users) {
      try {
        const reportsRef = collection(db, `users/${user.id}/reports`);
        const reportsSnap = await getDocs(reportsRef);
        
        reportsSnap.docs.forEach(doc => {
          const reportData = doc.data();
          if (reportData.createdAt) {
            const reportDate = new Date(reportData.createdAt);
            if (reportDate > oneDayAgo) {
              recentReportsCount++;
            }
          }
        });
      } catch (error) {
        // Ignora erros de usuários específicos
      }
    }
    
    if (recentReportsCount > 0) {
      recentActivities.push({
        type: 'report',
        title: `${recentReportsCount} relatórios gerados`,
        description: 'A IA gerou novos relatórios nas últimas 24h',
        timestamp: new Date().toISOString()
      });
    }

    // Buscar metas administrativas
    const goalsRef = doc(db, 'admin', 'goals');
    const goalsSnap = await getDoc(goalsRef);
    const goals: AdminGoals = goalsSnap.exists() 
      ? goalsSnap.data() as AdminGoals
      : { monthlyUsers: 2000, monthlyRevenue: 40000 };

    // Buscar feature flags
    const flagsRef = doc(db, 'admin', 'featureFlags');
    const flagsSnap = await getDoc(flagsRef);
    const featureFlags = flagsSnap.exists()
      ? flagsSnap.data() as { pdfExport: boolean; csvImport: boolean }
      : { pdfExport: true, csvImport: false };

    return {
      totalUsers,
      mrr,
      activeToday,
      totalTransactions,
      recentUsers,
      userGrowthData,
      recentActivities,
      goals,
      featureFlags,
    };
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    throw error;
  }
}

export async function updateFeatureFlagsClient(flags: { pdfExport: boolean; csvImport: boolean }): Promise<void> {
  try {
    const settingsRef = doc(db, 'admin', 'featureFlags');
    await setDoc(settingsRef, flags);
  } catch (error) {
    console.error("Erro ao salvar feature flags:", error);
    throw error;
  }
}

export async function saveAdminGoalsClient(goals: AdminGoals): Promise<void> {
  try {
    const goalsRef = doc(db, 'admin', 'goals');
    await setDoc(goalsRef, goals);
  } catch (error) {
    console.error("Erro ao salvar metas admin:", error);
    throw error;
  }
}

