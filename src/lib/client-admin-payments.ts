"use client";

import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "./types";

export interface Payment {
  id: string;
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  date: string;
  status: "Pago" | "Falhou" | "Pendente";
  userId?: string;
}

export interface PaymentsData {
  monthlyRevenue: number;
  newSubscriptions: number;
  churnRate: number;
  payments: Payment[];
}

export async function getPaymentsDataClient(): Promise<PaymentsData> {
  try {
    // Buscar todos os pagamentos da coleção 'payments'
    const paymentsRef = collection(db, 'payments');
    const paymentsSnap = await getDocs(paymentsRef);
    
    const payments: Payment[] = paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Payment));

    // Se não houver pagamentos reais, simular baseado em usuários Pro
    let finalPayments = payments;
    
    if (payments.length === 0) {
      console.log("⚠️ Nenhum pagamento encontrado. Simulando baseado em usuários Pro...");
      
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      const users: User[] = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));

      finalPayments = users
        .filter(u => u.plan === 'Pro' && u.status === 'Ativo')
        .map(u => ({
          id: `simulated_${u.id}`,
          userName: u.name || 'Usuário',
          userEmail: u.email || '',
          planName: 'Pro Mensal',
          amount: 29.90,
          date: u.convertedAt || u.signupDate || new Date().toISOString(),
          status: 'Pago' as const,
          userId: u.id
        }));
    }

    // Calcular métricas
    const monthlyRevenue = finalPayments.reduce((sum, p) => p.status === 'Pago' ? sum + p.amount : sum, 0);
    
    // Contar novas assinaturas do mês atual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newSubscriptions = finalPayments.filter(p => {
      const paymentDate = new Date(p.date);
      return paymentDate >= firstDayOfMonth;
    }).length;

    // Calcular churn rate baseado em usuários
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const totalUsers = usersSnap.size;
    const inactiveUsers = usersSnap.docs.filter(doc => doc.data().status === 'Inativo').length;
    const churnRate = totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0;

    return {
      monthlyRevenue,
      newSubscriptions,
      churnRate,
      payments: finalPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  } catch (error) {
    console.error("Erro ao buscar dados de pagamentos:", error);
    throw error;
  }
}

export async function updatePaymentStatusClient(paymentId: string, status: Payment['status']): Promise<void> {
  // Como os pagamentos são simulados, esta função apenas simula uma atualização
  // Em produção, você teria uma coleção 'payments' no Firestore
  console.log(`Atualizando pagamento ${paymentId} para status ${status}`);
  // TODO: Implementar quando houver uma coleção real de pagamentos
}

