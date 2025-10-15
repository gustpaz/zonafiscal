
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight, Table, Columns, Sparkles, Loader2, Lock, Crown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import type { Transaction, TransactionCategory } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table as ShadTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Label } from "./ui/label";
import { suggestCategoryAction } from "@/lib/actions";
import { checkBatchDuplicates, getImportPeriodInfo } from "@/lib/import-transactions-utils";
import { createImportBatch } from "@/lib/import-history";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "./ui/badge";
import { fetchWithAuth } from "@/lib/auth-token";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

type WizardStep = "upload" | "map-columns" | "review";

type ParsedTransaction = {
  [key: string]: string;
};

type MappedTransaction = Omit<Transaction, 'id' | 'userId' | 'paymentType' | 'paymentSource'> & {
    originalData: any;
    isIgnored: boolean;
    isDuplicate?: boolean;
    duplicateReason?: string;
};

const REQUIRED_FIELDS: (keyof Transaction)[] = ["date", "description", "amount"];

const FIELD_LABELS: Record<string, string> = {
  'date': 'Data',
  'description': 'Descrição',
  'amount': 'Valor',
  'type': 'Tipo',
  'category': 'Categoria',
  'paymentMethod': 'Método de Pagamento',
  'notes': 'Observações',
};

// Função auxiliar para fazer parse de datas em vários formatos
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  try {
    // Tentar formato DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Mês é 0-indexed
        const year = parseInt(parts[2]);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
    
    // Tentar formato YYYY-MM-DD
    if (dateStr.includes('-')) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    // Tentar parse direto
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    // Se tudo falhar, usar data atual
    console.warn('Formato de data inválido:', dateStr);
    return new Date().toISOString();
  } catch (error) {
    console.error('Erro ao fazer parse de data:', dateStr, error);
    return new Date().toISOString();
  }
}

// Função auxiliar para fazer parse de valores monetários
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  try {
    // Remover símbolos e espaços
    let cleanStr = amountStr.trim()
      .replace(/R\$/g, '')
      .replace(/\s/g, '');
    
    // Detectar se usa vírgula como separador decimal (formato BR)
    // Ex: 1.234,56 ou 6.000,00
    const hasComma = cleanStr.includes(',');
    const hasDot = cleanStr.includes('.');
    
    if (hasComma && hasDot) {
      // Formato: 1.234,56 (BR) - ponto é milhar, vírgula é decimal
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
      // Formato: 1234,56 (BR) - vírgula é decimal
      cleanStr = cleanStr.replace(',', '.');
    } else if (!hasComma && hasDot) {
      // Formato: 1234.56 (US) ou 1.234 (pode ser milhar ou decimal)
      const parts = cleanStr.split('.');
      if (parts.length === 2 && parts[1].length === 2) {
        // Provavelmente é decimal: 1234.56
        // Deixa como está
      } else if (parts.length === 2 && parts[1].length === 3) {
        // Provavelmente é milhar: 1.234
        cleanStr = cleanStr.replace(/\./g, '');
      }
    }
    
    const value = parseFloat(cleanStr);
    
    if (isNaN(value)) {
      console.warn('Valor inválido:', amountStr);
      return 0;
    }
    
    // Detectar se o valor está em centavos
    // Se o valor for muito alto (> 1 milhão), provavelmente está em centavos
    if (value > 1000000) {
      return Math.round((value / 100) * 100) / 100; // Converter de centavos para reais e arredondar
    }
    
    return Math.round(value * 100) / 100; // Arredondar para 2 casas decimais
  } catch (error) {
    console.error('Erro ao fazer parse de valor:', amountStr, error);
    return 0;
  }
}

