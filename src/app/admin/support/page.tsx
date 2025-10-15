
"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { getSupportTicketsClient, updateTicketStatusClient } from "@/lib/client-admin-support";
import type { SupportTicket } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";

type TicketStatus = SupportTicket['status'];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('support', false);

  const fetchTickets = () => {
    startTransition(async () => {
      try {
        const result = await getSupportTicketsClient();
        setTickets(result.tickets);
      } catch (error) {
        console.error("Erro ao buscar tickets:", error);
        toast({
          title: "Erro ao carregar tickets",
          description: "Não foi possível carregar os tickets de suporte.",
          variant: "destructive",
        });
      }
    });
  };

  // Filtros e paginação - MOVIDO PARA ANTES DOS RETURNS
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = 
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, itemsPerPage]);

  useEffect(() => {
    if (isAuthorized) {
      fetchTickets();
    }
  }, [isAuthorized]);

  // Reset para primeira página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
    if (!user) return;
    startTransition(async () => {
      try {
        await updateTicketStatusClient(ticketId, newStatus, user.uid);
        toast({ title: "Status do Ticket Atualizado!" });
        fetchTickets(); // Refetch to update UI
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do ticket.",
          variant: "destructive",
        });
      }
    });
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
      title="Acesso ao Suporte Negado"
      description="Você não tem permissões de administrador para gerenciar tickets de suporte."
    />;
  }

  if (isPending && tickets.length === 0) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LifeBuoy /> Central de Suporte</CardTitle>
        <CardDescription>Gerencie e responda aos tickets de suporte dos usuários.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por assunto, usuário ou email..." 
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
                <SelectItem value="Aberto">Aberto</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Resolvido">Resolvido</SelectItem>
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
              <TableHead>Assunto</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  Nenhum ticket encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTickets.map(ticket => (
              <TableRow key={ticket.id} onClick={() => router.push(`/support/${ticket.id}`)} className="cursor-pointer">
                <TableCell>
                  <p className="font-medium">{ticket.userName}</p>
                  <p className="text-sm text-muted-foreground">{ticket.userEmail}</p>
                </TableCell>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right">
                  <Select
                    value={ticket.status}
                    onValueChange={(newStatus) => {
                        handleStatusChange(ticket.id, newStatus as TicketStatus);
                    }}
                    disabled={isPending}
                    onClick={(e) => e.stopPropagation()} // Impede que o clique no Select propague para a linha
                  >
                    <SelectTrigger className="w-40 ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aberto">
                        <Badge variant="destructive">Aberto</Badge>
                      </SelectItem>
                      <SelectItem value="Em Andamento">
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Em Andamento</Badge>
                      </SelectItem>
                      <SelectItem value="Resolvido">
                        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Resolvido</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
        
        {/* Paginação */}
        {filteredTickets.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div className="text-sm text-muted-foreground">
              Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTickets.length)} a {Math.min(currentPage * itemsPerPage, filteredTickets.length)} de {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
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
  );
}
