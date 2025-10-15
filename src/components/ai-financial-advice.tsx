"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { getFinancialAdviceAction } from "@/lib/actions.tsx";
import type { ProvideFinancialAdviceOutput } from "@/ai/flows/provide-financial-advice";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function AiFinancialAdvice() {
  const { user } = useAuth();
  const [advice, setAdvice] = useState<ProvideFinancialAdviceOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAdvice = async () => {
    if (!user) return;
    setLoading(true);
    setAdvice(null);
    try {
      const result = await getFinancialAdviceAction(user.uid);
      setAdvice(result);
    } catch (error) {
      console.error("Failed to get financial advice:", error);
      // You could add a state to show an error message to the user here.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Lightbulb className="size-8 text-yellow-400" />
          <div>
            <CardTitle>Dicas da IA para Você</CardTitle>
            <CardDescription>
              Use nosso assistente para analisar suas movimentações e obter sugestões de como organizar suas finanças.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analisando suas finanças em busca de dicas...
          </div>
        ) : advice ? (
          <div className="space-y-4">
            {advice.insights.length > 0 ? (
                advice.insights.map((insight, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-accent/20">
                    <p className="font-semibold text-accent-foreground">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground">Nenhuma sugestão no momento. Adicione algumas transações para começar!</p>
            )}
             <Button variant="outline" onClick={fetchAdvice} disabled={loading}>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Novas Dicas
            </Button>
          </div>
        ) : (
           <Button onClick={fetchAdvice} disabled={loading || !user}>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Dicas com IA
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
