
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Sparkles } from "lucide-react";
import { getUsageStatusClient } from "@/lib/client-admin-data";
import { generateFinancialReportClient } from "@/lib/client-reports";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "./ui/alert";


export default function GenerateReport() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ limit: number, count: number } | null>(null);
  const searchParams = useSearchParams();
  
  const fetchUsage = async () => {
    if (!user) return;
    try {
      const usageStatus = await getUsageStatusClient(user.uid);
      setUsage(usageStatus);
    } catch (error) {
      console.error("Erro ao buscar status de uso:", error);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [user]);

  const handleGenerateReport = async () => {
    if (!user) return;
    
    // Refetch usage right before generating to ensure it's up to date
    await fetchUsage();

    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : subDays(new Date(), 30);
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();

    setLoading(true);
    setError(null);

    try {
      const result = await generateFinancialReportClient({ 
        name: user.displayName || "Usuário", 
        userId: user.uid,
        startDate: from.toISOString(),
        endDate: to.toISOString(),
      });
      
      if (result.success) {
        // Atualizar contador de uso após geração bem-sucedida
        await fetchUsage();
        
        // Redirecionar para página de relatórios salvos
        router.push('/meus-relatorios');
      } else {
        setError(result.error || "Não foi possível gerar o relatório.");
        setLoading(false);
      }
    } catch (e: any) {
      console.error("Failed to generate report:", e);
      setError(e.message || "Ocorreu um erro inesperado.");
      setLoading(false);
    }
  };
  
  const getPeriodDescription = () => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) {
        return `Análise para o período de ${format(new Date(from), "dd/MM/yy", { locale: ptBR })} a ${format(new Date(to), "dd/MM/yy", { locale: ptBR })}.`
    }
    return "Use o seletor de datas acima para definir um período e gerar um relatório."
  }
  
  const canGenerate = usage ? (usage.limit === -1 || usage.count < usage.limit) : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <FileText className="size-8 text-primary" />
          <div>
            <CardTitle>Gerar Relatório Financeiro com IA</CardTitle>
            <CardDescription>
              {getPeriodDescription()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {usage && (
             <Alert variant="default" className="flex items-center justify-between">
                <div className="flex items-center">
                     <Sparkles className="size-4 mr-2 text-primary" />
                     <AlertDescription>
                        Relatórios gerados este mês: <strong>{usage.count} de {usage.limit === -1 ? 'Ilimitado' : usage.limit}</strong>
                    </AlertDescription>
                </div>
                {usage.limit !== -1 && usage.count >= usage.limit && (
                    <Button variant="link" size="sm" className="p-0 h-auto text-primary">Fazer Upgrade</Button>
                )}
            </Alert>
        )}
       
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <p className="text-muted-foreground mb-4">
          Clique no botão abaixo para que nossa IA analise suas finanças no período selecionado e crie um relatório completo.
          O relatório será salvo e você poderá acessá-lo a qualquer momento em "Meus Relatórios".
        </p>
        
        <Button onClick={handleGenerateReport} disabled={loading || !canGenerate}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando e Salvando Relatório...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Gerar Relatório com IA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
