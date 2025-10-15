"use client";

import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import type { GenerateFinancialReportOutput } from "@/ai/flows/generate-financial-report";

export interface SavedReport {
  id: string;
  userId: string;
  userName: string;
  title: string;
  summary: string;
  totalIncome: number;
  totalExpenses: number;
  businessProfit: number;
  personalSpending: number;
  reportDetails: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'completed' | 'error';
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export async function createReportPlaceholder(
  userId: string,
  userName: string,
  startDate: string,
  endDate: string
): Promise<string> {
  const reportsCol = collection(db, `users/${userId}/reports`);
  
  const placeholder: Omit<SavedReport, 'id'> = {
    userId,
    userName,
    title: 'Gerando relatório...',
    summary: '',
    totalIncome: 0,
    totalExpenses: 0,
    businessProfit: 0,
    personalSpending: 0,
    reportDetails: '',
    startDate,
    endDate,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  const docRef = await addDoc(reportsCol, {
    ...placeholder,
    createdAt: Timestamp.now()
  });
  
  return docRef.id;
}

export async function updateReportWithResult(
  userId: string,
  reportId: string,
  data: GenerateFinancialReportOutput
): Promise<void> {
  const reportDoc = doc(db, `users/${userId}/reports`, reportId);
  
  await updateDoc(reportDoc, {
    title: data.title,
    summary: data.summary,
    totalIncome: data.totalIncome,
    totalExpenses: data.totalExpenses,
    businessProfit: data.businessProfit,
    personalSpending: data.personalSpending,
    reportDetails: data.reportDetails,
    status: 'completed',
    completedAt: Timestamp.now()
  });
}

export async function updateReportWithError(
  userId: string,
  reportId: string,
  error: string
): Promise<void> {
  const reportDoc = doc(db, `users/${userId}/reports`, reportId);
  
  await updateDoc(reportDoc, {
    status: 'error',
    error,
    completedAt: Timestamp.now()
  });
}

export async function getSavedReports(userId: string): Promise<SavedReport[]> {
  const reportsCol = collection(db, `users/${userId}/reports`);
  const q = query(reportsCol, orderBy('createdAt', 'desc'));
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      completedAt: data.completedAt ? (data.completedAt as Timestamp).toDate().toISOString() : undefined
    } as SavedReport;
  });
}

export async function getReportById(userId: string, reportId: string): Promise<SavedReport | null> {
  const reportDoc = doc(db, `users/${userId}/reports`, reportId);
  const snapshot = await getDoc(reportDoc);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    completedAt: data.completedAt ? (data.completedAt as Timestamp).toDate().toISOString() : undefined
  } as SavedReport;
}

