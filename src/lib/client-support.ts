"use client";

import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, getDoc, doc } from "firebase/firestore";
import type { SupportTicket } from "./types";

export async function getUserTicketsClient(userId: string): Promise<SupportTicket[]> {
  if (!userId) return [];
  
  const ticketsCol = collection(db, `users/${userId}/tickets`);
  const q = query(ticketsCol, orderBy("createdAt", "desc"));
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
    } as SupportTicket;
  });
}

export async function createTicketClient(
  ticketData: Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'replies'>
): Promise<{ success: boolean; error?: string; ticketId?: string }> {
  try {
    const userId = ticketData.userId;
    if (!userId) {
      return { success: false, error: "User ID is required to create a ticket." };
    }

    const now = new Date();
    const newTicket: Omit<SupportTicket, 'id'> = {
      ...ticketData,
      status: 'Aberto',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      replies: []
    };

    const ticketsCol = collection(db, `users/${userId}/tickets`);
    const docRef = await addDoc(ticketsCol, {
      ...newTicket,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    return { success: true, ticketId: docRef.id };
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    return { success: false, error: error.message || "Ocorreu um erro ao criar o ticket." };
  }
}

export async function getTicketByIdClient(ticketId: string, userId: string): Promise<SupportTicket | null> {
  try {
    const ticketDoc = doc(db, `users/${userId}/tickets`, ticketId);
    const snapshot = await getDoc(ticketDoc);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
    } as SupportTicket;
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return null;
  }
}

