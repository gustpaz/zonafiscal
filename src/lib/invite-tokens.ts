"use client";

import { doc, getDoc, setDoc, updateDoc, query, where, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface Invite {
  id: string;
  email: string;
  companyId: string;
  invitedBy: string;
  inviterName: string;
  inviterAvatar?: string;
  companyName: string;
  ownerPlan: string;
  status: 'pending' | 'accepted' | 'expired' | 'declined';
  token: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
}

// Gerar token único
export function generateInviteToken(inviteId: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${inviteId}_${randomStr}`;
}

// Criar convite
export async function createInvite(
  email: string,
  companyId: string,
  invitedBy: string,
  inviterName: string,
  companyName: string,
  ownerPlan: string
): Promise<{ invite: Invite; inviteLink: string }> {
  const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const token = generateInviteToken(inviteId);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias
  
  const invite: Invite = {
    id: inviteId,
    email,
    companyId,
    invitedBy,
    inviterName,
    companyName,
    ownerPlan,
    status: 'pending',
    token,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  
  await setDoc(doc(db, 'invites', inviteId), invite);
  
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/aceitar-convite?token=${token}`;
  
  return { invite, inviteLink };
}

// Buscar convite por token
export async function getInviteByToken(token: string): Promise<Invite | null> {
  try {
    const invitesRef = collection(db, 'invites');
    const q = query(invitesRef, where('token', '==', token));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const inviteDoc = snapshot.docs[0];
    return { id: inviteDoc.id, ...inviteDoc.data() } as Invite;
  } catch (error) {
    console.error("Erro ao buscar convite:", error);
    return null;
  }
}

// Aceitar convite
export async function acceptInvite(token: string, userId: string): Promise<boolean> {
  try {
    const invite = await getInviteByToken(token);
    
    if (!invite) {
      throw new Error("Convite não encontrado.");
    }
    
    if (invite.status !== 'pending') {
      throw new Error("Este convite já foi usado ou expirou.");
    }
    
    const now = new Date();
    const expiresAt = new Date(invite.expiresAt);
    
    if (now > expiresAt) {
      // Marcar como expirado
      await updateDoc(doc(db, 'invites', invite.id), {
        status: 'expired'
      });
      throw new Error("Este convite expirou.");
    }
    
    // Atualizar usuário
    await updateDoc(doc(db, 'users', userId), {
      companyId: invite.companyId,
      role: 'Membro',
      plan: invite.ownerPlan,
      teamPermissions: []
    });
    
    // Marcar convite como aceito
    await updateDoc(doc(db, 'invites', invite.id), {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      acceptedBy: userId
    });
    
    return true;
  } catch (error) {
    console.error("Erro ao aceitar convite:", error);
    throw error;
  }
}

// Verificar se email já tem convite pendente
export async function hasPendingInvite(email: string): Promise<Invite | null> {
  try {
    const invitesRef = collection(db, 'invites');
    const q = query(
      invitesRef, 
      where('email', '==', email),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    // Verificar se não expirou
    const inviteDoc = snapshot.docs[0];
    const invite = { id: inviteDoc.id, ...inviteDoc.data() } as Invite;
    
    const now = new Date();
    const expiresAt = new Date(invite.expiresAt);
    
    if (now > expiresAt) {
      // Marcar como expirado
      await updateDoc(doc(db, 'invites', invite.id), {
        status: 'expired'
      });
      return null;
    }
    
    return invite;
  } catch (error) {
    console.error("Erro ao verificar convite pendente:", error);
    return null;
  }
}

