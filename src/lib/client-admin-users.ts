"use client";

import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "./types";

export async function getUsersClient(): Promise<User[]> {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const users: User[] = usersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));
    
    return users;
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    throw error;
  }
}

export async function updateUserClient(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, { ...user });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    throw error;
  }
}

export async function deleteUserClient(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    throw error;
  }
}

export async function createUserClient(user: Partial<User>): Promise<void> {
  try {
    const usersRef = collection(db, 'users');
    const newUserRef = doc(usersRef);
    
    const newUser = {
      ...user,
      id: newUserRef.id,
      signupDate: new Date().toISOString(),
      status: 'Ativo',
      plan: 'Gratuito',
      role: 'Dono',
      companyId: newUserRef.id, // Por simplicidade, usa o próprio ID
      adminRole: 'Nenhum',
      adminPermissions: [],
    };
    
    await setDoc(newUserRef, newUser);
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    throw error;
  }
}

