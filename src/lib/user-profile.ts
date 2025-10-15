"use client";

import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, getAuth } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db, app } from "./firebase";
import type { User as FirebaseUser } from "firebase/auth";

export async function updateUserProfile(user: FirebaseUser, displayName: string): Promise<void> {
  try {
    // Atualizar no Firebase Auth
    await updateProfile(user, { displayName });
    
    // Atualizar no Firestore
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { name: displayName });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    throw error;
  }
}

export async function uploadProfilePhoto(user: FirebaseUser, file: File): Promise<string> {
  try {
    // Preparar FormData para enviar à API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.uid);

    // Fazer upload via API route (que usa Cloudinary)
    const response = await fetch('/api/upload-profile-photo', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao fazer upload');
    }

    const { url } = await response.json();
    
    // Atualizar no Firebase Auth
    await updateProfile(user, { photoURL: url });
    
    // Atualizar no Firestore
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { avatar: url });
    
    return url;
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    throw error;
  }
}

export async function changeUserPassword(user: FirebaseUser, currentPassword: string, newPassword: string): Promise<void> {
  try {
    // Reautenticar usuário (necessário para trocar senha)
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Atualizar senha
    await updatePassword(user, newPassword);
  } catch (error: any) {
    if (error.code === 'auth/wrong-password') {
      throw new Error('Senha atual incorreta');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('A nova senha é muito fraca. Use pelo menos 6 caracteres.');
    }
    console.error("Erro ao trocar senha:", error);
    throw error;
  }
}

export async function saveCompanyInfo(companyName: string): Promise<void> {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    // Salvar no Firestore
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { 
      companyName: companyName.trim(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log('✅ Nome da empresa salvo com sucesso');
  } catch (error) {
    console.error("Erro ao salvar nome da empresa:", error);
    throw error;
  }
}

