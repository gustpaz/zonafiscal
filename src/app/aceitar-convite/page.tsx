"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { getInviteByToken, acceptInvite } from "@/lib/invite-tokens";
import type { Invite } from "@/lib/invite-tokens";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const token = searchParams?.get('token');
  
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token de convite não fornecido.");
      setLoading(false);
      return;
    }

    getInviteByToken(token).then(inviteData => {
      if (!inviteData) {
        setError("Convite não encontrado ou inválido.");
        setLoading(false);
        return;
      }

      // Verificar se expirou
      const expired = new Date(inviteData.expiresAt) < new Date();
      
      if (expired) {
        setError("Este convite expirou. Peça ao administrador para enviar um novo convite.");
        setLoading(false);
        return;
      }
      
      if (inviteData.status !== 'pending') {
        if (inviteData.status === 'accepted') {
          setError("Este convite já foi aceito.");
        } else {
          setError("Este convite não está mais disponível.");
        }
        setLoading(false);
        return;
      }

      setInvite(inviteData);
      setLoading(false);
    }).catch(err => {
      console.error("Erro ao carregar convite:", err);
      setError("Erro ao carregar convite.");
      setLoading(false);
    });
  }, [token]);

  const handleAccept = async () => {
    if (!invite || !token) return;
    
    // Se usuário não está logado, salvar token e redirecionar para signup
    if (!user) {
      localStorage.setItem('pending_invite_token', token);
      localStorage.setItem('pending_invite_email', invite.email);
      router.push(`/signup?email=${encodeURIComponent(invite.email)}`);
      return;
    }
    
    // Verificar se o email corresponde
    if (user.email !== invite.email) {
      toast({
        title: "Email não corresponde",
        description: `Este convite foi enviado para ${invite.email}, mas você está logado como ${user.email}.`,
        variant: "destructive"
      });
      return;
    }
    
    setAccepting(true);
    
    try {
      await acceptInvite(token, user.uid);
      
      toast({
        title: "Convite aceito!",
        description: `Bem-vindo à equipe de ${invite.companyName}!`
      });
      
      // Redirecionar para dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao aceitar convite:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aceitar o convite.",
        variant: "destructive"
      });
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Convite Inválido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/">Ir para Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Aceitando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Convite para Equipe</CardTitle>
          <CardDescription className="text-center">
            Você foi convidado para colaborar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <Avatar className="h-20 w-20 mx-auto">
              <AvatarImage src={invite.inviterAvatar} />
              <AvatarFallback className="text-2xl">
                {invite.inviterName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{invite.inviterName}</p>
              <p className="text-muted-foreground">convidou você para</p>
              <p className="text-lg font-semibold text-primary">{invite.companyName}</p>
            </div>
          </div>
          
          <Alert>
            <AlertDescription>
              Como membro da equipe, você terá acesso aos dados financeiros 
              da empresa conforme as permissões definidas pelo administrador.
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-semibold">Informações do Convite:</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>📧 Email: {invite.email}</p>
              <p>🏢 Empresa: {invite.companyName}</p>
              <p>📦 Plano: {invite.ownerPlan}</p>
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expira em: {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          
          {user && user.email !== invite.email && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Atenção:</strong> Este convite foi enviado para <strong>{invite.email}</strong>, 
                mas você está logado como <strong>{user.email}</strong>.
                <br />
                <br />
                Você precisa fazer login com a conta correta ou criar uma nova conta com o email do convite.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {user ? (
            user.email === invite.email ? (
              <Button onClick={handleAccept} className="w-full" size="lg">
                <CheckCircle className="mr-2 h-5 w-5" />
                Aceitar Convite
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Fazer Login com Conta Correta</Link>
              </Button>
            )
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center w-full">
                Você precisa criar uma conta para aceitar o convite
              </p>
              <Button onClick={handleAccept} className="w-full" size="lg">
                Criar Conta e Aceitar
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Já Tenho Conta</Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

