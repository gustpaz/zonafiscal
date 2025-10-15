
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getNextMonthForecast } from "@/lib/data";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";

export default function ForecastCard() {
  const { user } = useAuth();
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      getNextMonthForecast(user.uid)
        .then(({ total }) => setTotal(total))
        .catch(console.error);
    }
  }, [user]);

  if (total === null) {
    return <Skeleton className="h-[108px]" />;
  }

  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(total);

  return (
    <Link href="/forecast" className="hover:opacity-90 transition-opacity">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Previsão de Saídas</CardTitle>
          <CalendarClock className="size-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formattedValue}</div>
          <p className="text-xs text-muted-foreground">Gastos comprometidos para o próximo mês.</p>
        </CardContent>
      </Card>
    </Link>
  );
}
