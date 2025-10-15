
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Star, Zap, Info, X, TrendingUp, TrendingDown } from "lucide-react";
import DashboardHeader from "@/components/dashboard-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useTransition } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutSession } from "@/lib/stripe/actions";
import type { Plan } from "@/lib/types";
import { getPlansClient } from "@/lib/client-plans";
import { Skeleton } from "@/components/ui/skeleton";
import * as fbp from "@/lib/fpixel";
import { formatPlanFeatures, getPlanDescription, getPlanHighlight } from "@/lib/format-plan-features";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PricingPage() {
    const [isYearly, setIsYearly] = useState(false);
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [plans, setPlans] = useState<Plan[]>([]);
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Rastrear visualização da página de preços
        fbp.track('ViewContent', {
            content_name: 'Pricing Page',
            content_category: 'product_page',
            content_type: 'pricing'
        });

        startTransition(async () => {
            try {
                const fetchedPlans = await getPlansClient();
                setPlans(fetchedPlans);
            } catch (error) {
                console.error("Erro ao buscar planos:", error);
                toast({
                    title: "Erro ao carregar planos",
                    description: "Não foi possível carregar os planos. Tente novamente.",
                    variant: "destructive"
                });
            }
        });
    }, [toast]);

    const handleCheckout = async (priceId: string | undefined, planName?: string, planPrice?: number) => {
        if (!priceId) {
            toast({ title: "Erro", description: "Price ID não configurado para este plano.", variant: "destructive" });
            return;
        }
        if (!user) {
            router.push('/login');
            return;
        }

        // Rastrear AddToCart quando usuário clica em assinar
        fbp.track('AddToCart', {
            content_name: planName || 'Plano',
            content_type: 'product',
            value: planPrice || 0,
            currency: 'BRL'
        });

        setLoadingCheckout(true);
        try {
            // Rastrear InitiateCheckout ao iniciar o processo
            fbp.track('InitiateCheckout', {
                content_name: planName || 'Plano',
                value: planPrice || 0,
                currency: 'BRL'
            });

            const { url } = await createCheckoutSession(user.uid, priceId);
            if (url) {
                window.location.href = url;
            } else {
                 toast({ title: "Erro", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
                 setLoadingCheckout(false);
            }
        } catch (error) {
             toast({ title: "Erro", description: "Ocorreu um problema, tente novamente.", variant: "destructive" });
             setLoadingCheckout(false);
        }
    }

    const freePlan = plans.find(p => p.name === 'Gratuito');
    const proPlan = plans.find(p => p.name === 'Pro');

    const LoadingSkeleton = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
            <Skeleton className="h-[450px]" />
            <Skeleton className="h-[450px]" />
        </div>
    );

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <DashboardHeader title="Planos e Assinatura" />
            
            <div className="flex flex-col items-center gap-8">
                <div className="flex flex-col items-center text-center max-w-2xl">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">O plano certo para o seu negócio</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Comece de graça e faça o upgrade quando precisar de mais recursos. Preços simples e transparentes.
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <Label htmlFor="billing-cycle" className={!isYearly ? 'text-primary' : ''}>Mensal</Label>
                    <Switch id="billing-cycle" checked={isYearly} onCheckedChange={setIsYearly} />
                    <Label htmlFor="billing-cycle" className={isYearly ? 'text-primary' : ''}>
                        Anual <span className="text-green-400 font-medium">(Economize)</span>
                    </Label>
                </div>

                {isPending ? <LoadingSkeleton /> : (
                <TooltipProvider>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
                    {plans.map(plan => {
                     const features = formatPlanFeatures(plan.features, plan.name);
                     const description = getPlanDescription(plan.name);
                     const highlight = getPlanHighlight(plan.name);
                     const isCurrentPlan = user?.plan === plan.name;
                     
                     // Determinar se é upgrade ou downgrade baseado no preço
                     const currentPlan = plans.find(p => p.name === user?.plan);
                     const currentPrice = currentPlan?.price || 0;
                     const isUpgrade = plan.price > currentPrice;
                     const isDowngrade = plan.price < currentPrice;
                      
                      return (
                        <Card 
                          key={plan.id} 
                          className={cn(
                            "flex flex-col",
                            highlight && "border-primary ring-2 ring-primary"
                          )}
                        >
                          {highlight && (
                            <div className="py-1 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-t-lg text-center">
                              {highlight}
                            </div>
                          )}
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              {plan.name === 'Gratuito' ? <Zap /> : <Star className="text-yellow-400" />}
                              {plan.name}
                              {!isCurrentPlan && isUpgrade && (
                                <span className="inline-flex items-center gap-1 text-xs font-normal bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                                  <TrendingUp className="size-3" />
                                  Upgrade
                                </span>
                              )}
                              {!isCurrentPlan && isDowngrade && (
                                <span className="inline-flex items-center gap-1 text-xs font-normal bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-2 py-0.5 rounded-full">
                                  <TrendingDown className="size-3" />
                                  Downgrade
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription>{description}</CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow space-y-4">
                            <div>
                              {plan.price === 0 ? (
                                <p className="text-4xl font-bold">R$ 0</p>
                              ) : (
                                <>
                                  <p className="text-4xl font-bold">
                                    R$ {plan.price.toFixed(2).replace('.', ',')}
                                    <span className="text-lg font-medium text-muted-foreground">/mês</span>
                                  </p>
                                  {isYearly && <p className="text-sm text-muted-foreground">Cobrado anualmente</p>}
                                </>
                              )}
                            </div>
                            <ul className="space-y-2">
                              {features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  {feature.included ? (
                                    <Check className="size-5 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <X className="size-5 text-muted-foreground/50 flex-shrink-0" />
                                  )}
                                  <span className={cn(
                                    "text-sm",
                                    feature.included 
                                      ? "" 
                                      : "line-through text-muted-foreground/60"
                                  )}>
                                    {feature.text}
                                    {feature.tooltip && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="inline-block ml-1 size-3 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs">{feature.tooltip}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                          <CardFooter>
                            {isCurrentPlan ? (
                              <Button className="w-full" variant='outline' disabled>
                                Seu Plano Atual
                              </Button>
                            ) : (
                              <Button 
                                className={cn(
                                  "w-full",
                                  isDowngrade && "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                                variant={isDowngrade ? "outline" : "default"}
                                disabled={loadingCheckout}
                                onClick={() => handleCheckout(
                                  isYearly ? plan.priceIdYearly : plan.priceIdMonthly,
                                  plan.name,
                                  plan.price
                                )}
                              >
                                {loadingCheckout && <Loader2 className="mr-2 animate-spin" />}
                                {isUpgrade && "Fazer Upgrade"}
                                {isDowngrade && "Fazer Downgrade"}
                                {!isUpgrade && !isDowngrade && !isCurrentPlan && "Assinar"}
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </TooltipProvider>
                )}
            </div>
        </div>
    );
}
