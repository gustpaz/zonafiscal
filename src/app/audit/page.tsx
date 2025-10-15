
"use client";

import { useEffect, useState, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import DashboardHeader from "@/components/dashboard-header";
import { getAuditLogs } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FilePlus, FilePen, Trash, Download, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import type { AuditLog, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createHash } from 'crypto';
import { exportAuditReportAction } from "@/lib/actions";
import { exportAuditReportClient } from "@/lib/client-audit";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { getTeamMembersClient } from "@/lib/client-admin-data";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Search } from "lucide-react";
import { filterTransactionsForAudit, IMPORT_GRACE_PERIOD_HOURS } from "@/lib/audit-filters";

// This function needs to be identical to the one in lib/data.ts
function createAuditHash(logData: Omit<AuditLog, 'hash' | 'id'>): string {
  const logString = `${logData.date}${logData.userId}${logData.userName}${logData.action}${logData.entity}${logData.entityId}${logData.details}${logData.previousHash}`;
  return createHash('sha256').update(logString).digest('hex');
}

type VerifiedLog = AuditLog & { isValid: boolean };

export default function AuditPage() {
  const { user } = useAuth();
  const [verifiedLogs, setVerifiedLogs] = useState<VerifiedLog[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [integrityFilter, setIntegrityFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (user) {
      async function fetchAndVerifyLogs() {
        setLoading(true);
        try {
          const [auditLogs, teamMembers] = await Promise.all([
            getAuditLogs(user.uid),
            getTeamMembersClient(user.uid)
          ]);
          
          // Criar mapa de usuários (você + membros da equipe)
          const usersMap: Record<string, User> = teamMembers.reduce((acc, u) => {
            acc[u.id] = u;
            return acc;
          }, {} as Record<string, User>);
          
          // Garantir que o usuário atual está no mapa
          if (!usersMap[user.uid]) {
            usersMap[user.uid] = {
              id: user.uid,
              name: user.displayName || 'Você',
              email: user.email || '',
              avatar: user.photoURL || '',
              plan: 'Gratuito',
              signupDate: new Date().toISOString(),
              status: 'Ativo',
              role: 'Dono',
              adminRole: 'Nenhum',
              adminPermissions: []
            };
          }
          setUsers(usersMap);

        const sortedLogs = [...auditLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let previousHash: string | null = null;
        const verified = sortedLogs.map(log => {
            const isHashValid = createAuditHash({ ...log, previousHash }) === log.hash;
            const isChainValid = log.previousHash === previousHash;
            const isValid = isHashValid && isChainValid;
            previousHash = log.hash;
            return { ...log, isValid };
        }).reverse(); // Reverse to show newest first
          setVerifiedLogs(verified);
        } catch (error) {
          console.error("Erro ao buscar logs de auditoria:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchAndVerifyLogs();
    }
  }, [user]);
  
  // Aplicar filtros
  const filteredLogs = useMemo(() => {
    return verifiedLogs.filter(log => {
      // Filtro de busca por detalhes
      const matchesSearch = searchTerm === "" || 
        log.details.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de ação
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      
      // Filtro de entidade
      const matchesEntity = entityFilter === "all" || log.entity === entityFilter;
      
      // Filtro de usuário
      const matchesUser = userFilter === "all" || log.userId === userFilter;
      
      // Filtro de integridade
      const matchesIntegrity = integrityFilter === "all" || 
        (integrityFilter === "valid" && log.isValid) ||
        (integrityFilter === "invalid" && !log.isValid);
      
      // Filtro de data
      const logDate = new Date(log.date);
      const matchesDate = !dateRange || !dateRange.from || 
        (logDate >= dateRange.from && logDate <= (dateRange.to || new Date()));
      
      // Filtro de importações recentes (período de carência de 24h)
      // Transações importadas nos últimos 24h não aparecem na auditoria
      const isRecentImport = log.entity === 'transaction' && 
                             log.details.includes('via arquivo CSV') &&
                             log.action === 'create';
      
      if (isRecentImport) {
        const logTime = new Date(log.date).getTime();
        const now = new Date().getTime();
        const hoursSince = (now - logTime) / (1000 * 60 * 60);
        
        if (hoursSince < IMPORT_GRACE_PERIOD_HOURS) {
          return false; // Oculta importações recentes
        }
      }
      
      return matchesSearch && matchesAction && matchesEntity && 
             matchesUser && matchesIntegrity && matchesDate;
    });
  }, [verifiedLogs, searchTerm, actionFilter, entityFilter, userFilter, integrityFilter, dateRange]);

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Reset para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, entityFilter, userFilter, integrityFilter, dateRange]);

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    const result = await exportAuditReportClient(user.uid);
    if (result.success && result.csvData) {
        const blob = new Blob([result.csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
            title: "Relatório Exportado!",
            description: "Seu relatório de auditoria foi baixado com sucesso.",
        });
    } else {
        toast({
            title: "Erro!",
            description: result.error || "Não foi possível exportar o relatório.",
            variant: "destructive"
        })
    }
    setIsExporting(false);
  }

  const actionIcons: Record<AuditLog["action"], React.ReactNode> = {
    create: <FilePlus className="size-4" />,
    update: <FilePen className="size-4" />,
    delete: <Trash className="size-4" />,
  };

  const actionColors: Record<AuditLog["action"], string> = {
    create: "bg-green-500/10 text-green-400 border-green-500/20",
    update: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    delete: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  
  const actionLabels: Record<AuditLog["action"], string> = {
    create: "Criação",
    update: "Atualização",
    delete: "Exclusão",
  };

  const getAuthor = (userId: string) => users[userId] || { name: 'Desconhecido', avatar: '' };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Trilha de Auditoria" />
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Histórico de Atividades</CardTitle>
              <CardDescription>
                Visualize todas as ações realizadas na sua conta com verificação de integridade.
              </CardDescription>
              <p className="mt-2 text-xs text-muted-foreground">
                ℹ️ Transações importadas aparecem aqui após {IMPORT_GRACE_PERIOD_HOURS}h, permitindo que você desfaça antes.
              </p>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={isExporting || !user}>
                {isExporting ? <Loader2 className="mr-2 animate-spin"/> : <Download className="mr-2"/>}
                {isExporting ? 'Exportando...' : 'Exportar Relatório'}
            </Button>
          </div>
          
          {/* Filtros */}
          <div className="space-y-4 pt-6">
            {/* Linha 1: Busca e Data */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos detalhes..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DateRangePicker className="w-full sm:w-auto" />
            </div>
            
            {/* Linha 2: Filtros de Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro de Ação */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="create">Criação</SelectItem>
                  <SelectItem value="update">Atualização</SelectItem>
                  <SelectItem value="delete">Exclusão</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Filtro de Entidade */}
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Entidades</SelectItem>
                  <SelectItem value="transaction">Transações</SelectItem>
                  <SelectItem value="goal">Metas</SelectItem>
                  <SelectItem value="budget">Orçamentos</SelectItem>
                  <SelectItem value="user">Usuários</SelectItem>
                  <SelectItem value="plan">Planos</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Filtro de Usuário */}
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Usuários</SelectItem>
                  {Object.values(users).map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} {u.id === user?.uid ? "(Você)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Filtro de Integridade */}
              <Select value={integrityFilter} onValueChange={setIntegrityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Integridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="valid">✅ Verificados</SelectItem>
                  <SelectItem value="invalid">❌ Adulterados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Contador de resultados */}
          <div className="text-sm text-muted-foreground pt-4">
            Mostrando {paginatedLogs.length} de {filteredLogs.length} registros
            {filteredLogs.length !== verifiedLogs.length && ` (${verifiedLogs.length} total)`}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="min-w-[150px]">Data e Hora</TableHead>
                <TableHead className="min-w-[120px]">Usuário</TableHead>
                <TableHead className="min-w-[100px]">Ação</TableHead>
                <TableHead className="min-w-[200px]">Detalhes</TableHead>
                <TableHead className="hidden xl:table-cell min-w-[120px]">Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                <TooltipProvider>
                  {paginatedLogs.map((log) => {
                    const author = getAuthor(log.userId);
                    return (
                        <TableRow key={log.id} className={!log.isValid ? "bg-red-500/10" : ""}>
                        <TableCell>
                            <Tooltip>
                            <TooltipTrigger>
                                {log.isValid ? (
                                <ShieldCheck className="size-5 text-green-500" />
                                ) : (
                                <ShieldAlert className="size-5 text-red-500" />
                                )}
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{log.isValid ? "Registro verificado e íntegro." : "Falha na verificação! Este registro ou a cadeia anterior pode ter sido adulterado."}</p>
                            </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell>
                            {new Date(log.date).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                            })}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                                <AvatarImage src={author.avatar} alt={author.name} />
                                <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{log.userName}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge
                            variant="outline"
                            className={cn("capitalize gap-1.5 whitespace-nowrap", actionColors[log.action])}
                            >
                            {actionIcons[log.action]}
                            <span className="hidden sm:inline">{actionLabels[log.action]}</span>
                            </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-sm break-words">{log.details}</div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell font-mono text-xs">
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="truncate max-w-[120px]">{log.hash}</div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm break-all">
                              {log.hash}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        </TableRow>
                    )
                  })}
                </TooltipProvider>
              )}
            </TableBody>
          </Table>
          
          {/* Paginação */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
            {/* Contador e Itens por página */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="text-sm text-muted-foreground">
                Mostrando {paginatedLogs.length} de {filteredLogs.length} registros
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm whitespace-nowrap">Itens por página</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map(size => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Navegação */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-sm font-medium">
                Página {currentPage} de {totalPages || 1}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
