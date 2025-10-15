
"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { getFinancialRiskAlertAction } from "@/lib/actions";
import type { FinancialSummary } from "@/lib/types";
import type { AlertOnFinancialRiskOutput } from "@/ai/flows/alert-on-financial-risk";
import { Button } from "./ui/button";

interface AiAlertProps {
  summary: FinancialSummary;
}

const getSpendingLimit = () => {
    if (typeof window !== 'undefined') {
        return Number(localStorage.getItem("spendingLimit")) || 2000;
    }
    return 2000;
};

export default function AiAlert({ summary }: AiAlertProps) {
  const [alert, setAlert] = useState<AlertOnFinancialRiskOutput | null>(null);
  const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'complete'>('idle');

  const handleAnalyse = async () => {
    setAnalysisState('loading');
    const spendingLimit = getSpendingLimit();
    const result = await getFinancialRiskAlertAction({
      businessIncome: summary.businessIncome,
      personalExpenses: summary.personalExpenses,
      spendingLimit: spendingLimit,
      userId: "1",
    });
    setAlert(result);
    setAnalysisState('complete');
  };
  
  if (analysisState === 'loading') {
    return (
      <Alert className="bg-primary/10 border-primary/20 text-primary-foreground">
        <AlertCircle className="h-4 w-4 !text-primary" />
        <AlertTitle className="text-primary font-bold">Analisando suas finanças...</AlertTitle>
        <AlertDescription className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Nossa IA está verificando se há algo importante para você.
        </AlertDescription>
      </Alert>
    );
  }

  if (analysisState === 'complete') {
    if (!alert || alert.alertType === "none") {
      return (
        <Alert className="border-green-500/30 bg-green-500/10 text-green-400">
          <CheckCircle2 className="h-4 w-4 !text-green-400" />
          <AlertTitle className="font-bold text-green-400">Análise da IA Concluída</AlertTitle>
          <AlertDescription>Nossa IA analisou suas finanças e está tudo em ordem. Continue assim!</AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-bold">Alerta Inteligente!</AlertTitle>
        <AlertDescription>{alert.alertMessage}</AlertDescription>
      </Alert>
    );
  }

  // Idle state
  return (
      <Alert className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <div className="flex items-center">
                <Sparkles className="h-4 w-4 !text-primary" />
                <AlertTitle className="ml-2 text-primary font-bold">Análise Inteligente</AlertTitle>
            </div>
            <AlertDescription className="mt-1">
                Clique no botão para que nossa IA verifique suas finanças em busca de riscos ou oportunidades.
            </AlertDescription>
        </div>
        <Button onClick={handleAnalyse}>
            <Sparkles className="mr-2"/>
            Analisar Agora
        </Button>
      </Alert>
  )
}
