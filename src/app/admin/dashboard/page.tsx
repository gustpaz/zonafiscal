
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Activity, Wallet, FileText, Goal, Flag, Loader2, Edit } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useTransition } from "react";
import { getAdminDashboardDataClient, updateFeatureFlagsClient, saveAdminGoalsClient, type AdminDashboardData, type AdminGoals } from "@/lib/client-admin-dashboard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";
import AdminGoalsDialog from "@/components/admin-goals-dialog";


const LoadingSkeleton = () => (
    <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
)

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('dashboard', false);
  
  const [featureFlags, setFeatureFlags] = useState({
    pdfExport: true,
    csvImport: false,
  });

  useEffect(() => {
    if (isAuthorized) {
      startTransition(async () => {
        try {
          const result = await getAdminDashboardDataClient();
          setData(result);
          setFeatureFlags(result.featureFlags);
        } catch (error) {
          console.error("Erro ao carregar dados do dashboard:", error);
          toast({
            title: "Erro ao carregar dados",
            description: "Não foi possível carregar os dados do dashboard. Tente novamente.",
            variant: "destructive",
          });
        }
      });
    }
  }, [isAuthorized, toast]);

  const handleToggleFeatureFlag = (feature: keyof typeof featureFlags) => {
    if (!user) return;
    startTransition(async () => {
        try {
          const newFlags = { ...featureFlags, [feature]: !featureFlags[feature] };
          setFeatureFlags(newFlags);
          await updateFeatureFlagsClient(newFlags);
          toast({ title: "Funcionalidade atualizada!" });
        } catch (error) {
          console.error("Erro ao atualizar feature flag:", error);
          toast({
            title: "Erro",
            description: "Não foi possível atualizar a configuração.",
            variant: "destructive",
          });
        }
    });
  };

  const handleSaveGoals = (goals: AdminGoals) => {
    startTransition(async () => {
      try {
        await saveAdminGoalsClient(goals);
        toast({ title: "Metas atualizadas com sucesso!" });
        // Recarregar dados para atualizar o dashboard
        const result = await getAdminDashboardDataClient();
        setData(result);
        setFeatureFlags(result.featureFlags);
      } catch (error) {
        console.error("Erro ao salvar metas:", error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as metas.",
          variant: "destructive",
        });
      }
    });
  };

  // Mostra loading enquanto verifica permissões
  if (isChecking) {
    return <LoadingSkeleton />;
  }

  // Se não tem autorização, mostra página de erro
  if (accessDenied || (!isChecking && !isAuthorized)) {
    return <AdminAccessDenied 
      title="Acesso ao Painel Administrativo Negado"
      description="Você não tem permissões de administrador para acessar esta área."
    />;
  }

  if (isPending || !data) {
      return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
            <p className="text-xs text-muted-foreground">+20.1% desde o mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.mrr)}</div>
            <p className="text-xs text-muted-foreground">+12.2% desde o mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos (Hoje)</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data.activeToday}</div>
            <p className="text-xs text-muted-foreground">+20 desde a última hora</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transações Processadas</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTransactions.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">+15% desde ontem</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Goal className="text-primary"/> Metas do Mês</CardTitle>
                        <CardDescription>Acompanhe o progresso em direção aos seus objetivos.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsGoalsDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <p className="font-medium">Novos Usuários</p>
                        <p><span className="font-bold">{data.totalUsers}</span> / {data.goals.monthlyUsers.toLocaleString('pt-BR')}</p>
                    </div>
                    <Progress value={(data.totalUsers / data.goals.monthlyUsers) * 100} />
                </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <p className="font-medium">Receita (MRR)</p>
                        <p><span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.mrr)}</span> / {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.goals.monthlyRevenue)}</p>
                    </div>
                    <Progress value={(data.mrr / data.goals.monthlyRevenue) * 100} />
                </div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Flag className="text-primary"/> Controle de Funcionalidades</CardTitle>
                <CardDescription>Ative ou desative funcionalidades para todos os usuários.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="feature-pdf" className="flex flex-col space-y-1">
                        <span>Relatórios em PDF</span>
                        <span className="text-xs font-normal text-muted-foreground">Permite exportar relatórios em formato PDF.</span>
                    </Label>
                    <Switch id="feature-pdf" checked={featureFlags.pdfExport} onCheckedChange={() => handleToggleFeatureFlag('pdfExport')} />
                </div>
                 <div className="flex items-center justify-between">
                     <Label htmlFor="feature-import" className="flex flex-col space-y-1">
                        <span>Importação de CSV</span>
                         <span className="text-xs font-normal text-muted-foreground">Habilita a importação de transações via arquivo CSV.</span>
                    </Label>
                    <Switch id="feature-import" checked={featureFlags.csvImport} onCheckedChange={() => handleToggleFeatureFlag('csvImport')} />
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Crescimento de Usuários</CardTitle>
            <CardDescription>Novos usuários nos últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.userGrowthData}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas 24 horas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentActivities.length > 0 ? (
              data.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    activity.type === 'user' ? 'bg-primary/10' :
                    activity.type === 'transaction' ? 'bg-green-500/10' :
                    'bg-yellow-500/10'
                  }`}>
                    {activity.type === 'user' && <Users className="size-5 text-primary" />}
                    {activity.type === 'transaction' && <Wallet className="size-5 text-green-500" />}
                    {activity.type === 'report' && <FileText className="size-5 text-yellow-500" />}
                  </div>
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Usuários Recentes</CardTitle>
            <CardDescription>Usuários que se cadastraram na última semana.</CardDescription>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.recentUsers.map(user => (
                        <TableRow key={user.email}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{new Date(user.signupDate).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant="outline" className="text-green-400 border-green-400/50">Ativo</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <AdminGoalsDialog
        isOpen={isGoalsDialogOpen}
        onClose={() => setIsGoalsDialogOpen(false)}
        onSave={handleSaveGoals}
        currentGoals={data.goals}
      />
      
    </div>
  );
}
