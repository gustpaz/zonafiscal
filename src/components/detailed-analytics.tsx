
"use client";

import { useEffect, useState, useTransition } from "react";
import { getAnalyticsData } from "@/lib/data";
import type { AnalyticsData } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Briefcase } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSearchParams } from 'next/navigation';
import { Skeleton } from "./ui/skeleton";
import { subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/use-auth";

const formatCurrency = (value: number) => {
  const cleanValue = Math.round((value || 0) * 100) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cleanValue);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-card p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-sm text-muted-foreground">{label}</span>
            {payload.map((entry: any, index: number) => (
              <span key={`item-${index}`} className="font-bold" style={{ color: entry.color }}>
                {entry.name}: {formatCurrency(entry.value || 0)}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const categoryLabels: Record<string, string> = {
    personal: 'Pessoal',
    business: 'Empresarial',
    mixed: 'Misto',
    loan_to_business: 'Empréstimo (Empresa)',
    loan_to_personal: 'Empréstimo (Pessoal)',
};

const LoadingSkeleton = () => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-80" /></CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-80" /></CardContent>
            </Card>
        </div>
    </div>
);


export default function DetailedAnalytics() {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isPending, startTransition] = useTransition();
    const searchParams = useSearchParams();
    
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    useEffect(() => {
        if (user) {
            startTransition(async () => {
                const dateRange: DateRange = {
                    from: fromParam ? new Date(fromParam) : subDays(new Date(), 30),
                    to: toParam ? new Date(toParam) : new Date(),
                };
                const result = await getAnalyticsData(user.uid, dateRange);
                setData(result);
            });
        }
    }, [fromParam, toParam, user]);
    
    if (isPending || !data) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Receita Bruta</CardTitle>
                        <TrendingUp className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{formatCurrency(data.totalIncome)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
                        <TrendingDown className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{formatCurrency(data.totalExpenses)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Lucro Líquido (Negócio)</CardTitle>
                        <Briefcase className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.businessNetProfit)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Gastos Pessoais</CardTitle>
                        <DollarSign className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.personalSpending)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Análise por Categoria</CardTitle>
                        <CardDescription>Entradas e saídas agrupadas por categoria no período.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="text-right">Entradas</TableHead>
                                    <TableHead className="text-right">Saídas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(data.categoryBreakdown).map(([category, values]) => (
                                    <TableRow key={category}>
                                        <TableCell className="font-medium">{categoryLabels[category] || category}</TableCell>
                                        <TableCell className="text-right text-green-500">{formatCurrency(values.income)}</TableCell>
                                        <TableCell className="text-right text-red-500">{formatCurrency(values.expenses)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Tendência de Lucro (Mês a Mês)</CardTitle>
                        <CardDescription>Lucro líquido do negócio ao longo do período.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.monthlyProfitTrend}>
                                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="profit" fill="hsl(var(--primary))" name="Lucro" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
