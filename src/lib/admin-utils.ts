"use client";

import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "./types";

/**
 * Transforma um usuário em Super Admin
 */
export async function makeUserSuperAdmin(userId: string): Promise<boolean> {
  try {
    console.log('🔄 Transformando usuário em Super Admin:', userId);
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error('❌ Usuário não encontrado:', userId);
      return false;
    }
    
    const userData = userDoc.data() as User;
    
    const updatedUser: User = {
      ...userData,
      adminRole: 'Super Admin',
      adminPermissions: ['dashboard', 'plans', 'users', 'payments', 'marketing', 'tracking', 'integrations', 'support']
    };
    
    await setDoc(userDocRef, updatedUser);
    console.log('✅ Usuário transformado em Super Admin com sucesso:', {
      id: userId,
      email: userData.email,
      adminRole: updatedUser.adminRole,
      adminPermissions: updatedUser.adminPermissions
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao transformar usuário em Super Admin:', error);
    return false;
  }
}

/**
 * Remove permissões de admin de um usuário
 */
export async function removeUserAdminPermissions(userId: string): Promise<boolean> {
  try {
    console.log('🔄 Removendo permissões de admin:', userId);
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error('❌ Usuário não encontrado:', userId);
      return false;
    }
    
    const userData = userDoc.data() as User;
    
    const updatedUser: User = {
      ...userData,
      adminRole: 'Nenhum',
      adminPermissions: []
    };
    
    await setDoc(userDocRef, updatedUser);
    console.log('✅ Permissões de admin removidas com sucesso:', {
      id: userId,
      email: userData.email
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao remover permissões de admin:', error);
    return false;
  }
}

/**
 * Verifica se um usuário é Super Admin
 */
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data() as User;
    return userData.adminRole === 'Super Admin';
  } catch (error) {
    console.error('❌ Erro ao verificar se usuário é Super Admin:', error);
    return false;
  }
}
