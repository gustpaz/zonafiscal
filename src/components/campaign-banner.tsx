"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Info, AlertTriangle, CheckCircle, Gift } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { collection, getDocs, query, where, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Campaign } from "@/lib/client-admin-marketing";

export default function CampaignBanner() {
  const { user } = useAuth();
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [dismissedCampaigns, setDismissedCampaigns] = useState<string[]>([]);
  const [userPlan, setUserPlan] = useState<'Pro' | 'Gratuito'>('Gratuito');

  // Buscar plano do usuário
  useEffect(() => {
    if (!user) return;

    const fetchUserPlan = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserPlan(userDoc.data()?.plan || 'Gratuito');
        }
      } catch (error) {
        console.error("Erro ao buscar plano do usuário:", error);
      }
    };

    fetchUserPlan();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchActiveCampaigns = async () => {
      try {
        const campaignsRef = collection(db, 'campaigns');
        const campaignsSnap = await getDocs(campaignsRef);
        
        const now = new Date();
        
        // Carregar campanhas já dispensadas do localStorage
        const dismissed = JSON.parse(localStorage.getItem('dismissedCampaigns') || '[]');
        setDismissedCampaigns(dismissed);
        
        const campaigns: Campaign[] = campaignsSnap.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Campaign))
          .filter(campaign => {
            // Filtrar apenas campanhas ativas
            if (campaign.status !== 'Ativa') return false;
            
            // Verificar se expirou
            if (campaign.expiresAt && new Date(campaign.expiresAt) < now) return false;
            
            // Verificar público-alvo
            if (campaign.targetAudience === 'all') return true;
            if (campaign.targetAudience === 'pro' && userPlan === 'Pro') return true;
            if (campaign.targetAudience === 'free' && userPlan === 'Gratuito') return true;
            if (campaign.targetAudience === 'specific' && campaign.specificUserIds?.includes(user.uid)) return true;
            
            return false;
          });

        setActiveCampaigns(campaigns);

        // Registrar visualização automaticamente
        campaigns.forEach(async (campaign) => {
          const campaignRef = doc(db, 'campaigns', campaign.id);
          await updateDoc(campaignRef, {
            views: increment(1)
          }).catch(() => {
            // Ignora erro se já foi contabilizado
          });
        });
      } catch (error) {
        console.error("Erro ao buscar campanhas:", error);
      }
    };

    fetchActiveCampaigns();
  }, [user]);

  const handleDismiss = (campaignId: string) => {
    setDismissedCampaigns(prev => [...prev, campaignId]);
    // Salva no localStorage para não mostrar novamente
    const dismissed = JSON.parse(localStorage.getItem('dismissedCampaigns') || '[]');
    dismissed.push(campaignId);
    localStorage.setItem('dismissedCampaigns', JSON.stringify(dismissed));
  };

  const handleClick = async (campaignId: string) => {
    try {
      const campaignRef = doc(db, 'campaigns', campaignId);
      await updateDoc(campaignRef, {
        clicks: increment(1)
      });
    } catch (error) {
      console.error("Erro ao registrar clique:", error);
    }
  };

  const visibleCampaigns = activeCampaigns.filter(c => !dismissedCampaigns.includes(c.id));

  if (visibleCampaigns.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleCampaigns.map(campaign => {
        const Icon = 
          campaign.type === 'info' ? Info :
          campaign.type === 'warning' ? AlertTriangle :
          campaign.type === 'success' ? CheckCircle :
          Gift;

        const variant = 
          campaign.type === 'warning' ? 'destructive' : 'default';

        return (
          <Alert key={campaign.id} variant={variant} className="relative">
            <Icon className="h-4 w-4" />
            <AlertTitle>{campaign.title}</AlertTitle>
            <AlertDescription>
              {campaign.message}
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => handleDismiss(campaign.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        );
      })}
    </div>
  );
}

