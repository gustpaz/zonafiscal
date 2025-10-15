import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: number;
};

export function KpiCard({ title, value, icon, trend }: KpiCardProps) {
  // Garantir que o valor seja um número válido e arredondado
  const cleanValue = Math.round((value || 0) * 100) / 100;
  
  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cleanValue);

  const isPositive = trend >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className={cn("flex items-center", isPositive ? "text-green-500" : "text-red-500")}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {trend.toFixed(2)}%
          </span>
          em relação ao mês passado
        </p>
      </CardContent>
    </Card>
  );
}
