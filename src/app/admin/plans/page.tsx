
"use client";

import { useEffect, useState, useTransition } from "react";
import type { Plan } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Pencil, Loader2, Bot } from "lucide-react";
import PlanFormDialog from "@/components/plan-form-dialog";
import { getPlansAdminClient, savePlanClient } from "@/lib/client-admin-plans";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('plans', false);

  const fetchPlans = () => {
    startTransition(async () => {
      try {
        const result = await getPlansAdminClient();
        setPlans(result);
      } catch (error) {
        console.error("Erro ao buscar planos:", error);
        toast({
          title: "Erro ao carregar planos",
          description: "Não foi possível carregar os planos.",
          variant: "destructive"
        });
      }
    });
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchPlans();
    }
  }, [isAuthorized]);

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
      title="Acesso à Gestão de Planos Negado"
      description="Você não tem permissões de administrador para gerenciar planos."
    />;
  }

  const handleAddNewPlan = () => {
    setSelectedPlan(null);
    setIsPlanFormOpen(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsPlanFormOpen(true);
  };

  const handleSavePlan = (plan: Plan) => {
    if (!user) return;
    startTransition(async () => {
      try {
        await savePlanClient(plan);
        toast({ title: `Plano "${plan.name}" salvo com sucesso!`});
        setIsPlanFormOpen(false);
        fetchPlans();
      } catch (error) {
        console.error("Erro ao salvar plano:", error);
        toast({
          title: "Erro ao salvar plano",
          description: "Não foi possível salvar o plano.",
          variant: "destructive"
        });
      }
    });
  };

  if (isPending && plans.length === 0) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
  }
    
  return (
    <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><CreditCard /> Gerenciamento de Planos</CardTitle>
                    <CardDescription>Adicione, edite e gerencie os planos de assinatura.</CardDescription>
                </div>
                <Button onClick={handleAddNewPlan}>Adicionar Novo Plano</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Nome do Plano</TableHead>
                        <TableHead>Preço (Exibição)</TableHead>
                        <TableHead>Assinantes</TableHead>
                        <TableHead className="flex items-center gap-2"><Bot className="size-4"/> Relatórios IA/mês</TableHead>
                        <TableHead>Relatórios Contábeis</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plans.map(plan => (
                            <TableRow key={plan.id}>
                                <TableCell className="font-medium">{plan.name}</TableCell>
                                <TableCell>{plan.price === 0 ? "Gratuito" : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}</TableCell>
                                <TableCell>{plan.subscribers}</TableCell>
                                <TableCell>
                                    {plan.features.aiReportLimit === -1 ? 'Ilimitado' : plan.features.aiReportLimit}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={plan.features.accountingReports ? "default" : "secondary"}>
                                        {plan.features.accountingReports ? 'Habilitado' : 'Desabilitado'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-green-400 border-green-400/50">{plan.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleEditPlan(plan)}>
                                        <Pencil className="size-4" />
                                        <span className="sr-only">Editar</span>
                                </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
         <PlanFormDialog 
            isOpen={isPlanFormOpen}
            onOpenChange={setIsPlanFormOpen}
            onSave={handleSavePlan}
            plan={selectedPlan}
        />
    </>
  );
}