export default function ImportWizard() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [mappedData, setMappedData] = useState<MappedTransaction[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<keyof Transaction, string>>({} as any);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [periodInfo, setPeriodInfo] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { canImportCSV, loading: planLoading } = usePlanFeatures();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileType !== "csv") {
        toast({
          title: "Formato Inválido",
          description: "Apenas arquivos .csv são suportados.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const processCsv = () => {
     if (!file) return;
     Papa.parse<ParsedTransaction>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setParsedData(results.data);
        setStep("map-columns");
        setIsProcessing(false);
      },
      error: (error) => {
        toast({
            title: "Erro ao ler arquivo CSV",
            description: "Não foi possível processar o arquivo.",
            variant: "destructive",
        });
        setIsProcessing(false);
      }
    });
  }
  
  const handleUpload = () => {
    if (!file) return;
    setIsProcessing(true);
    processCsv();
  };

  const handleMapColumns = async () => {
      const isMappingValid = REQUIRED_FIELDS.every(field => !!columnMapping[field]);
      if (!isMappingValid) {
          toast({
              title: "Mapeamento Incompleto",
              description: "Por favor, mapeie as colunas de Data, Descrição e Valor.",
              variant: "destructive"
          });
          return;
      }
      
      setIsCheckingDuplicates(true);
      
      const data = parsedData.map(row => {
          const dateStr = row[columnMapping.date];
          const amountStr = row[columnMapping.amount];
          const amount = parseAmount(amountStr);

          return {
              date: parseDate(dateStr),
              description: row[columnMapping.description] || "Sem descrição",
              amount: Math.abs(amount),
              type: amount >= 0 ? 'income' : 'expense' as 'income' | 'expense',
              category: 'mixed' as TransactionCategory,
              paymentMethod: 'transfer' as const,
              originalData: row,
              isIgnored: false,
              isDuplicate: false,
              duplicateReason: undefined,
          } as MappedTransaction
      });

      // Calcular informações do período
      const period = getImportPeriodInfo(data);
      setPeriodInfo(period);

      // Verificar duplicatas se o usuário estiver logado
      if (user) {
        try {
          const transactionsToCheck = data.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
          }));

          const duplicatesMap = await checkBatchDuplicates(user.uid, transactionsToCheck);
          
          // Marcar duplicatas
          let duplicateCount = 0;
          duplicatesMap.forEach((matches, index) => {
            if (matches.length > 0) {
              data[index].isDuplicate = true;
              data[index].isIgnored = true; // Auto-ignorar duplicatas
              data[index].duplicateReason = `Encontrada ${matches.length} transação(ões) similar(es)`;
              duplicateCount++;
            }
          });

          if (duplicateCount > 0) {
            toast({
              title: "Duplicatas Detectadas",
              description: `${duplicateCount} transação(ões) já existe(m) no sistema e foram marcadas para ignorar.`,
              variant: "default",
            });
          }
        } catch (error) {
          console.error('Erro ao verificar duplicatas:', error);
          // Continua mesmo se falhar
        }
      }

      setMappedData(data);
      setIsCheckingDuplicates(false);
      setStep("review");
  }
  
  const handleCategoryChange = (index: number, category: TransactionCategory) => {
      const newData = [...mappedData];
      newData[index].category = category;
      setMappedData(newData);
  }

  const handleGetSuggestion = async (index: number) => {
      const newData = [...mappedData];
      const description = newData[index].description;
      const result = await suggestCategoryAction({ description });
      if (result) {
          newData[index].category = result.category as TransactionCategory;
          setMappedData(newData);
          toast({ title: "Sugestão Aplicada!", description: result.reason });
      }
  }

  const handleIgnoreChange = (index: number, isIgnored: boolean) => {
    const newData = [...mappedData];
    newData[index].isIgnored = isIgnored;
    setMappedData(newData);
  }

  const handleFinalImport = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    const transactionsToImport = mappedData
        .filter(t => !t.isIgnored)
        .map(t => {
            // Remove 'originalData' and 'isIgnored' before sending to action
            const { originalData, isIgnored, isDuplicate, duplicateReason, ...finalTransaction } = t;
            return {
                ...finalTransaction,
                // Set default values for new fields
                paymentSource: 'personal' as const, 
                paymentType: 'avista' as const,
                installments: 1,
                currentInstallment: 1,
            };
        });
    
    // Usar API ao invés de Server Action para evitar problemas de permissão
    try {
      const response = await fetchWithAuth('/api/import-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: transactionsToImport }),
      });

      const result = await response.json();

      if (result.success && result.transactionIds) {
        // Registrar o batch de importação para permitir desfazer
        try {
          const duplicatesCount = mappedData.filter(t => t.isDuplicate).length;
          await createImportBatch(
            user!.uid,
            file!.name,
            result.count!,
            duplicatesCount,
            {
              startDate: periodInfo.startDate.toISOString(),
              endDate: periodInfo.endDate.toISOString(),
              monthYear: periodInfo.monthYear,
            },
            result.transactionIds
          );
        } catch (error) {
          console.error('Erro ao registrar batch de importação:', error);
          // Continua mesmo se falhar o registro
        }

        toast({
            title: "Importação Concluída!",
            description: `${result.count} transações foram importadas com sucesso. Você pode desfazer esta importação em "Histórico de Importações".`
        });
        // Reset state
        setStep('upload');
        setFile(null);
        setParsedData([]);
        setMappedData([]);
        setColumnMapping({} as any);
        setPeriodInfo(null);
      } else {
        toast({ title: "Erro na Importação", description: result.error || 'Erro desconhecido', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast({ 
        title: "Erro na Importação", 
        description: error.message || 'Erro ao processar importação', 
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const progressValue =
    step === "upload" ? 25 : step === "map-columns" ? 50 : 100;

  // Verificar se o usuário tem acesso à importação CSV
  if (planLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin" />
        <span className="ml-2">Verificando permissões...</span>
      </div>
    );
  }

  if (!canImportCSV) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950 dark:to-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-amber-900 dark:text-amber-100">
              <div className="rounded-full bg-amber-200 p-2 dark:bg-amber-800">
                <Lock className="size-6" />
              </div>
              Importação de CSV
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300 text-base">
              Desbloqueie esta funcionalidade premium e economize horas de trabalho!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Banner de Upgrade */}
              <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 p-6 dark:border-amber-700 dark:from-amber-900 dark:to-orange-900">
                <div className="flex items-center gap-3 mb-4">
                  <Crown className="size-8 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h3 className="font-bold text-lg text-amber-900 dark:text-amber-100">
                      Funcionalidade Premium
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Disponível em todos os planos pagos
                    </p>
                  </div>
                </div>
                <p className="text-amber-800 dark:text-amber-200 mb-4">
                  Com a importação de CSV, você pode importar <strong>centenas de transações em segundos</strong>, 
                  economizando tempo e evitando erros de digitação manual.
                </p>
                <Button 
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-6 text-lg shadow-lg"
                >
                  <Crown className="mr-2 size-5" />
                  Fazer Upgrade Agora
                </Button>
              </div>
              
              {/* Benefícios */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Sparkles className="size-5 text-blue-500" />
                  O que você ganha com esta funcionalidade:
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                      <ArrowRight className="size-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Importação Rápida</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Centenas de transações em segundos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                      <ArrowRight className="size-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Detecção de Duplicatas</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Sistema inteligente evita duplicações</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                      <ArrowRight className="size-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">IA Automática</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Categorização inteligente das transações</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                      <ArrowRight className="size-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Multi-Bancos</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Compatível com todos os bancos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                      <ArrowRight className="size-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Período de Carência</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">24h para desfazer sem rastro na auditoria</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                      <ArrowRight className="size-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Economia de Tempo</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Horas de trabalho economizadas todo mês</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to Action Final */}
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Planos a partir de <span className="font-bold text-green-600 dark:text-green-400">R$ 29,90/mês</span>
                </p>
                <Button 
                  onClick={() => window.location.href = '/pricing'}
                  variant="outline"
                  className="w-full border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-950"
                >
                  Comparar Planos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Explicativo */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Upload className="size-5" />
            Importar Extrato Bancário
          </CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-400">
            <div className="space-y-3 text-sm">
              <p className="font-semibold">
                💡 Para que serve esta função?
              </p>
              <p>
                Importe suas transações bancárias de uma só vez ao invés de digitá-las manualmente. 
                Perfeito para quem tem muitas transações mensais!
              </p>
              
              <div className="mt-4 space-y-2">
                <p className="font-semibold">📋 Como funciona:</p>
                <ol className="ml-4 space-y-1 list-decimal">
                  <li>Baixe o extrato do seu banco em formato <strong>CSV</strong> (planilha)</li>
                  <li>Faça upload do arquivo aqui</li>
                  <li>Nosso sistema detecta automaticamente duplicatas</li>
                  <li>Revise e confirme a importação</li>
                </ol>
              </div>

              <div className="mt-4 rounded-lg border border-blue-300 bg-blue-100 p-3 dark:border-blue-700 dark:bg-blue-900">
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  🛡️ Proteção contra duplicatas:
                </p>
                <p className="mt-1 text-blue-700 dark:text-blue-300">
                  O sistema detecta automaticamente transações duplicadas (mesma data + descrição + valor) 
                  e as marca para ignorar. <strong>Você pode desmarcar se o sistema errar!</strong>
                </p>
                <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  ⚠️ Importante: Transferências entre suas contas ainda não são detectadas automaticamente. 
                  Você precisará marcá-las manualmente para ignorar.
                </p>
              </div>

              <div className="mt-4 space-y-1">
                <p className="font-semibold">🏦 Onde encontrar o CSV do seu banco:</p>
                <ul className="ml-4 space-y-1 list-disc text-xs">
                  <li><strong>Nubank:</strong> App → Faturas → Baixar fatura (CSV)</li>
                  <li><strong>Inter:</strong> App → Extrato → Exportar → CSV</li>
                  <li><strong>Itaú:</strong> Internet Banking → Extrato → Baixar arquivo CSV</li>
                  <li><strong>Bradesco:</strong> Internet Banking → Extrato → Salvar como CSV</li>
                  <li><strong>Outros:</strong> Procure por "Exportar extrato" ou "Download CSV"</li>
                </ul>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Wizard */}
      <Card className="w-full">
        <CardHeader>
          <Progress value={progressValue} className="mb-4" />
          <CardTitle className="flex items-center gap-2">
              {step === 'upload' && <><Upload/>Etapa 1: Enviar Arquivo</>}
              {step === 'map-columns' && <><Columns/>Etapa 2: Mapear Colunas</>}
              {step === 'review' && <><Table/>Etapa 3: Revisar e Importar</>}
          </CardTitle>
          <CardDescription>
              {step === 'upload' && 'Selecione o arquivo CSV que você exportou do seu banco.'}
              {step === 'map-columns' && 'Combine as colunas do seu arquivo com os campos do Zona Fiscal.'}
              {step === 'review' && 'Revise as transações, ajuste as categorias e confirme a importação.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
        {step === "upload" && (
          <div className="space-y-6">
            {/* Instruções */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="mb-3 font-semibold">📝 Antes de começar:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span>
                  <span>Baixe o extrato do seu banco em formato <strong>CSV</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span>
                  <span>O arquivo deve conter pelo menos: <strong>Data, Descrição e Valor</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span>
                  <span>Pode importar quantas vezes quiser - duplicatas serão ignoradas automaticamente</span>
                </li>
              </ul>
            </div>

            {/* Upload */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8">
              <div className="text-center">
                <Upload className="mx-auto mb-2 size-12 text-muted-foreground" />
                <p className="mb-1 font-semibold">Selecione seu arquivo CSV</p>
                <p className="text-xs text-muted-foreground">Apenas arquivos .csv são aceitos</p>
              </div>
              
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              
              {file && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                  <p className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                    ✓ Arquivo selecionado: <strong>{file.name}</strong>
                  </p>
                </div>
              )}
              
              <Button onClick={handleUpload} disabled={!file || isProcessing} size="lg">
                {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2"/>}
                {isProcessing ? 'Processando...' : 'Continuar para Mapeamento'}
              </Button>
            </div>
          </div>
        )}
        {step === 'map-columns' && (
            <div className="space-y-6">
                {/* Instruções de Mapeamento */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="mb-2 font-semibold">🔗 O que é mapeamento?</p>
                  <p className="text-sm text-muted-foreground">
                    Cada banco nomeia as colunas de forma diferente. Por exemplo, alguns chamam de "Histórico", 
                    outros de "Descrição". Aqui você indica qual coluna do seu banco corresponde a cada campo do Zona Fiscal.
                  </p>
                  <div className="mt-3 rounded bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <strong>Dica:</strong> Se não encontrar a coluna exata, escolha a mais parecida. Você poderá revisar tudo na próxima etapa.
                  </div>
                </div>

                <p className="text-sm font-medium">Selecione as colunas do seu arquivo CSV:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(REQUIRED_FIELDS as string[]).map(field => (
                        <div key={field} className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold">
                              {FIELD_LABELS[field] || field}
                              <span className="text-xs font-normal text-muted-foreground">
                                {field === 'date' && '(ex: 10/01/2025)'}
                                {field === 'description' && '(ex: PIX Mercado)'}
                                {field === 'amount' && '(ex: 150,00)'}
                              </span>
                            </Label>
                            <Select onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [field]: value}))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma coluna..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
                 <Button onClick={handleMapColumns} disabled={isCheckingDuplicates} size="lg">
                    {isCheckingDuplicates ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2"/>}
                    {isCheckingDuplicates ? 'Verificando Duplicatas...' : 'Continuar para Revisão'}
                </Button>
            </div>
        )}
        {step === 'review' && (
            <div className="space-y-4">
                 {/* Instruções de Revisão */}
                 <div className="rounded-lg border bg-muted/50 p-4">
                   <p className="mb-2 font-semibold">👀 Última etapa: Revisar</p>
                   <p className="text-sm text-muted-foreground mb-3">
                     Revise as transações abaixo. Você pode ajustar as categorias e marcar transações para ignorar.
                   </p>
                   <div className="space-y-2 text-xs">
                     <div className="flex items-start gap-2">
                       <span className="text-green-600">✓</span>
                       <span><strong>Categoria:</strong> Use a IA (⭐) para sugerir automaticamente se é Pessoal, Empresarial ou Misto</span>
                     </div>
                     <div className="flex items-start gap-2">
                       <span className="text-orange-600">⊘</span>
                       <span><strong>Duplicatas:</strong> Transações idênticas são marcadas automaticamente. <u>Você pode desmarcar se discordar!</u></span>
                     </div>
                     <div className="flex items-start gap-2">
                       <span className="text-gray-600">☐</span>
                       <span><strong>Ignorar:</strong> Marque transações que não quer importar (ex: transferências entre contas, estornos)</span>
                     </div>
                     <div className="flex items-start gap-2">
                       <span className="text-blue-600">⏰</span>
                       <span><strong>Período de Carência:</strong> Transações importadas não aparecem na Auditoria por 24h. Você pode desfazer sem deixar rastro!</span>
                     </div>
                   </div>
                 </div>

                 {/* Alerta de Duplicatas */}
                 {mappedData.filter(t => t.isDuplicate).length > 0 && (
                   <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950">
                     <p className="font-semibold text-orange-700 dark:text-orange-300">
                       ⚠️ {mappedData.filter(t => t.isDuplicate).length} Duplicata(s) Detectada(s)
                     </p>
                     <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                       Essas transações parecem idênticas às que você já tem (mesma data, descrição e valor). 
                       Elas foram automaticamente marcadas como "Ignorar".
                     </p>
                     <p className="mt-2 text-xs font-semibold text-orange-700 dark:text-orange-300">
                       💡 Se o sistema errou e essa transação é nova: desmarque o checkbox "Ignorar" na tabela abaixo.
                     </p>
                   </div>
                 )}

                 {/* Informações do Período */}
                 {periodInfo && (
                   <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950">
                     <p className="font-semibold text-blue-700 dark:text-blue-300">
                       📊 Resumo da Importação
                     </p>
                     <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-blue-600 dark:text-blue-400">
                       <div>
                         <strong>Período:</strong> {periodInfo.monthYear}
                       </div>
                       <div>
                         <strong>Transações:</strong> {periodInfo.count}
                       </div>
                       <div>
                         <strong>De:</strong> {periodInfo.startDate.toLocaleDateString('pt-BR')}
                       </div>
                       <div>
                         <strong>Até:</strong> {periodInfo.endDate.toLocaleDateString('pt-BR')}
                       </div>
                     </div>
                     <div className="mt-3 flex gap-4 text-sm">
                       <div>
                         <strong className="text-green-600 dark:text-green-400">
                           ✓ {mappedData.filter(t => !t.isIgnored).length} serão importadas
                         </strong>
                       </div>
                       <div>
                         <strong className="text-orange-600 dark:text-orange-400">
                           ⊘ {mappedData.filter(t => t.isIgnored && t.isDuplicate).length} duplicatas ignoradas
                         </strong>
                       </div>
                       <div>
                         <strong className="text-gray-600 dark:text-gray-400">
                           ⊗ {mappedData.filter(t => t.isIgnored && !t.isDuplicate).length} ignoradas manualmente
                         </strong>
                       </div>
                     </div>
                   </div>
                 )}

                 <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <ShadTable>
                        <TableHeader className="sticky top-0 bg-muted">
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Ignorar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mappedData.map((t, i) => (
                                <TableRow key={i} className={t.isIgnored ? "opacity-50 bg-muted" : ""}>
                                    <TableCell>{new Date(t.date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>
                                      <div>
                                        {t.description}
                                        {t.isDuplicate && (
                                          <Badge variant="outline" className="ml-2 border-orange-500 text-orange-600">
                                            Duplicata
                                          </Badge>
                                        )}
                                      </div>
                                      {t.duplicateReason && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {t.duplicateReason}
                                        </p>
                                      )}
                                    </TableCell>
                                    <TableCell className={t.type === 'income' ? 'text-green-500' : 'text-red-500'}>
                                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(t.amount)}
                                    </TableCell>
                                    <TableCell>
                                         <div className="flex items-center gap-2">
                                            <Select value={t.category} onValueChange={(v) => handleCategoryChange(i, v as TransactionCategory)} disabled={t.isIgnored}>
                                                <SelectTrigger className="w-48">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="business">Empresarial</SelectItem>
                                                    <SelectItem value="personal">Pessoal</SelectItem>
                                                    <SelectItem value="mixed">Misto</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" title="Sugestão da IA" onClick={() => handleGetSuggestion(i)} disabled={t.isIgnored}>
                                                <Sparkles className="size-4 text-yellow-400" />
                                            </Button>
                                         </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="checkbox" 
                                            checked={t.isIgnored} 
                                            onChange={(e) => handleIgnoreChange(i, e.target.checked)} 
                                            className="size-4 accent-primary" 
                                          />
                                          {t.isDuplicate && (
                                            <span className="text-xs text-orange-600" title={t.duplicateReason}>
                                              ⚠️
                                            </span>
                                          )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </ShadTable>
                 </div>
                 
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button disabled={isProcessing} size="lg" className="w-full">
                       {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2"/>}
                       {isProcessing ? 'Importando...' : `✓ Confirmar e Importar ${mappedData.filter(t => !t.isIgnored).length} transações`}
                     </Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle className="flex items-center gap-2">
                         <Upload className="size-5 text-primary" />
                         Confirmar Importação?
                       </AlertDialogTitle>
                       <AlertDialogDescription>
                         Você está prestes a importar {mappedData.filter(t => !t.isIgnored).length} transações.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     
                     <div className="space-y-4 py-4">
                       <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                         <div className="flex items-start gap-3">
                           <div className="text-2xl">⏰</div>
                           <div className="space-y-2">
                             <div className="font-semibold text-green-700 dark:text-green-300">
                               Período de Carência: 24 horas
                             </div>
                             <div className="text-sm text-green-600 dark:text-green-400">
                               Você terá 24 horas para desfazer esta importação caso cometa algum erro. 
                               Durante esse período, as transações <strong>não aparecerão na Trilha de Auditoria</strong>, 
                               permitindo que você corrija sem deixar rastro.
                             </div>
                             <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                               💡 Para desfazer: Menu → Importar → Histórico → Clique em "Desfazer"
                             </div>
                           </div>
                         </div>
                       </div>
                       
                       <div className="text-sm text-muted-foreground">
                         Após 24h, as transações serão consideradas definitivas e aparecerão na auditoria normalmente.
                       </div>
                     </div>
                     
                     <AlertDialogFooter>
                       <AlertDialogCancel>Cancelar</AlertDialogCancel>
                       <AlertDialogAction onClick={handleFinalImport}>
                         Sim, Importar Agora
                       </AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
            </div>
        )}
      </CardContent>
    </Card>

    {/* Dúvidas Frequentes */}
    <Card className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
      <CardHeader>
        <CardTitle className="text-base">❓ Dúvidas Frequentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <details className="group">
          <summary className="cursor-pointer font-semibold hover:text-primary">
            Posso importar o mesmo mês várias vezes?
          </summary>
          <p className="mt-2 text-muted-foreground">
            Sim! O sistema detecta automaticamente duplicatas e as ignora. Isso é útil se você precisar 
            reimportar um extrato corrigido ou adicionar transações de outro banco do mesmo período.
          </p>
        </details>
        
        <details className="group">
          <summary className="cursor-pointer font-semibold hover:text-primary">
            E se eu tiver múltiplos bancos?
          </summary>
          <p className="mt-2 text-muted-foreground">
            Perfeito! Importe o extrato de cada banco separadamente. <strong>Atenção:</strong> Transferências 
            entre suas contas aparecerão duas vezes (uma como saída e outra como entrada).
          </p>
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              💡 Regra de Ouro:
            </p>
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              Ignore sempre a <strong>ENTRADA</strong>, mantenha a <strong>SAÍDA</strong>
            </p>
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Exemplo: Se transferiu R$ 1.000 do Nubank para o Inter:<br/>
              • Nubank (saída -R$ 1.000): <strong>Não marcar "Ignorar"</strong><br/>
              • Inter (entrada +R$ 1.000): <strong>Marcar "Ignorar"</strong>
            </p>
          </div>
        </details>
        
        <details className="group">
          <summary className="cursor-pointer font-semibold hover:text-primary">
            O que são as categorias (Pessoal/Empresarial/Misto)?
          </summary>
          <p className="mt-2 text-muted-foreground">
            <strong>Pessoal:</strong> Gastos pessoais que não são dedutíveis<br/>
            <strong>Empresarial:</strong> Despesas da empresa, dedutíveis no IR<br/>
            <strong>Misto:</strong> Quando não tem certeza ou é parcialmente dedutível
          </p>
        </details>
        
        <details className="group">
          <summary className="cursor-pointer font-semibold hover:text-primary">
            Meu banco não gera CSV. E agora?
          </summary>
          <p className="mt-2 text-muted-foreground">
            Você pode copiar o extrato do PDF e colar no Excel/Google Sheets, depois salvar como CSV. 
            Ou adicionar as transações manualmente pelo botão "Nova Transação" no dashboard.
          </p>
        </details>
        
        <details className="group">
          <summary className="cursor-pointer font-semibold hover:text-primary">
            Posso desfazer uma importação?
          </summary>
          <p className="mt-2 text-muted-foreground">
            Sim! Cada importação fica registrada na página <strong>"Histórico de Importações"</strong>. 
            Você pode desfazer qualquer importação, excluindo todas as transações daquele lote de uma só vez.
          </p>
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
              💡 Como desfazer:
            </p>
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              Menu lateral → Histórico → Clique em "Desfazer" na importação desejada
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  </div>
  );
}
