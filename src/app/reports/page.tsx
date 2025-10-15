import DashboardHeader from "@/components/dashboard-header";
import AiFinancialAdvice from "@/components/ai-financial-advice";
import GenerateReport from "@/components/generate-report";
import DetailedAnalytics from "@/components/detailed-analytics";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Análise Detalhada">
         <Link href="/meus-relatorios">
           <Button variant="outline">
             <History className="mr-2 h-4 w-4" />
             Meus Relatórios
           </Button>
         </Link>
         <DateRangePicker />
      </DashboardHeader>

      <DetailedAnalytics />
      
      <Card>
        <CardContent className="pt-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <AiFinancialAdvice />
            <GenerateReport />
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
