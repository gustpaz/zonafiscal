"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserX, UserCheck, Search, Download, Trash2, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface AnonymizedUser {
  userId: string;
  anonymizedAt: string;
  anonymizationReason: string;
  originalEmail?: string;
  canRevert: boolean;
}

interface DataProcessingLog {
  id: string;
  userId: string;
  action: string;
  dataType: string;
  timestamp: string;
  purpose: string;
  legalBasis: string;
}

interface ReactivationRequest {
  token: string;
  userId: string;
  requestedAt: string;
  submittedAt?: string;
  status: 'pending' | 'awaiting_approval' | 'approved' | 'rejected';
  submittedData?: {
    name: string;
    email: string;
    cpf: string;
    phone?: string;
  };
}

export default function AdminLGPDPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');
  const [anonymizedUsers, setAnonymizedUsers] = useState<AnonymizedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<DataProcessingLog[]>([]);
  const [reactivationRequests, setReactivationRequests] = useState<ReactivationRequest[]>([]);
  const [selectedTab, setSelectedTab] = useState<'anonymized' | 'reactivation' | 'audit'>('anonymized');
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    loadAnonymizedUsers();
    loadReactivationRequests();
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { fetchWithAuth } = await import('@/lib/auth-token');
      const response = await fetchWithAuth('/api/admin/lgpd/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  const loadReactivationRequests = async () => {
    try {
      const { fetchWithAuth } = await import('@/lib/auth-token');
      const response = await fetchWithAuth('/api/admin/lgpd/reactivation-requests');
      if (response.ok) {
        const data = await response.json();
        setReactivationRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações de reativação:', error);
    }
  };

  const loadAnonymizedUsers = async () => {
    setIsLoading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/auth-token');
      const response = await fetchWithAuth('/api/admin/lgpd/anonymized-users');
      if (response.ok) {
        const data = await response.json();
        setAnonymizedUsers(data.users || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários anonimizados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchAuditLogs = async () => {
    if (!searchUserId.trim()) {
      toast({
        title: "ID do usuário necessário",
        description: "Digite o ID do usuário para buscar logs de auditoria.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/auth-token');
      const response = await fetchWithAuth(`/api/admin/lgpd/audit-logs?userId=${searchUserId}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
        setSelectedTab('audit');
      } else {
        toast({
          title: "Erro ao buscar logs",
          description: "Não foi possível buscar os logs de auditoria.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      toast({
        title: "Erro ao buscar logs",
        description: "Ocorreu um erro ao buscar os logs de auditoria.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const revertAnonymization = async (userId: string) => {
    setIsLoading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/auth-token');
      const response = await fetchWithAuth('/api/admin/lgpd/revert-anonymization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast({
          title: "Desanonimização solicitada",
          description: "O usuário foi notificado e deve fornecer seus dados novamente.",
        });
        loadAnonymizedUsers();
      } else {
        const data = await response.json();
        toast({
          title: "Erro ao desanonimizar",
          description: data.error || "Não foi possível reverter a anonimização.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao desanonimizar:', error);
      toast({
        title: "Erro ao desanonimizar",
        description: "Ocorreu um erro ao reverter a anonimização.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportUserData = async (userId: string) => {
    setIsLoading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/auth-token');
      const response = await fetchWithAuth(`/api/admin/lgpd/export-user-data?userId=${userId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-${userId}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Dados exportados!",
          description: "Os dados do usuário foram exportados com sucesso.",
        });
      } else {
        toast({
          title: "Erro ao exportar",
          description: "Não foi possível exportar os dados do usuário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUserPermanently = async (userId: string) => {
    setIsLoading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/auth-token');
      const response = await fetchWithAuth('/api/admin/lgpd/delete-user-permanently', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast({
          title: "Usuário excluído",
          description: "Todos os dados do usuário foram excluídos permanentemente.",
        });
        loadAnonymizedUsers();
      } else {
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o usuário permanentemente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const approveReactivation = async (token: string, approved: boolean) => {
    setIsLoading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/auth-token');
      const response = await fetchWithAuth('/api/admin/lgpd/approve-reactivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, approved }),
      });

      if (response.ok) {
        toast({
          title: approved ? "Reativação aprovada!" : "Reativação rejeitada",
          description: approved 
            ? "O usuário pode fazer login novamente." 
            : "A solicitação foi rejeitada.",
        });
        loadReactivationRequests();
        loadAnonymizedUsers();
      } else {
        toast({
          title: "Erro ao processar",
          description: "Não foi possível processar a solicitação.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao aprovar reativação:', error);
      toast({
        title: "Erro ao processar",
        description: "Ocorreu um erro ao processar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          <Shield className="mr-2 inline-block" />
          Gerenciamento LGPD (Admin)
        </h1>
        <p className="text-muted-foreground">
          Gerencie solicitações de LGPD, usuários anonimizados e logs de auditoria.
        </p>
      </div>

      {/* Dashboard de Métricas */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Usuários Anonimizados</CardDescription>
              <CardTitle className="text-3xl">{metrics.totalAnonymized}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Total de contas anonimizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Reativações Pendentes</CardDescription>
              <CardTitle className="text-3xl text-orange-600">
                {metrics.pendingReactivations}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Solicitações (30 dias)</CardDescription>
              <CardTitle className="text-3xl">{metrics.requestsLast30Days}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {metrics.exportsLast30Days} exportações
              </p>
            </CardContent>
          </Card>

          <Card className={metrics.urgentRequests > 0 ? 'border-red-500' : ''}>
            <CardHeader className="pb-3">
              <CardDescription>Alertas de Prazo</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {metrics.urgentRequests}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {metrics.urgentRequests > 0 
                  ? `⚠️ Prazo < 3 dias` 
                  : '✅ Todos em dia'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tempo Médio de Resposta */}
      {metrics && metrics.averageResponseDays > 0 && (
        <Card className={metrics.averageResponseDays > 10 ? 'border-yellow-500' : 'border-green-500'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tempo Médio de Resposta</p>
                <p className="text-2xl font-bold">
                  {metrics.averageResponseDays} dias
                </p>
              </div>
              <div className={`rounded-full p-3 ${
                metrics.averageResponseDays > 10 
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' 
                  : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
              }`}>
                {metrics.averageResponseDays > 10 ? '⚠️' : '✅'}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {metrics.averageResponseDays > 10 
                ? 'Atenção: Prazo legal é de 15 dias úteis' 
                : 'Dentro do prazo legal (15 dias úteis)'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Busca de Logs de Auditoria */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Logs de Auditoria</CardTitle>
          <CardDescription>
            Digite o ID do usuário para ver o histórico de processamento de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="userId">ID do Usuário</Label>
              <Input
                id="userId"
                placeholder="Digite o ID do usuário..."
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
              />
            </div>
            <Button onClick={searchAuditLogs} disabled={isLoading} className="mt-auto">
              <Search className="mr-2 size-4" />
              Buscar Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setSelectedTab('anonymized')}
          className={`px-4 py-2 font-medium transition-colors ${
            selectedTab === 'anonymized'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserX className="mr-2 inline-block size-4" />
          Usuários Anonimizados ({anonymizedUsers.length})
        </button>
        <button
          onClick={() => setSelectedTab('reactivation')}
          className={`px-4 py-2 font-medium transition-colors ${
            selectedTab === 'reactivation'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="mr-2 inline-block size-4" />
          Solicitações de Reativação ({reactivationRequests.length})
          {reactivationRequests.filter(r => r.status === 'awaiting_approval').length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {reactivationRequests.filter(r => r.status === 'awaiting_approval').length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setSelectedTab('audit')}
          className={`px-4 py-2 font-medium transition-colors ${
            selectedTab === 'audit'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="mr-2 inline-block size-4" />
          Logs de Auditoria ({auditLogs.length})
        </button>
      </div>

      {/* Usuários Anonimizados */}
      {selectedTab === 'anonymized' && (
        <Card>
          <CardHeader>
            <CardTitle>Usuários Anonimizados</CardTitle>
            <CardDescription>
              Lista de usuários que solicitaram anonimização de dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {anonymizedUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum usuário anonimizado no momento
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID do Usuário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anonymizedUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-mono text-xs">
                        {user.userId}
                      </TableCell>
                      <TableCell>
                        {new Date(user.anonymizedAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{user.anonymizationReason}</TableCell>
                      <TableCell>
                        {user.canRevert ? (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            Reversível
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-500 text-red-600">
                            Não reversível
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportUserData(user.userId)}
                            disabled={isLoading}
                          >
                            <Download className="size-4" />
                          </Button>
                          {user.canRevert && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isLoading}
                                >
                                  <UserCheck className="size-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reverter Anonimização?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso criará uma solicitação para que o usuário forneça seus dados
                                    novamente. O usuário será notificado por email.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => revertAnonymization(user.userId)}>
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isLoading}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Permanentemente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong className="text-destructive">ATENÇÃO:</strong> Esta ação é
                                  IRREVERSÍVEL. Todos os dados do usuário serão excluídos
                                  permanentemente do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserPermanently(user.userId)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Excluir Permanentemente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Solicitações de Reativação */}
      {selectedTab === 'reactivation' && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Reativação</CardTitle>
            <CardDescription>
              Usuários que solicitaram reverter a anonimização de suas contas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reactivationRequests.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma solicitação de reativação pendente
              </div>
            ) : (
              <div className="space-y-4">
                {reactivationRequests.map((request) => (
                  <Card key={request.token} className="border-2">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">ID do Usuário</p>
                            <p className="font-mono text-sm">{request.userId}</p>
                          </div>
                          <Badge variant={request.status === 'awaiting_approval' ? 'destructive' : 'outline'}>
                            {request.status === 'pending' && 'Aguardando Usuário'}
                            {request.status === 'awaiting_approval' && 'Aguardando Aprovação'}
                            {request.status === 'approved' && 'Aprovado'}
                            {request.status === 'rejected' && 'Rejeitado'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Solicitado em</p>
                            <p className="text-sm">{new Date(request.requestedAt).toLocaleString('pt-BR')}</p>
                          </div>
                          {request.submittedAt && (
                            <div>
                              <p className="text-sm text-muted-foreground">Enviado em</p>
                              <p className="text-sm">{new Date(request.submittedAt).toLocaleString('pt-BR')}</p>
                            </div>
                          )}
                        </div>

                        {request.submittedData && (
                          <div className="rounded-lg border bg-muted/50 p-4">
                            <p className="mb-2 font-semibold">Dados Fornecidos:</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Nome:</span>{' '}
                                <span className="font-medium">{request.submittedData.name}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Email:</span>{' '}
                                <span className="font-medium">{request.submittedData.email}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">CPF:</span>{' '}
                                <span className="font-medium">{request.submittedData.cpf}</span>
                              </div>
                              {request.submittedData.phone && (
                                <div>
                                  <span className="text-muted-foreground">Telefone:</span>{' '}
                                  <span className="font-medium">{request.submittedData.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {request.status === 'awaiting_approval' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => approveReactivation(request.token, true)}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              <UserCheck className="mr-2 size-4" />
                              Aprovar Reativação
                            </Button>
                            <Button
                              onClick={() => approveReactivation(request.token, false)}
                              disabled={isLoading}
                              variant="destructive"
                              className="flex-1"
                            >
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs de Auditoria */}
      {selectedTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle>Logs de Auditoria</CardTitle>
            <CardDescription>
              Histórico de processamento de dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum log encontrado. Use a busca acima para encontrar logs de um usuário específico.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tipo de Dado</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Base Legal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>{log.dataType}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.purpose}</TableCell>
                      <TableCell>
                        <Badge>{log.legalBasis}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informações Importantes */}
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="flex items-center text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="mr-2 size-5" />
            Informações Importantes (LGPD)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
          <p>
            <strong>Prazo de resposta:</strong> 15 dias úteis para solicitações dos titulares (Art. 18)
          </p>
          <p>
            <strong>Retenção de dados:</strong> Dados fiscais devem ser mantidos por 5 anos conforme legislação
          </p>
          <p>
            <strong>Logs de auditoria:</strong> Mantenha por no mínimo 6 meses para demonstrar conformidade
          </p>
          <p>
            <strong>Contato DPO:</strong> dpo@zonafiscal.com.br
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

