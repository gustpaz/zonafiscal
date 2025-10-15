"use client";

import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface Campaign {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "promotion";
  targetAudience: "all" | "pro" | "free" | "specific";
  specificUserIds?: string[];
  status: "Ativa" | "Agendada" | "Rascunho" | "Finalizada";
  createdAt: string;
  scheduledFor?: string;
  expiresAt?: string;
  // Métricas (calculadas automaticamente)
  views: number;
  clicks: number;
  targetedUsers: number;
}

export interface MarketingData {
  totalCampaigns: number;
  activeCampaigns: number;
  totalViews: number;
  totalClicks: number;
  campaigns: Campaign[];
}

export async function getMarketingDataClient(): Promise<MarketingData> {
  try {
    const campaignsRef = collection(db, 'campaigns');
    const campaignsSnap = await getDocs(campaignsRef);
    
    const campaigns: Campaign[] = campaignsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Campaign));
    
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'Ativa').length;
    const totalViews = campaigns.reduce((sum, c) => sum + (c.views || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

    return {
      totalCampaigns,
      activeCampaigns,
      totalViews,
      totalClicks,
      campaigns: campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    };
  } catch (error) {
    console.error("Erro ao buscar dados de marketing:", error);
    throw error;
  }
}

export async function saveCampaignClient(campaign: Campaign): Promise<void> {
  try {
    // Calcular número de usuários alvo
    let targetedUsers = 0;
    
    if (campaign.targetAudience !== 'specific') {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      targetedUsers = usersSnap.docs.filter(doc => {
        const userData = doc.data();
        if (campaign.targetAudience === 'all') return true;
        if (campaign.targetAudience === 'pro') return userData.plan === 'Pro';
        if (campaign.targetAudience === 'free') return userData.plan === 'Gratuito';
        return false;
      }).length;
    } else {
      targetedUsers = campaign.specificUserIds?.length || 0;
    }
    
    const campaignRef = doc(db, 'campaigns', campaign.id);
    await setDoc(campaignRef, {
      ...campaign,
      targetedUsers
    });
  } catch (error) {
    console.error("Erro ao salvar campanha:", error);
    throw error;
  }
}

export async function deleteCampaignClient(campaignId: string): Promise<void> {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    await deleteDoc(campaignRef);
  } catch (error) {
    console.error("Erro ao excluir campanha:", error);
    throw error;
  }
}

