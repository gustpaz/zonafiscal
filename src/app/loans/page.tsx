
"use client";

import DashboardHeader from "@/components/dashboard-header";
import LoanBalanceCard from "@/components/loan-balance-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTransactionsAction } from "@/lib/actions";
import { getTransactionsClient } from "@/lib/client-data";
import { cn } from "@/lib/utils";
import { HandCoins, LandPlot, ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import type { FinancialSummary, Transaction } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { getFinancialSummary } from "@/lib/data-utils";

export default function LoansPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    
    const [dateRange, setDateRange] = useState<DateRange>({
        from: subDays(new Date(), 90),
        to: new Date(),
    });

    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        setDateRange({
            from: fromParam ? new Date(fromParam) : subDays(new Date(), 90),
            to: toParam ? new Date(toParam) : new Date(),
        });

        if (user) {
            setLoading(true);
            getTransactionsClient(user.uid)
                .then(setAllTransactions)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [user, searchParams]);

    const summary = useMemo(() => getFinancialSummary(allTransactions), [allTransactions]);

    const loanTransactions = useMemo(() => {
        return allTransactions
            .filter(t => {
                const isLoan = t.category === 'loan_to_business' || t.category === 'loan_to_personal';
                if (!isLoan) return false;
                const transactionDate = new Date(t.date);
                return transactionDate >= (dateRange.from ?? new Date(0)) && transactionDate <= (dateRange.to ?? new Date());
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions, dateRange]);

    const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    const periodTotals = useMemo(() => loanTransactions.reduce((acc, t) => {
        if (t.category === 'loan_to_business') {
            acc.aportes += t.amount;
        } else if (t.category === 'loan_to_personal') {
            acc.retiradas += t.amount;
        }
        return acc;
    }, { aportes: 0, retiradas: 0 }), [loanTransactions]);

    const periodBalance = periodTotals.aportes - periodTotals.retiradas;
    
    if (loading || !summary) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <DashboardHeader title="Gestão de Empréstimos (PF x PJ)">
                 <DateRangePicker />
            </DashboardHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-1">
                    <LoanBalanceCard balance={summary.loanBalance} />
                 </div>
                 <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total de Aportes</CardTitle>
                            <ArrowUp className="size-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{formatCurrency(periodTotals.aportes)}</div>
                            <p className="text-xs text-muted-foreground">no período selecionado</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total de Retiradas</CardTitle>
                            <ArrowDown className="size-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{formatCurrency(periodTotals.retiradas)}</div>
                             <p className="text-xs text-muted-foreground">no período selecionado</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Balanço no Período</CardTitle>
                             <div className={cn("size-4", periodBalance >= 0 ? 'text-green-500' : 'text-red-500')}>
                                {periodBalance >= 0 ? <ArrowUp /> : <ArrowDown />}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold", periodBalance >= 0 ? 'text-green-500' : 'text-red-500')}>{formatCurrency(periodBalance)}</div>
                            <p className="text-xs text-muted-foreground">{periodBalance >= 0 ? 'Mais aportes que retiradas' : 'Mais retiradas que aportes'}</p>
                        </CardContent>
                    </Card>
                 </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Movimentações</CardTitle>
                    <CardDescription>
                        Todas as transações de aporte e retirada registradas no período selecionado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loanTransactions.length > 0 ? (
                                    loanTransactions.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell className="font-medium">{t.description}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {t.category === 'loan_to_business' ? (
                                                        <>
                                                            <HandCoins className="size-4 text-yellow-400" />
                                                            <span className="text-yellow-400 whitespace-nowrap">Aporte (PF → PJ)</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LandPlot className="size-4 text-orange-400" />
                                                            <span className="text-orange-400 whitespace-nowrap">Retirada (PJ → PF)</span>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">{new Date(t.date).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell className={cn(
                                                "text-right font-medium",
                                                t.category === 'loan_to_business' ? 'text-green-500' : 'text-red-500'
                                            )}>
                                                {formatCurrency(t.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            Nenhuma movimentação de empréstimo registrada no período selecionado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
