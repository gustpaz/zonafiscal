
"use client";

import { useState, useEffect } from "react";
import DashboardHeader from "@/components/dashboard-header";
import { getGoalsAndBudgets, addOrUpdateGoal, addOrUpdateBudget, deleteGoal, deleteBudget } from "@/lib/data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Target, PiggyBank, ShoppingCart, Paintbrush, Building2, Pencil, Trash2, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { BudgetCategory, Goal, Budget } from "@/lib/types";
import GoalBudgetFormDialog from "@/components/goal-budget-form-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/hooks/use-auth";

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const budgetIcons: Record<BudgetCategory, React.ReactNode> = {
    'business_marketing': <ShoppingCart className="size-6" />,
    'business_supplies': <Paintbrush className="size-6" />,
    'business_rent': <Building2 className="size-6" />,
    'personal_food': <ShoppingCart className="size-6" />,
    'personal_leisure': <Paintbrush className="size-6" />,
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'goal' | 'budget'; data: Goal | Budget } | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'goal' | 'budget'; id: string } | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { goals, budgets } = await getGoalsAndBudgets(user.uid);
    setGoals(goals);
    setBudgets(budgets);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
        fetchData();
    } else {
        setLoading(false);
    }
  }, [user]);
  
  const handleOpenDialog = (item: { type: 'goal' | 'budget'; data: Goal | Budget } | null = null) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleSave = async (item: { type: 'goal' | 'budget'; data: Omit<Goal, 'id' | 'currentAmount' | 'userId'> | Omit<Budget, 'id' | 'spentAmount' | 'userId'>}) => {
    if (!user) {
        toast({ title: "Erro de autenticação", variant: "destructive" });
        return false;
    }
    try {
        const auditInfo = { userId: user.uid, userName: user.displayName || user.email! };
        if (item.type === 'goal') {
            await addOrUpdateGoal({ ...item.data, userId: user.uid } as Goal, auditInfo);
        } else {
            await addOrUpdateBudget({ ...item.data, userId: user.uid } as Budget, auditInfo);
        }
        toast({
            title: "Sucesso!",
            description: `${item.type === 'goal' ? 'Meta' : 'Orçamento'} salva com sucesso.`,
        });
        fetchData();
        return true;
    } catch (error: any) {
        toast({
            title: "Erro!",
            description: error.message || `Não foi possível salvar.`,
            variant: "destructive"
        });
        return false;
    }
  };

  const handleDeleteClick = (type: 'goal' | 'budget', id: string) => {
    setItemToDelete({ type, id });
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !user) return;

    try {
        const auditInfo = { userId: user.uid, userName: user.displayName || user.email! };
        if (itemToDelete.type === 'goal') {
            await deleteGoal(itemToDelete.id, auditInfo);
        } else {
            await deleteBudget(itemToDelete.id, auditInfo);
        }
        toast({
            title: "Excluído!",
            description: "O item foi excluído com sucesso.",
        });
        fetchData();
    } catch (error: any) {
         toast({
            title: "Erro!",
            description: error.message || `Não foi possível excluir.`,
            variant: "destructive"
        });
    } finally {
        setIsAlertOpen(false);
        setItemToDelete(null);
    }
  };

  if (loading) {
    return (
        <div className="flex h-full w-full items-center justify-center p-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <DashboardHeader title="Metas e Orçamentos">
          <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2"/>
              Nova Meta/Orçamento
          </Button>
        </DashboardHeader>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Metas Financeiras</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {goals.map(goal => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  return (
                      <Card key={goal.id}>
                          <CardHeader>
                              <div className="flex items-center justify-between">
                                  <CardTitle className="flex items-center gap-2">
                                      {goal.type === 'profit' ? <Target className="text-primary"/> : <PiggyBank className="text-primary"/>}
                                      {goal.title}
                                  </CardTitle>
                                  <span className="text-sm text-muted-foreground">
                                      {formatDistanceToNow(new Date(goal.deadline), { addSuffix: true, locale: ptBR })}
                                  </span>
                              </div>
                              <CardDescription>
                                  Meta: {formatCurrency(goal.targetAmount)}
                              </CardDescription>
                          </CardHeader>
                          <CardContent>
                              <div className="space-y-2">
                                  <Progress value={progress} />
                                  <p className="text-sm font-medium text-center">
                                      {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                                      <span className="text-muted-foreground"> ({progress.toFixed(1)}%)</span>
                                  </p>
                              </div>
                          </CardContent>
                          <CardFooter className="justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog({ type: 'goal', data: goal })}>
                                <Pencil className="size-4" />
                            </Button>
                             <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-500" onClick={() => handleDeleteClick('goal', goal.id)}>
                                <Trash2 className="size-4" />
                            </Button>
                          </CardFooter>
                      </Card>
                  );
              })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Orçamentos Mensais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {budgets.map(budget => {
                  const progress = (budget.spentAmount / budget.budgetedAmount) * 100;
                  const remaining = budget.budgetedAmount - budget.spentAmount;
                  return (
                      <Card key={budget.id} className="flex flex-col">
                          <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        {budgetIcons[budget.category]}
                                    </div>
                                    <div>
                                        <CardTitle>{budget.name}</CardTitle>
                                        <CardDescription>Orçamento: {formatCurrency(budget.budgetedAmount)}</CardDescription>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog({ type: 'budget', data: budget })}>
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-500" onClick={() => handleDeleteClick('budget', budget.id)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                              </div>
                          </CardHeader>
                          <CardContent className="flex-grow space-y-2">
                              <Progress value={progress} />
                              <div className="flex justify-between text-sm">
                                  <span className="font-medium">Gasto: <span className="text-red-500">{formatCurrency(budget.spentAmount)}</span></span>
                                  <span className="text-muted-foreground">Restante: {formatCurrency(remaining)}</span>
                              </div>
                          </CardContent>
                          <CardFooter>
                              <p className="text-xs text-muted-foreground w-full text-center">
                                  {progress > 100 
                                      ? `Você ultrapassou ${formatCurrency(Math.abs(remaining))} do orçamento!`
                                      : `${progress.toFixed(1)}% do orçamento utilizado.`
                                  }
                              </p>
                          </CardFooter>
                      </Card>
                  );
              })}
          </div>
        </section>
      </div>

       <GoalBudgetFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        item={selectedItem}
      />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá o item permanentemente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete}>Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
