"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getSavedReports, type SavedReport } from "@/lib/client-reports-storage";
import DashboardHeader from "@/components/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, CheckCircle, XCircle, Clock, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

export default function MyReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadReports();
      // Poll a cada 5 segundos para verificar se há relatórios pending que foram concluídos
      const interval = setInterval(loadReports, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadReports = async () => {
    if (!user) return;
    try {
      const savedReports = await getSavedReports(user.uid);
      setReports(savedReports);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (report: SavedReport) => {
    console.log("=== INICIANDO DOWNLOAD PDF ===");
    console.log("Report ID:", report.id);
    console.log("Report Status:", report.status);
    console.log("Report Data:", {
      hasTitle: !!report.title,
      hasSummary: !!report.summary,
      hasReportDetails: !!report.reportDetails,
      title: report.title,
      summary: report.summary?.substring(0, 50),
      reportDetailsLength: report.reportDetails?.length
    });

    // Validar dados antes de tentar gerar PDF
    if (!report || !report.title || !report.summary || !report.reportDetails) {
      console.error("VALIDAÇÃO FALHOU - Dados incompletos:", {
        hasReport: !!report,
        hasTitle: !!report?.title,
        hasSummary: !!report?.summary,
        hasReportDetails: !!report?.reportDetails
      });
      toast({
        title: "Dados Incompletos",
        description: "Este relatório ainda não está completo para download.",
        variant: "destructive"
      });
      return;
    }

    setDownloadingId(report.id);
    try {
      const reportData = convertToReportOutput(report);
      console.log("1. Dados convertidos:", {
        title: reportData.title,
        summary: reportData.summary?.substring(0, 50),
        totalIncome: reportData.totalIncome,
        totalExpenses: reportData.totalExpenses,
        hasReportDetails: !!reportData.reportDetails
      });
      
      // Validar reportData
      if (!reportData.title || !reportData.summary) {
        throw new Error("Dados do relatório inválidos após conversão");
      }
      
      console.log("2. Carregando gerador de PDF (jsPDF)...");
      const { generateSimpleReportPDF } = await import('@/lib/simple-pdf-generator');
      console.log("3. Gerador carregado ✓");
      
      console.log("4. Gerando PDF...");
      const blob = await generateSimpleReportPDF(reportData);
      console.log("5. PDF gerado ✓ Tamanho:", blob.size, "bytes");
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-zona-fiscal-${report.id}.pdf`;
      document.body.appendChild(link);
      console.log("6. Iniciando download...");
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      console.log("7. Download concluído ✓");
      
      toast({
        title: "PDF Baixado!",
        description: "Seu relatório foi baixado com sucesso.",
      });
    } catch (error: any) {
      console.error("=== ERRO NO DOWNLOAD PDF ===");
      console.error("Tipo do erro:", error?.constructor?.name);
      console.error("Mensagem:", error?.message);
      console.error("Stack:", error?.stack);
      console.error("Erro completo:", error);
      
      toast({
        title: "Erro ao baixar PDF",
        description: error?.message || "Ocorreu um erro ao gerar o arquivo PDF. Verifique o console.",
        variant: "destructive"
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const getStatusBadge = (status: SavedReport['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle className="mr-1 h-3 w-3" /> Concluído</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Clock className="mr-1 h-3 w-3" /> Gerando...</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Erro</Badge>;
    }
  };

  const convertToReportOutput = (report: SavedReport): GenerateFinancialReportOutput => ({
    title: report.title || 'Relatório Financeiro',
    summary: report.summary || '',
    totalIncome: report.totalIncome || 0,
    totalExpenses: report.totalExpenses || 0,
    businessProfit: report.businessProfit || 0,
    personalSpending: report.personalSpending || 0,
    reportDetails: report.reportDetails || ''
  });

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Meus Relatórios">
        <Link href="/reports">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Gerar Novo Relatório
          </Button>
        </Link>
      </DashboardHeader>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum relatório ainda</h3>
            <p className="text-muted-foreground mb-4">
              Gere seu primeiro relatório financeiro com IA
            </p>
            <Link href="/reports">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {report.status === 'completed' ? report.title : 'Gerando relatório...'}
                    </CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: ptBR })}
                      {report.completedAt && report.status === 'completed' && (
                        <> • Concluído {formatDistanceToNow(new Date(report.completedAt), { addSuffix: true, locale: ptBR })}</>
                      )}
                    </CardDescription>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
              </CardHeader>
              
              {report.status === 'completed' && (
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{report.summary}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Receita Total</p>
                        <p className="font-semibold text-green-500">{formatCurrency(report.totalIncome)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Despesa Total</p>
                        <p className="font-semibold text-red-500">{formatCurrency(report.totalExpenses)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lucro do Negócio</p>
                        <p className="font-semibold">{formatCurrency(report.businessProfit)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gastos Pessoais</p>
                        <p className="font-semibold">{formatCurrency(report.personalSpending)}</p>
                      </div>
                    </div>

                    {expandedId === report.id && (
                      <div className="prose prose-sm dark:prose-invert max-w-none mt-4 p-4 bg-muted/50 rounded-md">
                        <ReactMarkdown>{report.reportDetails}</ReactMarkdown>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {expandedId === report.id ? 'Ocultar' : 'Ver'} Detalhes
                      </Button>
                      
                      {report.status === 'completed' && report.title && report.summary && report.reportDetails && (
                        <Button
                          size="sm"
                          onClick={() => handleDownloadPdf(report)}
                          disabled={downloadingId === report.id}
                        >
                          {downloadingId === report.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Preparando PDF...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              Baixar PDF
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}

              {report.status === 'pending' && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>A IA está analisando suas transações e gerando o relatório...</span>
                  </div>
                </CardContent>
              )}

              {report.status === 'error' && (
                <CardContent>
                  <div className="text-sm text-destructive">
                    <p className="font-semibold">Erro ao gerar relatório:</p>
                    <p>{report.error || 'Erro desconhecido'}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

