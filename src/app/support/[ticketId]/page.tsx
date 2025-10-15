
"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getTicketById, addTicketReply } from "@/lib/admin-actions";
import type { SupportTicket, TicketReply } from "@/lib/types";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatRelative } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { adminData } from "@/lib/admin-data";

const ADMIN_EMAILS = adminData.users
    .filter(u => u.adminRole === 'Super Admin' || (u.adminPermissions && u.adminPermissions.length > 0))
    .map(u => u.email);


const replySchema = z.object({
  message: z.string().min(1, "A mensagem não pode estar em branco."),
});

type ReplyFormValues = z.infer<typeof replySchema>;

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? '');

  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { message: "" },
  });

  const fetchTicket = () => {
    startTransition(async () => {
      const fetchedTicket = await getTicketById(ticketId);
      setTicket(fetchedTicket || null);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  const handleReplySubmit = async (values: ReplyFormValues) => {
    if (!user) return;
    
    const replyData: Omit<TicketReply, 'id' | 'createdAt'> = {
      authorId: user.uid,
      authorName: isAdmin ? "Admin" : (user.displayName || "Usuário"),
      authorRole: isAdmin ? 'admin' : 'user',
      message: values.message,
    };

    const auditInfo = { userId: user.uid, userName: user.displayName || user.email! };

    startTransition(async () => {
      await addTicketReply(ticketId, replyData, auditInfo);
      toast({ title: "Resposta enviada!" });
      form.reset();
      fetchTicket(); // Refetch to show the new reply
    });
  };
  
  const getStatusVariant = (status: SupportTicket['status']) => {
    switch (status) {
      case 'Aberto': return 'destructive';
      case 'Em Andamento': return 'secondary';
      case 'Resolvido': return 'default';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Ticket não encontrado</h2>
        <p className="text-muted-foreground">O ticket que você está procurando não existe ou foi movido.</p>
        <Button asChild variant="outline" className="mt-4">
            <Link href="/support"><ArrowLeft className="mr-2"/> Voltar para Suporte</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <Button asChild variant="ghost" size="sm" className="mb-4">
                <Link href={isAdmin ? "/admin/support" : "/support"}><ArrowLeft className="mr-2"/> Voltar para a lista</Link>
              </Button>
              <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
              <CardDescription>
                Ticket #{ticket.id.slice(-6)} aberto por {ticket.userName} em {format(new Date(ticket.createdAt), "dd/MM/yyyy 'às' HH:mm")}
              </CardDescription>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
                <Badge 
                    variant={getStatusVariant(ticket.status)}
                    className={cn(
                        "text-base",
                        ticket.status === 'Em Andamento' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        ticket.status === 'Resolvido' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''
                    )}
                >
                    {ticket.status}
                </Badge>
                <Badge variant="outline">Prioridade: {ticket.priority}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Mensagem Original */}
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarImage />
                <AvatarFallback>{ticket.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="w-full rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{ticket.userName}</p>
                  <p className="text-xs text-muted-foreground" title={new Date(ticket.createdAt).toLocaleString('pt-BR')}>
                    {formatRelative(new Date(ticket.createdAt), new Date(), { locale: ptBR })}
                  </p>
                </div>
                <p className="text-sm">{ticket.message}</p>
              </div>
            </div>

            {/* Respostas */}
            {ticket.replies?.map(reply => (
              <div key={reply.id} className={cn("flex items-start gap-4", reply.authorRole === 'admin' && "ml-auto flex-row-reverse")}>
                <Avatar>
                  <AvatarImage />
                  <AvatarFallback>{reply.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className={cn("w-full rounded-lg border p-4", reply.authorRole === 'admin' ? "bg-primary/10" : "bg-muted/50")}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{reply.authorName}</p>
                     <p className="text-xs text-muted-foreground" title={new Date(reply.createdAt).toLocaleString('pt-BR')}>
                        {formatRelative(new Date(reply.createdAt), new Date(), { locale: ptBR })}
                    </p>
                  </div>
                  <p className="text-sm">{reply.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        {ticket.status !== 'Resolvido' && (
            <CardFooter>
            <form onSubmit={form.handleSubmit(handleReplySubmit)} className="w-full space-y-4">
                <Textarea 
                placeholder="Digite sua resposta..." 
                rows={4}
                {...form.register("message")}
                />
                {form.formState.errors.message && <p className="text-sm text-red-500">{form.formState.errors.message.message}</p>}
                <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 animate-spin"/> : <Send className="mr-2"/>}
                Enviar Resposta
                </Button>
            </form>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
