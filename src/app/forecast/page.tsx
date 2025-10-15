
"use client";

import { useEffect, useState } from "react";
import { getNextMonthForecast } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionCategory } from "@/lib/types";
import { Home, Briefcase, Combine, LandPlot, HandCoins, Loader2 } from "lucide-react";
import { translatePaymentMethod } from "@/lib/translate";
import DashboardHeader from "@/components/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { FeatureLockedScreen } from "@/components/feature-locked-screen";

export default function ForecastPage() {
  const { user } = useAuth();
  const { canUseForecast, loading: planLoading } = usePlanFeatures();
  const [forecast, setForecast] = useState<{ total: number, transactions: Transaction[] } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      setLoading(true);
      getNextMonthForecast(user.uid)
        .then(setForecast)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const nextMonthName = format(new Date(), "MMMM", { locale: ptBR });

  const categoryIcons: Record<TransactionCategory, React.ReactNode> = {
    personal: <Home className="size-4" />,
    business: <Briefcase className="size-4" />,
    mixed: <Combine className="size-4" />,
    loan_to_business: <HandCoins className="size-4" />,
    loan_to_personal: <LandPlot className="size-4" />,
  };

  const categoryColors: Record<TransactionCategory, string> = {
    personal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    business: "bg-green-500/10 text-green-400 border-green-500/20",
    mixed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    loan_to_business: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    loan_to_personal: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };

  const categoryLabels: Record<TransactionCategory, string> = {
    personal: 'Pessoal',
    business: 'Empresarial',
    mixed: 'Misto',
    loan_to_business: 'Aporte (Empréstimo)',
    loan_to_personal: 'Retirada (Empréstimo)',
  };
  
  if (planLoading || loading) {
    return (
        <div className="flex h-full w-full items-center justify-center p-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!canUseForecast) {
    return (
      <FeatureLockedScreen 
        featureName="Previsão de Despesas"
        description="Desbloqueie e antecipe suas despesas futuras com previsões inteligentes!"
        icon={CalendarClock}
        benefits={[
          {
            title: "Previsão Automática",
            description: "Sistema prevê gastos futuros baseado em suas transações"
          },
          {
            title: "Controle de Parcelas",
            description: "Acompanhe todas as parcelas a vencer"
          },
          {
            title: "Planejamento Financeiro",
            description: "Saiba exatamente quanto terá que pagar no próximo mês"
          },
          {
            title: "Evite Surpresas",
            description: "Nunca mais seja pego desprevenido por contas"
          },
          {
            title: "Alertas Inteligentes",
            description: "Receba notificações de vencimentos importantes"
          },
          {
            title: "Visão de Longo Prazo",
            description: "Planeje seus gastos com meses de antecedência"
          }
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Previsão de Gastos" />

      <Card>
        <CardHeader>
          <CardTitle>Despesas para o Próximo Mês ({nextMonthName})</CardTitle>
          <CardDescription>
            Total de gastos já comprometidos: <span className="font-bold text-red-500">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(forecast?.total || 0)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data de Vencimento</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecast && forecast.transactions.length > 0 ? (
                forecast.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize gap-1.5", categoryColors[transaction.category])}>
                        {categoryIcons[transaction.category]}
                        <span>{categoryLabels[transaction.category]}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(transaction.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="capitalize">
                      {translatePaymentMethod(transaction.paymentMethod)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-500">
                      - {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        Nenhuma despesa prevista para o próximo mês.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
