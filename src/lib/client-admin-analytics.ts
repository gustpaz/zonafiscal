"use client";

import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "./types";

export interface CampaignAnalytics {
  source: string; // utm_source (ex: facebook, google, instagram)
  medium: string; // utm_medium (ex: cpc, social, email)
  campaign: string; // utm_campaign (ex: promo-verao-2024)
  content?: string; // utm_content (conjunto de anúncios)
  term?: string; // utm_term (anúncio específico)
  
  // Métricas
  visits: number;
  signups: number;
  conversions: number; // Upgrades para planos pagos
  revenue: number;
  
  // Detalhamento por plano
  planBreakdown: Record<string, number>; // Ex: { "Pro": 10, "Business": 5 }
  
  // Custos (opcional - adicionar manualmente)
  adSpend?: number;
  
  // Calculados
  conversionRate: number; // (conversions / signups) * 100
  roi?: number; // (revenue - adSpend) / adSpend * 100
  cpa?: number; // Cost per acquisition: adSpend / conversions
}

export interface TrafficSource {
  source: string;
  totalUsers: number;
  conversions: number;
  revenue: number;
}

export interface CampaignPerformance {
  campaignName: string;
  source: string;
  medium: string;
  signups: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export async function getAnalyticsDataClient() {
  try {
    // Buscar todos os usuários
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const users: User[] = usersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));

    // Buscar todos os planos para pegar preços
    const plansRef = collection(db, 'plans');
    const plansSnap = await getDocs(plansRef);
    
    const planPrices: Record<string, number> = {};
    plansSnap.docs.forEach(doc => {
      const planData = doc.data();
      planPrices[planData.name] = planData.price || 0;
    });

    // Agrupar por campanha
    const campaignMap: Map<string, CampaignAnalytics> = new Map();

    users.forEach(user => {
      const source = user.utmSource || 'direct';
      const medium = user.utmMedium || 'none';
      const campaign = user.utmCampaign || 'organic';
      const content = user.utmContent || undefined;
      const term = user.utmTerm || undefined;
      
      const key = `${source}|${medium}|${campaign}|${content}|${term}`;
      
      const existing = campaignMap.get(key);
      // Conversão = qualquer plano PAGO (preço > 0) com data de conversão
      const userPlan = user.plan || 'Gratuito';
      const planPrice = planPrices[userPlan] || 0;
      const isConversion = planPrice > 0 && user.convertedAt;
      const revenue = isConversion ? planPrice : 0;

      if (existing) {
        existing.signups += 1;
        if (isConversion) {
          existing.conversions += 1;
          existing.revenue += revenue;
          // Atualizar breakdown por plano
          existing.planBreakdown[userPlan] = (existing.planBreakdown[userPlan] || 0) + 1;
        }
      } else {
        campaignMap.set(key, {
          source,
          medium,
          campaign,
          content,
          term,
          visits: 0, // Precisaria de tracking de página
          signups: 1,
          conversions: isConversion ? 1 : 0,
          revenue,
          planBreakdown: isConversion ? { [userPlan]: 1 } : {},
          conversionRate: 0
        });
      }
    });

    // Calcular taxas de conversão
    const analytics: CampaignAnalytics[] = Array.from(campaignMap.values()).map(item => ({
      ...item,
      conversionRate: item.signups > 0 ? (item.conversions / item.signups) * 100 : 0,
      roi: item.adSpend ? ((item.revenue - item.adSpend) / item.adSpend) * 100 : undefined,
      cpa: item.adSpend && item.conversions > 0 ? item.adSpend / item.conversions : undefined
    }));

    // Ordenar por conversões (maior primeiro)
    analytics.sort((a, b) => b.conversions - a.conversions);

    // Agrupar por fonte
    const sourceMap: Map<string, TrafficSource> = new Map();
    analytics.forEach(item => {
      const existing = sourceMap.get(item.source);
      if (existing) {
        existing.totalUsers += item.signups;
        existing.conversions += item.conversions;
        existing.revenue += item.revenue;
      } else {
        sourceMap.set(item.source, {
          source: item.source,
          totalUsers: item.signups,
          conversions: item.conversions,
          revenue: item.revenue
        });
      }
    });

    const trafficSources = Array.from(sourceMap.values())
      .sort((a, b) => b.totalUsers - a.totalUsers);

    // Calcular totais (todos os planos pagos)
    const totalConversions = users.filter(u => {
      const userPlan = u.plan || 'Gratuito';
      const planPrice = planPrices[userPlan] || 0;
      return planPrice > 0 && u.convertedAt;
    }).length;

    const totalRevenue = users.reduce((sum, u) => {
      const userPlan = u.plan || 'Gratuito';
      const planPrice = planPrices[userPlan] || 0;
      const isConversion = planPrice > 0 && u.convertedAt;
      return sum + (isConversion ? planPrice : 0);
    }, 0);

    return {
      campaigns: analytics,
      trafficSources,
      totalSignups: users.length,
      totalConversions,
      totalRevenue
    };
  } catch (error) {
    console.error("Erro ao buscar analytics:", error);
    throw error;
  }
}

export async function updateCampaignCostClient(
  source: string,
  medium: string,
  campaign: string,
  cost: number
): Promise<void> {
  try {
    const costRef = doc(db, 'campaignCosts', `${source}_${medium}_${campaign}`);
    await setDoc(costRef, {
      source,
      medium,
      campaign,
      cost,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao salvar custo da campanha:", error);
    throw error;
  }
}

