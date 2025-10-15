
"use client";

import { KpiCard } from "@/components/kpi-card";
import { DollarSign, TrendingUp, TrendingDown, Home, Briefcase, Combine, LandPlot, HandCoins, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpensesPieChart, MonthlyBarChart, BalanceLineChart } from "@/components/charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import AiAlert from "@/components/ai-alert";
import type { Transaction, TransactionCategory } from "@/lib/types";
import { translatePaymentMethod } from "@/lib/translate";
import DashboardHeader from "@/components/dashboard-header";
import LoanBalanceCard from "@/components/loan-balance-card";
import ViewSwitcher from "@/components/view-switcher";
import PersonalSpendingCard from "@/components/personal-spending-card";
import ForecastCard from "@/components/forecast-card";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getTransactionsAction } from "@/lib/actions";
import { getTransactionsClient } from "@/lib/client-data";
import { getFinancialSummary } from "@/lib/data-utils";
import { useSearchParams } from "next/navigation";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { getUserByIdClient } from "@/lib/client-admin-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

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

const DashboardLoadingSkeleton = () => (
    <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') as 'personal' | 'business' | undefined;

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  const fetchTransactions = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const transactionsData = await getTransactionsClient(user.uid);
        
        // Aplicar filtro de view se necessário
        let filteredData = transactionsData;
        if (view === 'business') {
          filteredData = transactionsData.filter(t => 
            ['business', 'mixed', 'loan_to_business', 'loan_to_personal'].includes(t.category)
          );
        } else if (view === 'personal') {
          filteredData = transactionsData.filter(t => 
            ['personal', 'mixed', 'loan_to_business', 'loan_to_personal'].includes(t.category)
          );
        }
        
        setAllTransactions(filteredData);
      } catch (error: any) {
        console.error("Erro ao buscar transações:", error?.message);
      } finally {
        setLoading(false);
      }
    }
  }, [user, view]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (user) {
      getUserByIdClient(user.uid).then(data => {
        setUserData(data);
      }).catch(error => {
        console.error("Erro ao buscar dados do usuário:", error);
      });
    }
  }, [user]);
  
  const handleTransactionAdd = (newTransactions: Transaction[]) => {
      setAllTransactions(prev => [...newTransactions, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const summary = useMemo(() => getFinancialSummary(allTransactions), [allTransactions]);
  const recentTransactions = useMemo(() => allTransactions.slice(0, 5), [allTransactions]);

  if (loading || !summary) {
    return <DashboardLoadingSkeleton />;
  }
  
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Dashboard">
        <ViewSwitcher />
        <AddTransactionSheet onTransactionAdded={handleTransactionAdd} />
      </DashboardHeader>
      <AiAlert summary={summary} />

      {/* Alerta de Cancelamento Pendente */}
      {userData?.subscriptionStatus === 'canceling' && userData?.subscriptionCancelAt && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900 dark:text-orange-100">
            <p className="font-semibold mb-1">
              ⏰ Sua assinatura será cancelada em breve
            </p>
            <p className="text-sm">
              Você terá acesso aos recursos premium até{' '}
              <strong>
                {new Date(userData.subscriptionCancelAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </strong>
              . Depois disso, você voltará ao plano Gratuito.
            </p>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" variant="outline" className="bg-white dark:bg-gray-900">
                <Link href="/pricing">
                  Manter Assinatura
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/settings">
                  Ver Detalhes
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Saldo Final (Hoje)"
          value={summary.balance}
          icon={<DollarSign className="size-6 text-primary" />}
          trend={summary.balanceTrend}
        />
        <KpiCard 
          title="Entradas (Mês Atual)"
          value={summary.totalIncome}
          icon={<TrendingUp className="size-6 text-green-500" />}
          trend={summary.incomeTrend}
        />
        <KpiCard 
          title="Saídas (Mês Atual)"
          value={summary.totalExpenses}
          icon={<TrendingDown className="size-6 text-red-500" />}
          trend={summary.expensesTrend}
        />
        <LoanBalanceCard balance={summary.loanBalance} />
      </div>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entradas vs. Saídas (Mês a Mês)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <MonthlyBarChart data={allTransactions} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-8">
            <PersonalSpendingCard currentSpending={summary.personalExpenses} />
            <ForecastCard />
        </div>
      </div>

       <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução do Saldo Empresarial</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <BalanceLineChart data={allTransactions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ExpensesPieChart data={allTransactions} />
          </CardContent>
        </Card>
       </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground">{translatePaymentMethod(transaction.paymentMethod)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize gap-1.5 whitespace-nowrap", categoryColors[transaction.category])}>
                          {categoryIcons[transaction.category]}
                          <span>{categoryLabels[transaction.category]}</span>
                        </Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      transaction.type === "income" ? "text-green-500" : "text-red-500"
                    )}>
                      {transaction.type === "income" ? "+" : "-"} {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(transaction.amount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(transaction.date).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
