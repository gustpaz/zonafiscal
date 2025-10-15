
"use client";

import { useAuth } from "@/hooks/use-auth";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserByIdClient } from "@/lib/client-admin-data";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, ArrowRightLeft, FileText, Settings, Shield, LogOut, ShieldCheck, CreditCard, CalendarClock, Upload, Goal, LifeBuoy, Users, Handshake, Calculator, ChevronRight, UserCheck, DollarSign, BarChart3, Mail, Zap, TrendingUp, History, Lock, Crown, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from "./ui/button";
import { getUserById } from "@/lib/admin-data";
import CampaignBanner from "./campaign-banner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LockedMenuButton } from './locked-menu-item';


export function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { canImportCSV, canExportPDF, canUseForecast, canUseAccountingReports, canUseTeam } = usePlanFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCheckedDebugPage, setHasCheckedDebugPage] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const publicRoutes = ["/login", "/signup", "/vendas"];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAdminRoute = pathname.startsWith('/admin');
  const isDebugPage = pathname === '/admin/debug';

  useEffect(() => {
    if (user) {
      getUserByIdClient(user.uid).then(data => {
        setUserData(data);
      }).catch(error => {
        console.error("Erro ao buscar dados do usuário:", error);
      });
    }
  }, [user]);

  useEffect(() => {
    if (loading) return; // Não faz nada enquanto carrega

    const checkAdminAccess = async () => {
      
      if (!user) {
        if (!isPublicRoute && pathname !== '/') {
      router.push('/');
        }
        return;
    }

    // Se há usuário e ele está em uma rota pública, redireciona para o dashboard
      if (isPublicRoute) {
      router.push('/dashboard');
        return;
      }

      // EXCEÇÃO PRIORITÁRIA: Página de debug NUNCA redireciona
      if (isDebugPage) {
        if (!hasCheckedDebugPage) {
          setHasCheckedDebugPage(true);
        }
        return; // Para aqui, não continua a verificação
      }

      // Sempre verifica se o usuário é admin para mostrar o menu
      try {
        // Verificação baseada no email (prioritária)
        const adminEmails = ['gustpaz@gmail.com', 'admin@zonafiscal.com', 'luxosegcontato@gmail.com'];
        const isEmailAdmin = user.email && adminEmails.includes(user.email);
        
        let userIsAdmin = isEmailAdmin;
        
        // Se não for admin por email, verifica no Firestore
        if (!isEmailAdmin) {
          const userData = await getUserById(user.uid);
          userIsAdmin = userData && (
            userData.adminRole === 'Super Admin' || 
            (userData.adminPermissions && userData.adminPermissions.length > 0)
          );
        }
        
        
        setIsAdmin(!!userIsAdmin);

        // Se o usuário tenta acessar outras rotas de admin, verifica permissões
        if (isAdminRoute && !userIsAdmin) {
        router.push('/dashboard');
    }
      } catch (error) {
        console.error('Erro ao verificar permissões de admin:', error);
        setIsAdmin(false);
        
        if (isAdminRoute) {
          router.push('/dashboard');
        }
      }
    };

    checkAdminAccess();
  }, [user, loading, pathname, isPublicRoute, isAdminRoute, isDebugPage, router, hasCheckedDebugPage]);
  

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Image 
          src="/loading.png" 
          alt="Carregando..." 
          width={48} 
          height={48}
          className="size-12 animate-pulse"
          priority
        />
      </div>
    );
  }
  
  if (!user) {
      // Permite renderizar a página de vendas (home) e rotas públicas se não estiver logado
      if (isPublicRoute || pathname === '/') {
          return <>{children}</>
      }
      // Para outras rotas, o useEffect já terá iniciado o redirecionamento.
      // Retornar um loader ou null evita renderizar conteúdo protegido.
      return (
        <div className="flex h-screen w-full items-center justify-center">
        <Image 
          src="/loading.png" 
          alt="Carregando..." 
          width={48} 
          height={48}
          className="size-12 animate-pulse"
          priority
        />
        </div>
      );
  }
  
  // Se o usuário está logado e em uma rota pública, o useEffect redirecionará.
  // Retornar um loader enquanto o redirecionamento acontece.
   if (isPublicRoute) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Image 
          src="/loading.png" 
          alt="Carregando..." 
          width={48} 
          height={48}
          className="size-12 animate-pulse"
          priority
        />
      </div>
    );
  }
  

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <Image 
              src="/logo.png" 
              alt="Zona Fiscal" 
              width={32} 
              height={32}
              className="size-8"
            />
            <h1 className="text-2xl font-bold text-foreground font-headline group-data-[collapsible=icon]:-ml-2 group-data-[collapsible=icon]:opacity-0 transition-all duration-200">Zona Fiscal</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Transações">
                <Link href="/transactions">
                  <ArrowRightLeft />
                  <span>Transações</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Empréstimos">
                <Link href="/loans">
                  <Handshake />
                  <span>Empréstimos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <LockedMenuButton 
                href="/reports"
                icon={FileText}
                label="Relatórios"
                tooltip={canExportPDF ? "Relatórios" : "Apenas para planos pagos"}
                locked={!canExportPDF}
                upgradeMessage="Faça upgrade e gere relatórios financeiros com IA!"
              />
            </SidebarMenuItem>
             <SidebarMenuItem>
              <LockedMenuButton 
                href="/forecast"
                icon={CalendarClock}
                label="Previsão"
                tooltip={canUseForecast ? "Previsão" : "Apenas para planos pagos"}
                locked={!canUseForecast}
                upgradeMessage="Faça upgrade e tenha previsões de despesas com IA!"
              />
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Metas">
                <Link href="/goals">
                  <Goal />
                  <span>Metas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <LockedMenuButton 
                href="/team"
                icon={Users}
                label="Equipe"
                tooltip={canUseTeam ? "Equipe" : "Apenas para planos pagos"}
                locked={!canUseTeam}
                upgradeMessage="Faça upgrade e convide membros para sua equipe!"
              />
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  {!canImportCSV ? (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <SidebarMenuButton 
                              disabled={true}
                              className="opacity-60 cursor-not-allowed w-full"
                            >
                              <Lock className="size-4" />
                              <span>Importar</span>
                              <Crown className="ml-auto size-3 text-amber-500" />
                            </SidebarMenuButton>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 p-4">
                          <div className="space-y-3">
                            <div>
                              <p className="font-semibold text-amber-900 dark:text-amber-100">🔒 Funcionalidade Premium</p>
                              <p className="text-xs mt-1 text-amber-700 dark:text-amber-300">Faça upgrade para um plano pago e importe centenas de transações de uma vez!</p>
                            </div>
                            <Link 
                              href="/pricing"
                              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-semibold py-2 px-3 rounded-md transition-all shadow-sm hover:shadow-md"
                            >
                              <Crown className="size-3" />
                              Fazer Upgrade
                            </Link>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <SidebarMenuButton tooltip="Importar">
                      <Upload />
                      <span>Importar</span>
                      <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-90" />
                    </SidebarMenuButton>
                  )}
                </CollapsibleTrigger>
                {canImportCSV && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                <Link href="/import">
                  <Upload />
                            <span>Importar CSV</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                        <Link href="/import-history">
                          <History />
                          <span>Histórico</span>
                </Link>
                      </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </Collapsible>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Auditoria">
                <Link href="/audit">
                  <ShieldCheck />
                  <span>Auditoria</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <LockedMenuButton 
                href="/contabilidade"
                icon={Calculator}
                label="Contabilidade"
                tooltip={canUseAccountingReports ? "Contabilidade" : "Apenas para planos pagos"}
                locked={!canUseAccountingReports}
                upgradeMessage="Faça upgrade e tenha relatórios contábeis (DRE) profissionais!"
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Planos">
                <Link href="/pricing">
                  <CreditCard />
                  <span>Planos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Suporte">
                <Link href="/support">
                  <LifeBuoy />
                  <span>Suporte</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Configurações">
                <Link href="/settings">
                  <Settings />
                  <span>Configurações</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             {isAdmin && (
                <Collapsible asChild>
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Admin">
                    <Shield />
                    <span>Admin</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/dashboard">
                              <LayoutDashboard />
                              <span>Dashboard</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/plans">
                              <CreditCard />
                              <span>Planos</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/users">
                              <UserCheck />
                              <span>Usuários</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/payments">
                              <DollarSign />
                              <span>Pagamentos</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/marketing">
                              <BarChart3 />
                              <span>Marketing</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/tracking">
                          <BarChart3 />
                          <span>Rastreamento</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/analytics">
                          <TrendingUp />
                          <span>Analytics</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/integrations">
                              <Zap />
                              <span>Integrações</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/lgpd">
                              <ShieldCheck />
                              <span>LGPD</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/support">
                              <LifeBuoy />
                              <span>Suporte</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/admin/debug">
                              <Settings />
                              <span>Debug</span>
                    </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
                </Collapsible>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <div className="space-y-2 p-2">
             {/* Badge de Cancelamento Pendente */}
             {userData?.subscriptionStatus === 'canceling' && userData?.subscriptionCancelAt && (
               <div className="px-3 py-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md group-data-[collapsible=icon]:hidden">
                 <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                   <Clock className="size-3" />
                   Acesso até {new Date(userData.subscriptionCancelAt).toLocaleDateString('pt-BR', {
                     day: '2-digit',
                     month: 'short'
                   })}
                 </p>
                 <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                   Cancelamento agendado
                 </p>
               </div>
             )}
             
             <div className="flex items-center justify-between gap-3">
             <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? 'User'} data-ai-hint="user avatar" />
                <AvatarFallback>{user?.displayName?.[0] || user?.email?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden transition-all duration-200">
                <span className="text-sm font-medium text-foreground">{user?.displayName || 'Usuário'}</span>
                <span className="text-sm text-muted-foreground truncate max-w-36">{user?.email}</span>
              </div>
             </div>
             <Button variant="ghost" size="icon" onClick={signOut} title="Sair" className="group-data-[collapsible=icon]:mx-auto">
                <LogOut className="size-5" />
             </Button>
             </div>
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
                <Image 
                  src="/logo.png" 
                  alt="Zona Fiscal" 
                  width={28} 
                  height={28}
                  className="size-7"
                />
                <span className="text-xl font-bold">Zona Fiscal</span>
            </div>
        </header>
        <main>
          <div className="p-4 md:p-6">
            <CampaignBanner />
          </div>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
