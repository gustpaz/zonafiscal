
"use client"
import { KpiCard } from "@/components/kpi-card";
import { DollarSign, TrendingUp, TrendingDown, Home, Briefcase, Combine, LandPlot, HandCoins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { TransactionCategory } from "@/lib/types";
import DashboardHeader from "@/components/dashboard-header";
import LoanBalanceCard from "@/components/loan-balance-card";
import ViewSwitcher from "@/components/view-switcher";

// This is no longer a page, but a client component that can be used in other pages
// The data fetching logic will be moved to a server component page.
// For now, this component is not used and can be removed later.
// We are keeping it to avoid breaking changes in other parts of the app that might reference it.
// The new page is at src/app/dashboard/page.tsx
export default function DashboardComponent() {
    return <div>This component is deprecated. Please use the page at /dashboard.</div>
}
