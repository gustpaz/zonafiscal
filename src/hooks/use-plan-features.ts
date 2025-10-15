"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { getUserPlanInfo } from "@/lib/check-plan-features";
import type { Plan } from "@/lib/types";
import { getEffectivePlan } from "@/lib/subscription-utils";

export function usePlanFeatures() {
  const { user } = useAuth();
  const [planInfo, setPlanInfo] = useState<{
    plan: string;
    features: Plan['features'];
    canImportCSV: boolean;
    canExportPDF: boolean;
    canUseForecast: boolean;
    canUseAccountingReports: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlanInfo() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const info = await getUserPlanInfo(user.uid);
        setPlanInfo(info);
      } catch (error) {
        console.error("Erro ao carregar informações do plano:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPlanInfo();
  }, [user]);

  return {
    planInfo,
    loading,
    canImportCSV: planInfo?.canImportCSV ?? false,
    canExportPDF: planInfo?.canExportPDF ?? false,
    canUseForecast: planInfo?.canUseForecast ?? false,
    canUseAccountingReports: planInfo?.canUseAccountingReports ?? false,
    canUseTeam: (planInfo?.features.teamMembersIncluded ?? 0) > 0,
  };
}
