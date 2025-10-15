"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface AdminGoals {
  monthlyUsers: number;
  monthlyRevenue: number;
}

export async function getAdminGoalsClient(): Promise<AdminGoals> {
  try {
    const goalsRef = doc(db, 'admin', 'goals');
    const goalsSnap = await getDoc(goalsRef);
    
    if (goalsSnap.exists()) {
      return goalsSnap.data() as AdminGoals;
    }
    
    // Retorna valores padrão se não existir
    return {
      monthlyUsers: 2000,
      monthlyRevenue: 40000
    };
  } catch (error) {
    console.error("Erro ao buscar metas admin:", error);
    // Retorna valores padrão em caso de erro
    return {
      monthlyUsers: 2000,
      monthlyRevenue: 40000
    };
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

