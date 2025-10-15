
"use client";

import { useEffect, useState, useTransition } from "react";
import DashboardHeader from "@/components/dashboard-header";
import SupportTicketForm from "@/components/support-ticket-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Loader2 } from "lucide-react";
import { getUserTickets, createTicket } from "@/lib/actions";
import { getUserTicketsClient, createTicketClient } from "@/lib/client-support";
import type { SupportTicket } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const fetchTickets = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await getUserTicketsClient(user.uid);
      setTickets(result);
    });
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const handleCreateTicket = async (data: { subject: string, message: string, priority: 'Normal' | 'Alta' }) => {
    if (!user) return false;

    let success = false;
    startTransition(async () => {
      const result = await createTicketClient({
        ...data,
        userId: user.uid,
        userName: user.displayName || "Usuário",
        userEmail: user.email || "",
      });

      if (result.success) {
        toast({
          title: "Ticket Enviado!",
          description: "Sua solicitação foi recebida. Entraremos em contato em breve.",
        });
        fetchTickets();
        success = true;
      } else {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
      }
    });
    return success;
  };
  
  const getStatusVariant = (status: SupportTicket['status']) => {
    switch (status) {
      case 'Aberto': return 'destructive';
      case 'Em Andamento': return 'secondary';
      case 'Resolvido': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Suporte ao Cliente" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <SupportTicketForm onSubmit={handleCreateTicket} isSubmitting={isPending} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LifeBuoy /> Seus Tickets de Suporte</CardTitle>
              <CardDescription>Acompanhe o status das suas solicitações. Clique em um ticket para ver os detalhes.</CardDescription>
            </CardHeader>
            <CardContent>
              {isPending && tickets.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map(ticket => (
                      <TableRow key={ticket.id} onClick={() => router.push(`/support/${ticket.id}`)} className="cursor-pointer">
                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                        <TableCell>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={getStatusVariant(ticket.status)}
                            className={
                                ticket.status === 'Em Andamento' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                ticket.status === 'Resolvido' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''
                            }
                          >
                            {ticket.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
