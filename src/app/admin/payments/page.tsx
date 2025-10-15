

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, Users, MoreVertical, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useTransition, useMemo } from "react";
import { getPaymentsDataClient, updatePaymentStatusClient, type Payment, type PaymentsData } from "@/lib/client-admin-payments";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('payments', false);

  const fetchPayments = () => {
    startTransition(async () => {
      try {
        const result = await getPaymentsDataClient();
        setData(result);
      } catch (error) {
        console.error("Erro ao buscar pagamentos:", error);
        toast({
          title: "Erro ao carregar pagamentos",
          description: "Não foi possível carregar os dados de pagamentos.",
          variant: "destructive",
        });
      }
    });
  }

  // Filtros e paginação - MOVIDO PARA ANTES DOS RETURNS
  const filteredPayments = useMemo(() => {
    if (!data) return [];
    return data.payments.filter(payment => {
      const matchesSearch = 
        payment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.planName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, currentPage, itemsPerPage]);

  useEffect(() => {
    if (isAuthorized) {
      fetchPayments();
    }
  }, [isAuthorized]);

  // Reset para primeira página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleMarkAsPaid = (paymentId: string) => {
    if (!user) return;
    startTransition(async () => {
      try {
        await updatePaymentStatusClient(paymentId, "Pago");
        toast({ title: "Pagamento atualizado!" });
        fetchPayments(); // Refetch to update UI
      } catch (error) {
        console.error("Erro ao atualizar pagamento:", error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o pagamento.",
          variant: "destructive",
        });
      }
    })
  };

  // Mostra loading enquanto verifica permissões
  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // Se não tem autorização, mostra página de erro
  if (accessDenied || (!isChecking && !isAuthorized)) {
    return <AdminAccessDenied 
      title="Acesso aos Pagamentos Negado"
      description="Você não tem permissões de administrador para visualizar pagamentos."
    />;
  }

  if (isPending || !data) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Receita Total (Mês)</CardTitle>
                    <DollarSign className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.monthlyRevenue)}</div>
                    <p className="text-xs text-muted-foreground">+18.3% desde o mês passado</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Novas Assinaturas (Mês)</CardTitle>
                    <CreditCard className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">+{data.newSubscriptions}</div>
                    <p className="text-xs text-muted-foreground">+32 desde o mês passado</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Churn Rate (Mês)</CardTitle>
                    <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.churnRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">-1.2% desde o mês passado</p>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign /> Histórico de Pagamentos</CardTitle>
                <CardDescription>Acompanhe as faturas e assinaturas recentes.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por usuário, email ou plano..." 
                      className="pl-8 w-full" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Falhou">Falhou</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Itens por página" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 por página</SelectItem>
                        <SelectItem value="10">10 por página</SelectItem>
                        <SelectItem value="20">20 por página</SelectItem>
                        <SelectItem value="50">50 por página</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    Nenhum pagamento encontrado com os filtros aplicados.
                                </TableCell>
                            </TableRow>
                        ) : (
                          paginatedPayments.map(payment => (
                            <TableRow key={payment.id}>
                                <TableCell>
                                    <p className="font-medium">{payment.userName}</p>
                                    <p className="text-sm text-muted-foreground">{payment.userEmail}</p>
                                </TableCell>
                                <TableCell>{payment.planName}</TableCell>
                                <TableCell>R$ {payment.amount.toFixed(2).replace('.', ',')}</TableCell>
                                <TableCell>{new Date(payment.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>
                                    <Badge variant={payment.status === 'Pago' ? 'default' : 'destructive'} className={payment.status === 'Pago' ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}>
                                        {payment.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={isPending}>
                                                <MoreVertical className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem>Ver Detalhes do Pagamento</DropdownMenuItem>
                                            {payment.status === 'Falhou' && (
                                                <DropdownMenuItem onClick={() => handleMarkAsPaid(payment.id)}>Marcar como Pago</DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem>Reembolsar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                </Table>
                
                {/* Paginação */}
                {filteredPayments.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredPayments.length)} a {Math.min(currentPage * itemsPerPage, filteredPayments.length)} de {filteredPayments.length} {filteredPayments.length === 1 ? 'pagamento' : 'pagamentos'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            return page === 1 || 
                                   page === totalPages || 
                                   Math.abs(page - currentPage) <= 1;
                          })
                          .map((page, index, array) => {
                            const prevPage = array[index - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;
                            
                            return (
                              <div key={page} className="flex items-center">
                                {showEllipsis && <span className="px-2">...</span>}
                                <Button
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="w-9"
                                >
                                  {page}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
