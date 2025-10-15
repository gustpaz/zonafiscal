"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Check, X, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getUserByIdClient } from "@/lib/client-admin-data";
import { getPlansClient } from "@/lib/client-plans";
import { getTransactionsClient } from "@/lib/client-data";
import { createCheckoutSession, createCustomerPortalSession, updateSubscriptionPlan, cancelSubscription } from "@/lib/stripe/actions";
import { useToast } from "@/hooks/use-toast";
import type { User, Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import DashboardHeader from "@/components/dashboard-header";

export default function DowngradePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [userData, setUserData] = useState<User | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    Promise.all([
      getUserByIdClient(user.uid),
      getPlansClient(true), // includeRetention = true
      getTransactionsClient(user.uid)
    ]).then(([userData, plansData, transactions]) => {
      setUserData(userData);
      setPlans(plansData);
      setTransactionCount(transactions.length);
      setLoading(false);
      
      // Se usuário já está no Gratuito, redirecionar
      if (userData.plan === 'Gratuito') {
        toast({
          title: "Você já está no plano Gratuito",
          description: "Acesse Planos para fazer upgrade.",
        });
        router.push('/pricing');
      }
    }).catch(error => {
      console.error("Erro ao carregar dados:", error);
      setLoading(false);
    });
  }, [user, router, toast]);

  const handleKeepCurrentPlan = () => {
    toast({
      title: "Que bom que ficou!",
      description: "Continuaremos trabalhando para melhorar sua experiência.",
    });
    router.push('/dashboard');
  };

  const handleAcceptDownsell = async (plan: Plan) => {
    if (!user || !plan.priceIdMonthly) return;
    
    setProcessingPlan(plan.id);
    
    try {
      // Fazer downgrade automático via Stripe API
      const result = await updateSubscriptionPlan(user.uid, plan.priceIdMonthly);
      
      if (result.success) {
        toast({
          title: "Plano atualizado com sucesso! 🎉",
          description: result.message,
        });
        
        // Redirecionar para dashboard após 1 segundo
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        toast({
          title: "Erro ao atualizar plano",
          description: result.error || "Não foi possível processar a mudança de plano.",
          variant: "destructive"
        });
        setProcessingPlan(null);
      }
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a mudança de plano.",
        variant: "destructive"
      });
      setProcessingPlan(null);
    }
  };

  const handleConfirmFree = async () => {
    if (!user) return;
    
    setProcessingPlan('free');
    
    try {
      // Fazer downgrade para gratuito via Stripe API (cancela no fim do período)
      const result = await cancelSubscription(user.uid);
      
      if (result.success) {
        const expiresDate = new Date(result.expiresAt!).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
        
        toast({
          title: "Downgrade confirmado",
          description: `Você voltará ao plano Gratuito em ${expiresDate}. Até lá, continue aproveitando todos os recursos do seu plano atual.`,
          duration: 7000,
        });
        
        // Redirecionar para dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        toast({
          title: "Erro ao fazer downgrade",
          description: result.error || "Não foi possível processar o downgrade.",
          variant: "destructive"
        });
        setProcessingPlan(null);
      }
    } catch (error) {
      console.error("Erro ao fazer downgrade:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o downgrade.",
        variant: "destructive"
      });
      setProcessingPlan(null);
    }
  };

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!user) return;
    
    setProcessingPlan('cancel');
    setShowCancelDialog(false);
    
    try {
      // Cancelar subscription via Stripe API (no fim do período)
      const result = await cancelSubscription(user.uid);
      
      if (result.success) {
        const expiresDate = new Date(result.expiresAt!).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
        
        toast({
          title: "Assinatura cancelada 😢",
          description: `Sua assinatura foi cancelada. Você terá acesso aos recursos premium até ${expiresDate}.`,
          duration: 7000,
        });
        
        // Redirecionar para dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        toast({
          title: "Erro ao cancelar",
          description: result.error || "Não foi possível cancelar a assinatura.",
          variant: "destructive"
        });
        setProcessingPlan(null);
      }
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a assinatura.",
        variant: "destructive"
      });
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userData) return null;

  // Filtrar planos
  const currentPlan = plans.find(p => p.name === userData.plan);
  const freePlan = plans.find(p => p.name === 'Gratuito');
  const retentionPlans = plans.filter(p => 
    p.visibility === 'retention_only' && 
    p.price < (currentPlan?.price || 0)
  );
  
  const transactionsToArchive = Math.max(0, transactionCount - 50);
  const willArchive = transactionsToArchive > 0;

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Mudança de Plano" />
      
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">Quer cancelar sua assinatura? 😢</h1>
          <p className="text-lg text-muted-foreground">
            Sentiremos sua falta! Mas antes, que tal uma proposta mais acessível?
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Escolha uma das opções abaixo. Se preferir cancelar completamente, 
            você será direcionado para o portal seguro do Stripe.
          </p>
        </div>

        {/* Alerta de Perda de Dados */}
        {willArchive && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ Atenção:</strong> Você tem <strong>{transactionCount} transações</strong>.
              Ao voltar para o Gratuito, apenas as <strong>50 mais recentes</strong> permanecerão ativas.
              <strong className="block mt-2">
                {transactionsToArchive} transações serão ARQUIVADAS
              </strong>
              <span className="block text-xs mt-2">
                (Não serão deletadas, mas ficarão inacessíveis até você fazer upgrade novamente)
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de Opções */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Manter Plano Atual */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Manter {currentPlan?.name}</CardTitle>
              <CardDescription>Continue com todos os recursos</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div>
                <p className="text-3xl font-bold">
                  R$ {currentPlan?.price.toFixed(2).replace('.', ',')}
                  <span className="text-sm text-muted-foreground">/mês</span>
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {currentPlan?.features.transactions === -1 ? (
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-500" />
                    Transações ilimitadas
                  </li>
                ) : (
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-500" />
                    {currentPlan?.features.transactions} transações/mês
                  </li>
                )}
                {currentPlan?.features.aiReportLimit === -1 ? (
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-500" />
                    Relatórios IA ilimitados
                  </li>
                ) : (
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-500" />
                    {currentPlan?.features.aiReportLimit} relatórios IA/mês
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-green-500" />
                  Mantém todos os dados
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-green-500" />
                  Todos os recursos {currentPlan?.name}
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleKeepCurrentPlan} 
                variant="outline" 
                className="w-full"
              >
                Continuar com {currentPlan?.name}
              </Button>
            </CardFooter>
          </Card>

          {/* Planos de Retenção (Light, etc) */}
          {retentionPlans.map(plan => (
            <Card key={plan.id} className="flex flex-col border-primary ring-2 ring-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                🔥 OFERTA ESPECIAL
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="text-yellow-400" />
                  {plan.name}
                </CardTitle>
                <CardDescription>O melhor custo-benefício para você</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div>
                  <p className="text-3xl font-bold">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-sm text-green-500 font-semibold">
                    {Math.round(((currentPlan?.price || 0) - plan.price) / (currentPlan?.price || 1) * 100)}% de economia!
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  {plan.features.transactions === -1 ? (
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-green-500" />
                      Transações ilimitadas
                    </li>
                  ) : (
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-green-500" />
                      {plan.features.transactions} transações/mês
                      <Badge variant="secondary" className="text-xs">
                        {plan.features.transactions - 50}x mais que Gratuito!
                      </Badge>
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-500" />
                    {plan.features.aiReportLimit} relatórios IA/mês
                  </li>
                  {plan.features.pdfExport && (
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-green-500" />
                      Exportação PDF/CSV
                    </li>
                  )}
                  {plan.features.prioritySupport && (
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-green-500" />
                      Suporte por e-mail
                    </li>
                  )}
                </ul>
                
                {/* Gatilho Mental - Manter Dados */}
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="font-semibold text-primary flex items-center gap-2 text-sm">
                    <Check className="size-5 stroke-[3]" />
                    Mantém TODAS as suas {transactionCount} transações!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Diferente do Gratuito que arquivaria {transactionsToArchive > 0 ? transactionsToArchive : 'algumas'} transações
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button 
                  onClick={() => handleAcceptDownsell(plan)} 
                  className="w-full"
                  disabled={processingPlan === plan.id}
                >
                  {processingPlan === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mudar para {plan.name}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Você será levado ao Stripe para confirmar a mudança
                </p>
              </CardFooter>
            </Card>
          ))}

          {/* Plano Gratuito - COM AVISOS */}
          {freePlan && (
            <Card className="flex flex-col border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-orange-600" />
                  {freePlan.name}
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-400">
                  Voltar ao plano gratuito
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <p className="text-3xl font-bold">R$ 0</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-500" />
                    50 transações/mês
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-500" />
                    2 relatórios IA/mês
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="size-4 text-muted-foreground" />
                    <span className="line-through text-muted-foreground">PDF/CSV</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="size-4 text-muted-foreground" />
                    <span className="line-through text-muted-foreground">Suporte prioritário</span>
                  </li>
                </ul>
                
                {/* Alerta de Perda de Dados */}
                {willArchive && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-semibold text-destructive flex items-center gap-2 text-sm">
                      <AlertTriangle className="size-5" />
                      Você perderá acesso a {transactionsToArchive} transações!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Apenas as 50 transações mais recentes ficarão visíveis
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button 
                  onClick={handleConfirmFree} 
                  variant="outline" 
                  className="w-full border-orange-500 text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950"
                  disabled={processingPlan === 'free'}
                >
                  {processingPlan === 'free' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Fazer Downgrade para Gratuito
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Você será levado ao Stripe para confirmar a mudança
                </p>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Opção de Cancelamento Completo */}
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Quer cancelar completamente?
            </CardTitle>
            <CardDescription>
              Se nenhuma das opções acima te atende, você pode cancelar sua assinatura.
              {willArchive && (
                <span className="block mt-2 font-semibold text-destructive">
                  ⚠️ Atenção: {transactionsToArchive} transações serão arquivadas e você perderá acesso aos recursos premium.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              O cancelamento será feito através do portal seguro do Stripe, onde você poderá:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <Check className="size-4" />
                Ver o status da sua assinatura
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4" />
                Verificar quando sua assinatura expira
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4" />
                Confirmar o cancelamento de forma segura
              </li>
            </ul>
            <Button 
              onClick={handleCancelClick}
              variant="destructive"
              className="w-full"
              disabled={processingPlan === 'cancel'}
            >
              {processingPlan === 'cancel' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ir para Portal do Stripe e Cancelar
            </Button>
          </CardContent>
        </Card>

        {/* Explicação sobre Arquivamento */}
        {willArchive && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">❓ O que significa "arquivar" transações?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Suas transações antigas <strong>NÃO serão deletadas</strong>, mas ficarão em modo de "arquivo":
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">❌ Transações arquivadas:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Não aparecem no dashboard</li>
                    <li>• Não contam para relatórios</li>
                    <li>• Não contam para os limites</li>
                    <li>• Ficam "congeladas"</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-sm">✅ Mas você pode:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Reativá-las fazendo upgrade</li>
                    <li>• Elas estão seguras no banco</li>
                    <li>• Não são deletadas</li>
                    <li>• Histórico preservado</li>
                  </ul>
                </div>
              </div>
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  💡 <strong>Dica:</strong> Com o Plano Light por apenas R$ 14,90/mês, você mantém
                  <strong> TODAS as suas {transactionCount} transações ativas</strong> e ainda tem 
                  100 transações/mês + exportação PDF!
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Testemunhos */}
        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle>💬 Por que nossos usuários ficam?</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <blockquote className="italic text-sm text-muted-foreground border-l-2 border-primary pl-4">
              "Tentei cancelar mas o Plano Light me salvou! Por R$ 14,90 mantenho meu histórico 
              e ainda exporto em PDF para meu contador. Compensou muito!"
              <footer className="mt-2 not-italic font-semibold">
                - Maria S., Freelancer
              </footer>
            </blockquote>
            <blockquote className="italic text-sm text-muted-foreground border-l-2 border-primary pl-4">
              "Quase perdi 2 anos de transações voltando pro Gratuito. Aceitei o Light e 
              não me arrependo - é muito mais barato e mantém o essencial!"
              <footer className="mt-2 not-italic font-semibold">
                - João P., MEI
              </footer>
            </blockquote>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação de Cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="size-6 text-destructive" />
              Tem certeza que deseja cancelar?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-4">
                <p className="text-base">
                  Esta é uma ação importante. Ao cancelar sua assinatura, você:
                </p>
                
                <div className="space-y-3">
                  {/* Perda de Funcionalidades */}
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="font-semibold text-destructive mb-3 flex items-center gap-2">
                      <X className="size-5" />
                      Perderá acesso aos recursos premium:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <X className="size-4 text-destructive" />
                        Exportação de relatórios em PDF/CSV
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="size-4 text-destructive" />
                        Relatórios com Inteligência Artificial ilimitados
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="size-4 text-destructive" />
                        Previsões financeiras
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="size-4 text-destructive" />
                        Relatórios de contabilidade
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="size-4 text-destructive" />
                        Importação de CSV
                      </li>
                    </ul>
                  </div>

                  {/* Perda de Dados */}
                  {willArchive && (
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                      <p className="font-bold text-destructive mb-2 flex items-center gap-2 text-lg">
                        <AlertTriangle className="size-6" />
                        {transactionsToArchive} transações serão ARQUIVADAS!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Você tem <strong>{transactionCount} transações</strong> no total. 
                        Ao voltar para o Gratuito, apenas as <strong>50 mais recentes</strong> permanecerão visíveis.
                      </p>
                      <p className="text-sm text-destructive font-semibold mt-2">
                        Você perderá acesso a {transactionsToArchive} transações do seu histórico!
                      </p>
                    </div>
                  )}

                  {/* Alternativa Light */}
                  {retentionPlans.length > 0 && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <p className="font-semibold text-primary mb-2 flex items-center gap-2">
                        <Sparkles className="size-5" />
                        💡 Última chance: Ainda dá tempo!
                      </p>
                      <p className="text-sm">
                        Com o <strong>Plano Light por apenas R$ 14,90/mês</strong>, você:
                      </p>
                      <ul className="text-sm mt-2 space-y-1">
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-primary" />
                          <strong>Mantém TODAS as {transactionCount} transações</strong>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-primary" />
                          Continua exportando PDF/CSV
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-primary" />
                          Economiza 50% em relação ao Pro
                        </li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-3">
                        Role a página para cima e veja a oferta especial! 👆
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-base font-semibold pt-2">
                  Você realmente deseja continuar com o cancelamento?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Não, Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Ir para o Stripe e Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

