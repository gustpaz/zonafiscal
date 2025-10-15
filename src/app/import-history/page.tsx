'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { History, Trash2, FileText, Calendar, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { getImportBatches, undoImportBatch, type ImportBatch } from '@/lib/import-history';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

export default function ImportHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [undoingBatchId, setUndoingBatchId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBatches();
    }
  }, [user]);

  const loadBatches = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await getImportBatches(user.uid);
      setBatches(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de importações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndoBatch = async (batch: ImportBatch) => {
    if (!user || !batch.id) return;

    setUndoingBatchId(batch.id);
    try {
      const result = await undoImportBatch(user.uid, batch.id);
      
      if (result.success) {
        toast({
          title: 'Importação Desfeita!',
          description: `${result.deletedCount} transações foram excluídas com sucesso.`,
        });
        // Recarregar lista
        loadBatches();
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Não foi possível desfazer a importação',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao desfazer importação:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao desfazer a importação',
        variant: 'destructive',
      });
    } finally {
      setUndoingBatchId(null);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Faça login para ver o histórico de importações</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Importações</h1>
          <p className="text-muted-foreground">
            Gerencie suas importações de extratos bancários
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-300">
            <History className="size-5" />
            Como funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-600 dark:text-blue-400 space-y-3">
          <p>
            Cada importação de CSV fica registrada aqui. Você pode desfazer qualquer importação, 
            excluindo todas as transações daquele lote de uma só vez.
          </p>
          
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-700 dark:bg-green-900">
            <p className="font-semibold text-green-700 dark:text-green-300">
              ⏰ Período de Carência: 24 horas
            </p>
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              Transações importadas não aparecem na Trilha de Auditoria durante as primeiras 24h. 
              Isso permite que você desfaça importações erradas sem deixar rastro na auditoria.
            </p>
          </div>
          
          <p className="font-semibold text-blue-700 dark:text-blue-300">
            ⚠️ Atenção: Ao desfazer, todas as transações da importação serão excluídas permanentemente.
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && batches.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Nenhuma importação ainda</h3>
            <p className="text-sm text-muted-foreground">
              Quando você importar um arquivo CSV, o histórico aparecerá aqui
            </p>
          </CardContent>
        </Card>
      )}

      {/* Batches List */}
      {!isLoading && batches.length > 0 && (
        <div className="space-y-4">
          {batches.map((batch) => (
            <Card key={batch.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="size-5" />
                      {batch.fileName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Importado em {new Date(batch.importedAt).toLocaleString('pt-BR')}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{batch.period.monthYear}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Período</p>
                    <p className="font-semibold">
                      {new Date(batch.period.startDate).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(batch.period.endDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transações</p>
                    <p className="font-semibold text-green-600">{batch.transactionCount} importadas</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duplicatas</p>
                    <p className="font-semibold text-orange-600">{batch.duplicatesIgnored} ignoradas</p>
                  </div>
                  <div className="flex items-end justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={undoingBatchId === batch.id}
                        >
                          {undoingBatchId === batch.id ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              Desfazendo...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 size-4" />
                              Desfazer
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-destructive" />
                            Desfazer Importação?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é irreversível! Todas as {batch.transactionCount} transações desta importação serão excluídas permanentemente.
                          </AlertDialogDescription>
                          <div className="mt-4 space-y-3">
                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
                              <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                                Importação: {batch.fileName}
                              </div>
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                Período: {batch.period.monthYear}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">Tem certeza que deseja continuar?</div>
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleUndoBatch(batch)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Sim, Desfazer Importação
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

