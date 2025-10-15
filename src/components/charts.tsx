"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Cell } from "recharts";
import type { Transaction } from "@/lib/types";
import { useMemo } from "react";

const formatCurrency = (value: number) => {
  const cleanValue = Math.round((value || 0) * 100) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cleanValue);
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


// Expenses Pie Chart
export function ExpensesPieChart({ data }: { data: Transaction[] }) {
  const chartData = useMemo(() => {
    const expenses = data.filter((t) => t.type === "expense");
    const categoryTotals = expenses.reduce((acc, t) => {
      let { category, amount } = t;
      if (category === 'mixed') {
        acc['personal'] = (acc['personal'] || 0) + amount / 2;
        acc['business'] = (acc['business'] || 0) + amount / 2;
      } else if (category === 'personal' || category === 'business') {
        acc[category] = (acc[category] || 0) + amount;
      }
      return acc;
    }, {} as Record<string, number>);

    return [
        { name: "Pessoal", value: Math.round((categoryTotals.personal || 0) * 100) / 100, fill: "hsl(var(--chart-1))" },
        { name: "Empresarial", value: Math.round((categoryTotals.business || 0) * 100) / 100, fill: "hsl(var(--chart-2))" },
    ];
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(value: number) => formatCurrency(value)} />
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => formatCurrency(entry.value)}>
            {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
        </Pie>
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Monthly Bar Chart
export function MonthlyBarChart({ data }: { data: Transaction[] }) {
  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { income: number; expense: number; date: Date } } = {};
    data.forEach(t => {
      const transactionDate = new Date(t.date);
      const month = transactionDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0, date: new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1) };
      }
      if (t.category !== 'loan_to_business' && t.category !== 'loan_to_personal') {
          monthlyData[month][t.type] += t.amount;
      }
    });

    return Object.entries(monthlyData)
      .map(([name, values]) => ({ 
        name, 
        income: Math.round(values.income * 100) / 100,
        expense: Math.round(values.expense * 100) / 100,
        date: values.date 
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Entradas" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="hsl(var(--chart-2))" name="Saídas" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Balance Line Chart
export function BalanceLineChart({ data }: { data: Transaction[] }) {
    const chartData = useMemo(() => {
        const sortedTransactions = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let businessBalance = 0;
        const balanceOverTime: { [key: string]: number } = {};

        sortedTransactions.forEach(t => {
            if (t.category === 'business') {
                businessBalance += t.type === 'income' ? t.amount : -t.amount;
            } else if (t.category === 'mixed') {
                businessBalance += t.type === 'income' ? (t.amount / 2) : -(t.amount / 2);
            }
            const dateStr = new Date(t.date).toLocaleDateString('pt-BR');
            balanceOverTime[dateStr] = businessBalance;
        });

        return Object.entries(balanceOverTime).map(([date, balance]) => ({ 
          date, 
          balance: Math.round(balance * 100) / 100 
        }));
    }, [data]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tickLine={false} axisLine={false}/>
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value || 0)} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="balance" name="Saldo Empresarial" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}
