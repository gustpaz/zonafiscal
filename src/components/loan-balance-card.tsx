"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, Landmark, User } from "lucide-react";

interface LoanBalanceCardProps {
  balance: number;
}

export default function LoanBalanceCard({ balance }: LoanBalanceCardProps) {
  const cleanBalance = Math.round((balance || 0) * 100) / 100;
  const formattedBalance = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(cleanBalance));
  
  const whoOwes = balance > 0 ? "A Empresa deve a Você" : "Você deve à Empresa";
  const colorClass = balance > 0 ? "text-yellow-400" : "text-orange-400";
  const icon = balance > 0 
    ? <div className="flex items-center gap-1"><Landmark className="size-4" /> → <User className="size-4" /></div> 
    : <div className="flex items-center gap-1"><User className="size-4" /> → <Landmark className="size-4" /></div>;

  if (balance === 0) {
      return (
        <Card className="flex h-full flex-col justify-center bg-green-500/10 border-green-500/20">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Balanço de Empréstimos</CardTitle>
                    <Handshake className="size-6 text-green-400" />
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-green-400">R$ 0,00</p>
                <CardDescription className="text-green-400/80">
                    Não há empréstimos pendentes.
                </CardDescription>
            </CardContent>
        </Card>
      )
  }

  return (
    <Card className="flex h-full flex-col justify-center">
        <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                 <CardTitle className="text-lg">Balanço de Empréstimos</CardTitle>
                 <Handshake className="size-6 text-primary" />
            </div>
        </CardHeader>
        <CardContent>
            <p className={`text-2xl font-bold ${colorClass}`}>{formattedBalance}</p>
            <CardDescription className="flex items-center gap-2 font-medium">
                {icon}
                <span>{whoOwes}</span>
            </CardDescription>
        </CardContent>
    </Card>
  );
}
