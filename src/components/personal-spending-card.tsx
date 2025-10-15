
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "./ui/skeleton";

interface PersonalSpendingCardProps {
  currentSpending: number;
}

const formatCurrency = (value: number) => {
  const cleanValue = Math.round((value || 0) * 100) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cleanValue);
};

export default function PersonalSpendingCard({ currentSpending }: PersonalSpendingCardProps) {
  const [spendingLimit, setSpendingLimit] = useState<number | null>(null);

  useEffect(() => {
    // localStorage is only available on the client side.
    const limit = localStorage.getItem("spendingLimit");
    setSpendingLimit(Number(limit) || 2000); // Default to 2000 if not set
  }, []);

  if (spendingLimit === null) {
      return <Skeleton className="h-28" />;
  }

  const progress = (currentSpending / spendingLimit) * 100;
  const remaining = spendingLimit - currentSpending;
  const isOverBudget = progress > 100;

  return (
    <Link href="/settings" className="hover:opacity-90 transition-opacity">
      <Card className={isOverBudget ? "border-red-500/50 bg-red-500/10" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gastos Pessoais (Mês)</CardTitle>
          <Wallet className="size-6 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
            <div className="flex justify-between items-baseline">
                <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-500' : ''}`}>{formatCurrency(currentSpending)}</p>
                <p className="text-xs text-muted-foreground">de {formatCurrency(spendingLimit)}</p>
            </div>
            <Progress value={progress > 100 ? 100 : progress} className={isOverBudget ? "[&>div]:bg-red-500" : ""} />
            <p className={`text-xs ${isOverBudget ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                {isOverBudget 
                    ? `Você ultrapassou ${formatCurrency(Math.abs(remaining))}`
                    : `Restam ${formatCurrency(remaining)}`
                }
            </p>
        </CardContent>
      </Card>
    </Link>
  );
}
