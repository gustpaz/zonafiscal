
import type { Transaction, FinancialSummary } from "./types";

/**
 * This file contains utility functions for processing data on the client-side.
 * These functions operate on data already fetched from the database, preventing
 * redundant server calls.
 */

export function getFinancialSummary(transactions: Transaction[]): FinancialSummary {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  });

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const yearOfPreviousMonth = currentMonth === 0 ? currentYear - 1 : currentYear;

  const previousMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === previousMonth && transactionDate.getFullYear() === yearOfPreviousMonth;
  });

  const calculateTotals = (trans: Transaction[]) => {
      let totalIncome = 0, totalExpenses = 0, businessIncome = 0, businessExpenses = 0, personalExpenses = 0;
      trans.forEach(t => {
          if (t.category.startsWith('loan')) return;
          if (t.type === 'income') {
              totalIncome += t.amount;
              if (t.category === 'business') businessIncome += t.amount;
              else if (t.category === 'mixed') businessIncome += t.amount / 2;
          } else if (t.type === 'expense') {
              totalExpenses += t.amount;
              if (t.category === 'business') businessExpenses += t.amount;
              else if (t.category === 'personal') personalExpenses += t.amount;
              else if (t.category === 'mixed') {
                  businessExpenses += t.amount / 2;
                  personalExpenses += t.amount / 2;
              }
          }
      });
      
      // Arredondar valores para evitar problemas de precisão com ponto flutuante
      return { 
        totalIncome: Math.round(totalIncome * 100) / 100, 
        totalExpenses: Math.round(totalExpenses * 100) / 100, 
        businessIncome: Math.round(businessIncome * 100) / 100, 
        businessExpenses: Math.round(businessExpenses * 100) / 100, 
        personalExpenses: Math.round(personalExpenses * 100) / 100 
      };
  }

  const currentTotals = calculateTotals(currentMonthTransactions);
  const previousTotals = calculateTotals(previousMonthTransactions);
  
  const businessProfit = Math.round((currentTotals.businessIncome - currentTotals.businessExpenses) * 100) / 100;
  const prevBusinessProfit = Math.round((previousTotals.businessIncome - previousTotals.businessExpenses) * 100) / 100;
  
  const balance = Math.round(transactions
    .filter(t => new Date(t.date) <= today && !t.category.startsWith('loan'))
    .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0) * 100) / 100;
  
  const loanBalance = Math.round(transactions.reduce((acc, t) => {
    if (t.category === 'loan_to_business') return acc + t.amount; // PF empresta para PJ (PJ deve ao PF)
    if (t.category === 'loan_to_personal') return acc - t.amount; // PJ empresta para PF (PF deve ao PJ)
    return acc;
  }, 0) * 100) / 100;

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  return {
    balance, balanceTrend: 0, // Balance trend might need more complex logic
    totalIncome: currentTotals.totalIncome, incomeTrend: calculateTrend(currentTotals.totalIncome, previousTotals.totalIncome),
    totalExpenses: currentTotals.totalExpenses, expensesTrend: calculateTrend(currentTotals.totalExpenses, previousTotals.totalExpenses),
    businessProfit: businessProfit, profitTrend: calculateTrend(businessProfit, prevBusinessProfit),
    businessIncome: currentTotals.businessIncome, businessExpenses: currentTotals.businessExpenses,
    personalExpenses: currentTotals.personalExpenses, loanBalance,
  };
}
