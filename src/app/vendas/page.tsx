
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, PieChart, Star, Sparkles, ShieldCheck, ArrowRightLeft, BotMessageSquare, FilePieChart, Menu, Target, CalendarClock, Loader2, X } from "lucide-react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState, useEffect } from "react";
import Image from "next/image";
import { getPlansClient } from "@/lib/client-plans";
import type { Plan } from "@/lib/types";
import * as fbp from "@/lib/fpixel";
import { formatPlanFeatures, getPlanDescription, getPlanHighlight } from "@/lib/format-plan-features";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "#funcionalidades", label: "Funcionalidades" },
    { href: "#como-funciona", label: "Como Funciona" },
    { href: "#planos", label: "Planos" },
    { href: "#faq", label: "FAQ" },
];

// Função removida - agora usando formatPlanFeatures do @/lib/format-plan-features

export default function VendasPage() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);

    const handlePlanClick = (planName: string, planPrice: number) => {
        // Rastrear AddToCart ao clicar em um plano
        fbp.track('AddToCart', {
            content_name: planName,
            content_type: 'product',
            value: planPrice,
            currency: 'BRL'
        });

        // Sempre redireciona para signup
        // Usuário cria conta gratuita e depois pode fazer upgrade se quiser
        window.location.href = '/signup';
    };

    useEffect(() => {
        // Rastrear visualização da página de vendas
        fbp.track('ViewContent', {
            content_name: 'Landing Page - Vendas',
            content_category: 'product_page',
            content_type: 'pricing'
        });

        getPlansClient().then(fetchedPlans => {
            setPlans(fetchedPlans);
            setLoadingPlans(false);
        }).catch(error => {
            console.error("Erro ao carregar planos:", error);
            setLoadingPlans(false);
        });
    }, []);

    // Removido - não precisa mais converter
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Zona Fiscal Logo" width={28} height={28} className="size-7" />
                        <span className="text-xl font-bold">Zona Fiscal</span>
                    </Link>
                    <nav className="hidden items-center gap-6 md:flex">
                        {navItems.map(item => (
                            <Link key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">{item.label}</Link>
                        ))}
                    </nav>
                    <div className="hidden items-center gap-4 md:flex">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Entrar</Link>
                        </Button>
                        <Button asChild>
                             <Link href="/signup">Criar Conta Grátis</Link>
                        </Button>
                    </div>
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu />
                                <span className="sr-only">Abrir menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                            <div className="flex flex-col gap-6 p-6">
                                <Link href="/" className="flex items-center gap-2 mb-4">
                                    <Image src="/logo.png" alt="Zona Fiscal Logo" width={28} height={28} className="size-7" />
                                    <span className="text-xl font-bold">Zona Fiscal</span>
                                </Link>
                                <nav className="flex flex-col gap-4">
                                    {navItems.map(item => (
                                        <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary">{item.label}</Link>
                                    ))}
                                </nav>
                                <div className="flex flex-col gap-4 mt-auto">
                                    <Button variant="outline" asChild>
                                        <Link href="/login">Entrar</Link>
                                    </Button>
                                    <Button asChild>
                                        <Link href="/signup">Criar Conta Grátis</Link>
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
            
            <main className="flex-1">
                {/* Hero Section */}
                <section className="py-20 md:py-32">
                    <div className="container mx-auto px-4 text-center md:px-6">
                        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                           O Fim da Confusão Financeira para Autônomos e Freelancers
                        </h1>
                         <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-5xl">Você é especialista no seu trabalho. Deixa a organização das contas com a gente.</h2>
                        <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
                           Feito para o freelancer, autônomo e MEI que mistura a conta pessoal com a da empresa. Continue usando seu banco do jeito que preferir, nós separamos tudo e te mostramos o lucro real do seu negócio.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Button size="lg" asChild>
                                <Link href="/signup">Comece de graça e organize-se</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Funcionalidades Section */}
                <section id="funcionalidades" className="bg-muted py-20 md:py-24">
                    <div className="container mx-auto px-4 md:px-6 space-y-20">
                        <div className="mx-auto max-w-3xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight">O fim da planilha "CPF x CNPJ"</h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Nossas ferramentas foram desenhadas para quem vive essa realidade. Descubra o verdadeiro lucro do seu negócio, mesmo que as contas estejam misturadas.
                            </p>
                        </div>

                        {/* Feature 1: AI Categorization */}
                        <div className="grid items-center gap-12 md:grid-cols-2">
                            <div>
                                <BotMessageSquare className="size-12 text-primary" />
                                <h3 className="mt-6 text-2xl font-bold">Sua Compra é Pessoal ou da Empresa? A IA Responde.</h3>
                                <p className="mt-4 text-muted-foreground">
                                    Pare de quebrar a cabeça. Nossa Inteligência Artificial lê a descrição de cada transação (como "Supermercado Atacadão" ou "Assinatura Adobe") e sugere se ela é <span className="font-semibold text-foreground">pessoal</span>, da <span className="font-semibold text-foreground">empresa</span> ou <span className="font-semibold text-foreground">mista</span>. Você só precisa confirmar.
                                </p>
                                <ul className="mt-6 space-y-2">
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Sugestões inteligentes para cada lançamento.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Classifique despesas mistas com um clique.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Economize horas de trabalho manual.</span></li>
                                </ul>
                            </div>
                             <div className="rounded-lg bg-card p-4 shadow-lg">
                                <Image src="/1.png" alt="App Zona Fiscal categorizando despesas com Inteligência Artificial entre pessoal e empresarial" className="rounded-md" width={600} height={400} />
                             </div>
                        </div>

                        {/* Feature 2: Reporting */}
                        <div className="grid items-center gap-12 md:grid-cols-2">
                             <div className="rounded-lg bg-card p-4 shadow-lg md:order-last">
                                <Image src="/2.png" alt="Relatório de lucro real para autônomos no app Zona Fiscal, mostrando o resultado líquido do negócio" className="rounded-md" width={600} height={400} />
                             </div>
                            <div>
                                <FilePieChart className="size-12 text-primary" />
                                <h3 className="mt-6 text-2xl font-bold">Relatórios que Mostram seu Lucro de Verdade</h3>
                                <p className="mt-4 text-muted-foreground">
                                    Nossos dashboards transformam seus dados em informações fáceis de entender. Veja o lucro líquido do seu negócio, já descontando aquele iFood que você pagou com a conta da empresa. Simples assim, para você tomar decisões melhores.
                                </p>
                                <ul className="mt-6 space-y-2">
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Gráficos de entradas vs. saídas.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Distribuição de gastos (pessoal vs. empresa).</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Exportação de relatórios em PDF com um clique.</span></li>
                                </ul>
                            </div>
                        </div>

                        {/* Feature 3: Loans */}
                        <div className="grid items-center gap-12 md:grid-cols-2">
                            <div>
                                <ArrowRightLeft className="size-12 text-primary" />
                                <h3 className="mt-6 text-2xl font-bold">Controle o "Empréstimo" entre Você e sua Empresa</h3>
                                <p className="mt-4 text-muted-foreground">
                                    É comum o dono injetar dinheiro na empresa ou usar o caixa para uma despesa pessoal. Registre esses movimentos como aportes (PF → PJ) ou retiradas (PJ → PF) e saiba exatamente quem deve a quem, sem maquiar o lucro real do seu negócio.
                                </p>
                                 <ul className="mt-6 space-y-2">
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Registre aportes pessoais na empresa (empréstimo para PJ).</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Registre retiradas para fins pessoais (empréstimo para PF).</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Balanço atualizado em tempo real: PF x PJ.</span></li>
                                </ul>
                            </div>
                            <div className="rounded-lg bg-card p-4 shadow-lg">
                                <Image src="/3.png" alt="Tela de controle de empréstimos entre pessoa física e empresa no Zona Fiscal" className="rounded-md" width={600} height={400} />
                             </div>
                        </div>
                        
                        {/* Feature 5: Goals and Budgets */}
                        <div className="grid items-center gap-12 md:grid-cols-2">
                            <div className="rounded-lg bg-card p-4 shadow-lg md:order-last">
                                <Image src="/4.png" alt="Gestão de metas e orçamentos para freelancers e profissionais liberais no Zona Fiscal" className="rounded-md" width={600} height={400} />
                            </div>
                            <div>
                                <Target className="size-12 text-primary" />
                                <h3 className="mt-6 text-2xl font-bold">Defina seu "Salário" e Metas de Lucro</h3>
                                <p className="mt-4 text-muted-foreground">
                                    Planeje o futuro e mantenha seus gastos sob controle. Crie metas de lucro para o seu negócio e orçamentos para categorias de despesas (como "Lazer" ou "Marketing"), para nunca mais se perder nas contas.
                                </p>
                                 <ul className="mt-6 space-y-2">
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Estabeleça metas de lucro e acompanhe o progresso.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Crie orçamentos mensais para despesas específicas.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Receba alertas visuais ao se aproximar ou exceder um orçamento.</span></li>
                                </ul>
                            </div>
                        </div>

                         {/* Feature 6: Forecast */}
                        <div className="grid items-center gap-12 md:grid-cols-2">
                             <div className="rounded-lg bg-card p-4 shadow-lg">
                                <Image src="/5.png" alt="Previsão de despesas futuras e contas a pagar para MEI e autônomo no Zona Fiscal" className="rounded-md" width={600} height={400} />
                             </div>
                            <div>
                                <CalendarClock className="size-12 text-primary" />
                                <h3 className="mt-6 text-2xl font-bold">Preveja as Contas a Pagar (Sem Susto)</h3>
                                <p className="mt-4 text-muted-foreground">
                                   Antecipe seus gastos. Ao registrar contas parceladas ou recorrentes, nosso sistema projeta suas despesas futuras, dando a você uma visão clara do que está por vir e ajudando no planejamento do fluxo de caixa.
                                </p>
                                <ul className="mt-6 space-y-2">
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Saiba quanto você tem a pagar no próximo mês.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Melhore seu planejamento financeiro e evite surpresas.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Funciona automaticamente com base nas suas transações parceladas.</span></li>
                                </ul>
                            </div>
                        </div>

                        {/* Feature 4: Audit Trail */}
                        <div className="grid items-center gap-12 md:grid-cols-2">
                            <div className="rounded-lg bg-card p-4 shadow-lg md:order-last">
                                <Image src="/6.png" alt="Trilha de auditoria imutável para garantir segurança dos dados financeiros" className="rounded-md" width={600} height={400} />
                             </div>
                            <div>
                                <ShieldCheck className="size-12 text-primary" />
                                <h3 className="mt-6 text-2xl font-bold">Segurança e Transparência Total</h3>
                                <p className="mt-4 text-muted-foreground">
                                   Sua tranquilidade é nossa prioridade. Cada ação (criação, edição ou exclusão) é registrada em uma trilha de auditoria imutável, como um blockchain. Isso garante a integridade total dos seus dados.
                                </p>
                                <ul className="mt-6 space-y-2">
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Registro de todas as atividades na sua conta.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Verificação de integridade para evitar adulterações.</span></li>
                                    <li className="flex items-center gap-2"><Check className="size-5 text-green-500" /><span>Exporte relatórios de auditoria para sua contabilidade.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                 {/* Como Funciona Section */}
                <section id="como-funciona" className="py-20 md:py-24">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="mx-auto max-w-3xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight">Sua bagunça vira clareza em 3 passos</h2>
                             <p className="mt-4 text-lg text-muted-foreground">
                                É mais simples do que você imagina.
                            </p>
                        </div>
                        <div className="mt-16 grid items-start gap-12 md:grid-cols-3">
                            <div className="flex flex-col items-center text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-2xl font-bold text-primary">1</div>
                                <h3 className="mt-6 text-xl font-semibold">Cadastre o que Entra e Sai</h3>
                                <p className="mt-2 text-muted-foreground">Adicione suas movimentações do dia a dia. Do pagamento de um cliente à compra no supermercado. Sem complicação.</p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-2xl font-bold text-primary">2</div>
                                <h3 className="mt-6 text-xl font-semibold">Confirme a Sugestão da IA</h3>
                                <p className="mt-2 text-muted-foreground">Nossa IA sugere se o gasto é da empresa, pessoal ou misto. Você só dá o "ok" e pronto. A mágica acontece aqui.</p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                 <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-2xl font-bold text-primary">3</div>
                                <h3 className="mt-6 text-xl font-semibold">Tome Decisões com Clareza</h3>
                                <p className="mt-2 text-muted-foreground">Veja gráficos que mostram seu lucro real, seus maiores ralos de dinheiro e onde você pode economizar de verdade.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Depoimentos Section */}
                <section className="bg-muted py-20 md:py-24">
                     <div className="container mx-auto px-4 md:px-6">
                         <div className="mx-auto max-w-3xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight">Feito para quem faz acontecer</h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Freelancers, autônomos e donos de pequenos negócios já estão no controle de suas finanças.
                            </p>
                        </div>
                         <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                             <Card>
                                 <CardContent className="pt-6">
                                    <p className="italic">"Finalmente entendi para onde meu dinheiro estava indo! O Zona Fiscal me mostrou que muitas despesas que eu achava que eram 'pessoais' eram, na verdade, do negócio. A clareza que eu ganhei é incrível."</p>
                                     <div className="mt-4 flex items-center gap-4">
                                        <Image className="size-12 rounded-full" src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Avatar de Juliana S., Designer Gráfica e usuária do Zona Fiscal" width={48} height={48} data-ai-hint="user avatar" />
                                         <div>
                                            <p className="font-semibold">Juliana S., Designer Gráfica</p>
                                            <p className="text-sm text-muted-foreground">Usuária Pro há 6 meses</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                             <Card>
                                 <CardContent className="pt-6">
                                     <p className="italic">"Eu sempre misturei tudo na mesma conta. Com o Zona Fiscal, eu defino um 'salário' e a IA me avisa se estou passando dos limites. Mudou meu jogo financeiro e evitou que eu tirasse dinheiro demais da empresa."</p>
                                     <div className="mt-4 flex items-center gap-4">
                                        <Image className="size-12 rounded-full" src="https://i.pravatar.cc/150?u=a042581f4e29026705d" alt="Avatar de Marcos T., Desenvolvedor e usuário do Zona Fiscal" width={48} height={48} data-ai-hint="user avatar" />
                                         <div>
                                            <p className="font-semibold">Marcos T., Desenvolvedor</p>
                                            <p className="text-sm text-muted-foreground">Usuário Pro há 1 ano</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardContent className="pt-6">
                                     <p className="italic">"A função de relatório em PDF é fantástica. Mando todo mês para minha contadora e ela adora a organização. Mostra exatamente o que foi gasto com o quê, sem confusão entre CPF e CNPJ. Economizo tempo e dinheiro."</p>
                                     <div className="mt-4 flex items-center gap-4">
                                        <Image className="size-12 rounded-full" src="https://i.pravatar.cc/150?u=a042581f4e29026706d" alt="Avatar de Carla M., Social Media e usuária do Zona Fiscal" width={48} height={48} data-ai-hint="user avatar" />
                                         <div>
                                            <p className="font-semibold">Carla M., Social Media</p>
                                            <p className="text-sm text-muted-foreground">Usuária Pro há 3 meses</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                         </div>
                    </div>
                </section>

                {/* Planos Section */}
                <section id="planos" className="py-20 md:py-24">
                     <div className="container mx-auto flex flex-col items-center gap-8 px-4 md:px-6">
                        <div className="flex flex-col items-center text-center max-w-2xl">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Um plano para cada fase do seu negócio</h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Comece de graça e evolua quando precisar. Simples e transparente.
                            </p>
                        </div>

                        {loadingPlans ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                        <TooltipProvider>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-4xl mt-8">
                            {plans.map(plan => {
                              const features = formatPlanFeatures(plan.features, plan.name);
                              const description = getPlanDescription(plan.name);
                              const highlight = getPlanHighlight(plan.name);
                              const cta = plan.name === 'Gratuito' ? "Começar Grátis" : "Assinar Agora";
                              
                              return (
                                <Card key={plan.id} className={`flex flex-col ${highlight ? "border-primary ring-2 ring-primary" : ""}`}>
                                   {highlight && (
                                        <div className="py-1 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-t-lg text-center">
                                            {highlight}
                                        </div>
                                   )}
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {plan.name === 'Gratuito' ? <Sparkles className="text-primary"/> : <Star className="text-yellow-400"/>}
                                            {plan.name}
                                        </CardTitle>
                                        <CardDescription>{description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                        <div>
                                            {plan.price === 0 ? (
                                                <p className="text-4xl font-bold">R$ 0</p>
                                            ) : (
                                                 <div>
                                                    <p className="text-4xl font-bold">
                                                        R$ {plan.price.toFixed(2).replace('.', ',')}
                                                        <span className="text-lg font-medium text-muted-foreground">/mês</span>
                                                    </p>
                                                </div>
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
                                                      "text-sm text-muted-foreground",
                                                      !feature.included && "line-through opacity-60"
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
                                        <Button 
                                            className="w-full" 
                                            variant={highlight ? 'default' : 'outline'} 
                                            size="lg"
                                            onClick={() => {
                                                handlePlanClick(plan.name, plan.price);
                                            }}
                                        >
                                            {cta}
                                        </Button>
                                    </CardFooter>
                                </Card>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                        )}
                    </div>
                </section>
                
                 {/* FAQ Section */}
                <section id="faq" className="bg-muted py-20 md:py-24">
                     <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                         <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight">Dúvidas Frequentes sobre Controle Financeiro</h2>
                         </div>
                         <Accordion type="single" collapsible className="w-full mt-8">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Preciso ter CNPJ para usar o sistema?</AccordionTrigger>
                                <AccordionContent>
                                Não, de forma alguma! O Zona Fiscal é perfeito tanto para profissionais autônomos que atuam com CPF quanto para pequenas empresas com CNPJ (MEI, SLU, etc.). O foco é organizar a movimentação financeira, independentemente da sua formalização.
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="item-2">
                                <AccordionTrigger>Preciso ter uma conta de banco PJ para usar?</AccordionTrigger>
                                <AccordionContent>
                                Não. O Zona Fiscal foi desenhado para resolver o problema central de quem mistura as finanças. Seja você alguém que usa uma única conta pessoal para tudo, ou alguém que já tem uma conta PJ mas acaba usando-a para despesas pessoais (ou vice-versa), o sistema vai te ajudar a ter clareza.
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="item-3">
                                <AccordionTrigger>Meus dados financeiros estão seguros?</AccordionTrigger>
                                <AccordionContent>
                                Sim. A segurança é nossa prioridade. Utilizamos as melhores práticas de criptografia e segurança do mercado, e os dados são armazenados de forma segura na nuvem. A função de Trilha de Auditoria, por exemplo, cria um registro imutável de suas transações, garantindo que nenhum dado possa ser alterado sem que você saiba.
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="item-4">
                                <AccordionTrigger>Como a IA me ajuda na prática a separar despesas?</AccordionTrigger>
                                <AccordionContent>
                                Nossa Inteligência Artificial atua como um consultor financeiro. Ela analisa a descrição de cada gasto e sugere se ele é "Pessoal", "Empresarial" ou "Misto", aprendendo com suas escolhas. Ela também te alerta se você está gastando mais do que deveria no pessoal e gera relatórios com insights práticos para melhorar sua saúde financeira.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-5">
                                <AccordionTrigger>Como funciona o controle de empréstimos PF e PJ?</AccordionTrigger>
                                <AccordionContent>
                                Você pode registrar facilmente quando tira dinheiro da empresa para uso pessoal (retirada) ou quando injeta dinheiro pessoal no caixa do negócio (aporte). O sistema mantém um balanço claro desses valores, mostrando exatamente quem deve a quem, para que suas contas estejam sempre em dia e seu lucro real não seja mascarado.
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="item-6">
                                <AccordionTrigger>Posso cancelar o plano Pro a qualquer momento?</AccordionTrigger>
                                <AccordionContent>
                                Sim. Você pode cancelar sua assinatura a qualquer momento, sem burocracia. Você continuará com acesso aos recursos Pro até o final do período que já foi pago.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </section>
            </main>
            
             {/* Footer */}
            <footer className="border-t">
                <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-8 px-4 md:flex-row md:px-6">
                    <div className="flex items-center gap-2">
                       <Image src="/logo.png" alt="Zona Fiscal Logo" width={24} height={24} className="size-6" />
                        <span className="font-semibold">Zona Fiscal</span>
                    </div>
                    <p className="text-sm text-muted-foreground">&copy; 2025 Zona Fiscal. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}

    
