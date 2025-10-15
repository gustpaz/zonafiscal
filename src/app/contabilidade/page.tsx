"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getTransactionsClient } from "@/lib/client-data";
import { getUsageStatusClient } from "@/lib/client-admin-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, Download, AlertTriangle, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import DashboardHeader from "@/components/dashboard-header";
import type { Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { FeatureLockedScreen } from "@/components/feature-locked-screen";
import { Calculator } from "lucide-react";

interface DREData {
  receitasOperacionais: number;
  custosOperacionais: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
  // Dados adicionais para o contador
  receitasPessoais: number;
  despesasPessoais: number;
  emprestimosPFParaPJ: number;
  emprestimosPJParaPF: number;
  totalTransacoes: number;
}

export default function ContabilidadePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canUseAccountingReports, loading: planLoading } = usePlanFeatures();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1)); // 1º de janeiro
  const [endDate, setEndDate] = useState<Date | undefined>(new Date()); // Hoje
  const [dreData, setDreData] = useState<DREData | null>(null);

  useEffect(() => {
    if (user) {
      checkAccess();
      loadTransactions();
    }
  }, [user]);

  const checkAccess = async () => {
    try {
      const usageStatus = await getUsageStatusClient(user!.uid);
      
      // Verificar se o usuário tem acesso aos relatórios contábeis
      // Agora verifica dinamicamente baseado na configuração do admin
      if (usageStatus?.plan?.features?.accountingReports === true) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Erro ao verificar acesso:", error);
      setHasAccess(false);
    }
  };

  useEffect(() => {
    if (transactions.length > 0 && startDate && endDate) {
      calculateDRE();
    }
  }, [transactions, startDate, endDate]);

  const loadTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await getTransactionsClient(user.uid);
      setTransactions(data);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDRE = () => {
    if (!startDate || !endDate) return;

    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });


    // Receitas operacionais (entradas business + mixed)
    const receitasOperacionais = filteredTransactions
      .filter(t => t.type === 'income' && (t.category === 'business' || t.category === 'mixed'))
      .reduce((sum, t) => sum + (t.category === 'mixed' ? (t.amount || 0) / 2 : (t.amount || 0)), 0);

    // Receitas pessoais (personal + metade das mixed)
    const receitasPessoais = filteredTransactions
      .filter(t => t.type === 'income' && (t.category === 'personal' || t.category === 'mixed'))
      .reduce((sum, t) => sum + (t.category === 'mixed' ? (t.amount || 0) / 2 : (t.amount || 0)), 0);

    // Custos operacionais (despesas business + metade das mixed)
    const custosOperacionais = filteredTransactions
      .filter(t => t.type === 'expense' && (t.category === 'business' || t.category === 'mixed'))
      .reduce((sum, t) => sum + (t.category === 'mixed' ? (t.amount || 0) / 2 : (t.amount || 0)), 0);

    // Despesas pessoais (personal + metade das mixed)
    const despesasPessoais = filteredTransactions
      .filter(t => t.type === 'expense' && (t.category === 'personal' || t.category === 'mixed'))
      .reduce((sum, t) => sum + (t.category === 'mixed' ? (t.amount || 0) / 2 : (t.amount || 0)), 0);

    // Despesas operacionais (despesas pessoais que afetam o negócio)
    const despesasOperacionais = filteredTransactions
      .filter(t => t.type === 'expense' && t.category === 'personal' && t.paymentSource === 'business')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Empréstimos PF para PJ
    const emprestimosPFParaPJ = filteredTransactions
      .filter(t => t.category === 'loan_to_business')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Empréstimos PJ para PF
    const emprestimosPJParaPF = filteredTransactions
      .filter(t => t.category === 'loan_to_personal')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Resultado operacional
    const resultadoOperacional = receitasOperacionais - custosOperacionais - despesasOperacionais;


    // Garantir que todos os valores sejam números válidos
    const dreData = {
      receitasOperacionais: Math.round((Number(receitasOperacionais) || 0) * 100) / 100,
      custosOperacionais: Math.round((Number(custosOperacionais) || 0) * 100) / 100,
      despesasOperacionais: Math.round((Number(despesasOperacionais) || 0) * 100) / 100,
      resultadoOperacional: Math.round((Number(resultadoOperacional) || 0) * 100) / 100,
      receitasPessoais: Math.round((Number(receitasPessoais) || 0) * 100) / 100,
      despesasPessoais: Math.round((Number(despesasPessoais) || 0) * 100) / 100,
      emprestimosPFParaPJ: Math.round((Number(emprestimosPFParaPJ) || 0) * 100) / 100,
      emprestimosPJParaPF: Math.round((Number(emprestimosPJParaPF) || 0) * 100) / 100,
      totalTransacoes: filteredTransactions.length || 0
    };

    setDreData(dreData);
  };

  const formatCurrency = (value: number) => {
    const cleanValue = Math.round((value || 0) * 100) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cleanValue);
  };

  const exportDRE = () => {
    if (!dreData || !startDate || !endDate) return;

    const csvContent = `RELATÓRIO CONTÁBIL - Zona Fiscal
Período: ${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} a ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
Total de Transações: ${dreData.totalTransacoes}

=== DADOS PARA CONTABILIDADE ===

RECEITAS:
Receitas Operacionais (PJ),${formatCurrency(dreData.receitasOperacionais)}
Receitas Pessoais (PF),${formatCurrency(dreData.receitasPessoais)}

DESPESAS:
Custos Operacionais (PJ),${formatCurrency(dreData.custosOperacionais)}
Despesas Pessoais (PF),${formatCurrency(dreData.despesasPessoais)}
Despesas Pessoais Pagas pelo PJ,${formatCurrency(dreData.despesasOperacionais)}

EMPRÉSTIMOS:
Empréstimos PF para PJ,${formatCurrency(dreData.emprestimosPFParaPJ)}
Empréstimos PJ para PF,${formatCurrency(dreData.emprestimosPJParaPF)}

RESULTADO:
Resultado Operacional PJ,${formatCurrency(dreData.resultadoOperacional)}

=== OBSERVAÇÕES PARA O CONTADOR ===
- Este relatório é baseado nas transações registradas no sistema
- Deduções de impostos, despesas financeiras e provisões devem ser adicionadas pelo contador
- Empréstimos entre PF e PJ devem ser tratados conforme legislação vigente
- Recomenda-se conciliar com extratos bancários e documentos fiscais`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio-Contabil-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading || hasAccess === null || planLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="text-center">
          <FileText className="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando dados contábeis...</p>
        </div>
      </div>
    );
  }

  if (!canUseAccountingReports) {
    return (
      <FeatureLockedScreen 
        featureName="Relatórios Contábeis"
        description="Desbloqueie relatórios profissionais para facilitar o trabalho do seu contador!"
        icon={Calculator}
        benefits={[
          {
            title: "DRE Automática",
            description: "Demonstração do Resultado do Exercício gerada automaticamente"
          },
          {
            title: "Separação PJ/PF",
            description: "Dados organizados para pessoa jurídica e física"
          },
          {
            title: "Exportação CSV",
            description: "Envie dados diretamente para seu contador"
          },
          {
            title: "Controle de Empréstimos",
            description: "Acompanhe aportes e retiradas entre PJ e PF"
          },
          {
            title: "Filtros Personalizados",
            description: "Gere relatórios para períodos específicos"
          },
          {
            title: "Economia de Tempo",
            description: "Reduza horas de trabalho do contador e economize dinheiro"
          }
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Relatórios Contábeis">
        <p className="text-sm text-muted-foreground">
          Demonstração do Resultado do Exercício (DRE)
        </p>
      </DashboardHeader>

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle>Período de Análise</CardTitle>
          <CardDescription>
            Selecione o período para geração do DRE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DRE */}
      {dreData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Relatório Contábil - Dados do Sistema</CardTitle>
                <CardDescription>
                  Período: {format(startDate!, 'dd/MM/yyyy', { locale: ptBR })} a {format(endDate!, 'dd/MM/yyyy', { locale: ptBR })} • {dreData.totalTransacoes} transações
                </CardDescription>
              </div>
              <Button onClick={exportDRE} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Receitas */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-green-700 mb-3">RECEITAS</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Receitas Operacionais (PJ)</span>
                    <span className="font-mono text-green-600">{formatCurrency(dreData.receitasOperacionais)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Receitas Pessoais (PF)</span>
                    <span className="font-mono text-green-600">{formatCurrency(dreData.receitasPessoais)}</span>
                  </div>
                </div>
              </div>

              {/* Despesas */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-semibold text-red-700 mb-3">DESPESAS</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Custos Operacionais (PJ)</span>
                    <span className="font-mono text-red-600">{formatCurrency(dreData.custosOperacionais)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Despesas Pessoais (PF)</span>
                    <span className="font-mono text-red-600">{formatCurrency(dreData.despesasPessoais)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Despesas Pessoais Pagas pelo PJ</span>
                    <span className="font-mono text-red-600">{formatCurrency(dreData.despesasOperacionais)}</span>
                  </div>
                </div>
              </div>

              {/* Empréstimos */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-blue-700 mb-3">EMPRÉSTIMOS</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Empréstimos PF para PJ</span>
                    <span className="font-mono text-blue-600">{formatCurrency(dreData.emprestimosPFParaPJ)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Empréstimos PJ para PF</span>
                    <span className="font-mono text-blue-600">{formatCurrency(dreData.emprestimosPJParaPF)}</span>
                  </div>
                </div>
              </div>

              {/* Resultado */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-purple-700 mb-3">RESULTADO</h3>
                <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
                  <span>Resultado Operacional PJ</span>
                  <span className={`font-mono text-lg ${dreData.resultadoOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dreData.resultadoOperacional)}
                  </span>
                </div>
              </div>

              {/* Observações */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">📋 Observações para o Contador</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• <strong>Deduções de impostos</strong> devem ser adicionadas pelo contador</li>
                  <li>• <strong>Despesas financeiras</strong> (juros, taxas bancárias) devem ser incluídas</li>
                  <li>• <strong>Provisões</strong> (IR, CSLL, etc.) devem ser calculadas pelo contador</li>
                  <li>• <strong>Empréstimos PF/PJ</strong> devem ser tratados conforme legislação vigente</li>
                  <li>• <strong>Recomenda-se conciliar</strong> com extratos bancários e documentos fiscais</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!dreData && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Selecione um período para visualizar o DRE</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
