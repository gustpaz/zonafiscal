"use client";

import { collection, getDocs, query, where, Timestamp, doc, setDoc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { SupportTicket, TicketReply } from "./types";

export interface SupportTicketsData {
  tickets: SupportTicket[];
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
}

export async function getSupportTicketsClient(): Promise<SupportTicketsData> {
  try {
    // Buscar todos os usuários primeiro
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const allTickets: SupportTicket[] = [];
    
    // Para cada usuário, buscar seus tickets
    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const ticketsRef = collection(db, `users/${userId}/tickets`);
      const ticketsSnap = await getDocs(ticketsRef);
      
      ticketsSnap.docs.forEach(ticketDoc => {
        allTickets.push({
          id: ticketDoc.id,
          userId,
          ...ticketDoc.data()
        } as SupportTicket);
      });
    }
    
    const totalTickets = allTickets.length;
    const openTickets = allTickets.filter(t => t.status === 'Aberto').length;
    const closedTickets = allTickets.filter(t => t.status === 'Fechado').length;
    
    return {
      tickets: allTickets,
      totalTickets,
      openTickets,
      closedTickets
    };
  } catch (error) {
    console.error("Erro ao buscar tickets de suporte:", error);
    throw error;
  }
}

export async function updateTicketStatusClient(ticketId: string, status: SupportTicket['status'], userId: string): Promise<void> {
  try {
    // Como não sabemos qual usuário possui o ticket, vamos buscar em todos
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    for (const userDoc of usersSnap.docs) {
      const userTicketRef = doc(db, `users/${userDoc.id}/tickets`, ticketId);
      await updateDoc(userTicketRef, { status });
      break; // Assume que encontrou o ticket
    }
  } catch (error) {
    console.error("Erro ao atualizar status do ticket:", error);
    throw error;
  }
}

export async function addTicketReplyClient(ticketId: string, reply: Omit<TicketReply, 'id' | 'createdAt'>, userId: string): Promise<void> {
  try {
    // Similar ao update, busca em todos os usuários
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    for (const userDoc of usersSnap.docs) {
      const repliesRef = collection(db, `users/${userDoc.id}/tickets/${ticketId}/replies`);
      await addDoc(repliesRef, {
        ...reply,
        createdAt: new Date().toISOString()
      });
      break; // Assume que encontrou o ticket
    }
  } catch (error) {
    console.error("Erro ao adicionar resposta ao ticket:", error);
    throw error;
  }
}
