
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, PiggyBank, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Goal, Budget, BudgetCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";


interface GoalBudgetFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: any) => Promise<boolean>;
  item: { type: 'goal' | 'budget'; data: Goal | Budget } | null;
}

const budgetCategories: { value: BudgetCategory, label: string }[] = [
    { value: 'business_marketing', label: 'Marketing (Empresa)' },
    { value: 'business_supplies', label: 'Material (Empresa)' },
    { value: 'business_rent', label: 'Aluguel/Contas (Empresa)' },
    { value: 'personal_food', label: 'Alimentação (Pessoal)' },
    { value: 'personal_leisure', label: 'Lazer (Pessoal)' },
];

const formSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['goal', 'budget']),
    goalType: z.enum(['profit', 'savings']).optional(),
    title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres."),
    targetAmount: z.coerce.number().positive("O valor deve ser maior que zero."),
    deadline: z.date().optional(),
    category: z.string().optional(),
}).refine(data => data.type !== 'goal' || !!data.deadline, {
    message: "A data final é obrigatória para metas.",
    path: ["deadline"],
}).refine(data => data.type !== 'budget' || !!data.category, {
    message: "A categoria é obrigatória para orçamentos.",
    path: ["category"],
});

type FormValues = z.infer<typeof formSchema>;


export default function GoalBudgetFormDialog({ isOpen, onOpenChange, onSave, item }: GoalBudgetFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        type: 'goal'
    }
  });

  const itemType = form.watch('type');

  useEffect(() => {
    if (isOpen && item) {
      form.reset({
        id: item.data.id,
        type: item.type,
        title: item.type === 'goal' ? (item.data as Goal).title : (item.data as Budget).name,
        targetAmount: item.type === 'goal' ? (item.data as Goal).targetAmount : (item.data as Budget).budgetedAmount,
        deadline: item.type === 'goal' ? new Date((item.data as Goal).deadline) : undefined,
        category: item.type === 'budget' ? (item.data as Budget).category : undefined,
        goalType: item.type === 'goal' ? (item.data as Goal).type : undefined,
      });
    } else if (isOpen && !item) {
      form.reset({
        type: 'goal',
        title: '',
        targetAmount: 0,
        deadline: new Date(),
      });
    }
  }, [item, isOpen, form]);

  const handleSave = async (values: FormValues) => {
    if (!user) return;
    setLoading(true);
    let success = false;

    const auditInfo = {
        userId: user.uid,
        userName: user.displayName || user.email || "Usuário Desconhecido",
    };

    if (values.type === 'goal') {
        const goalData: Goal = {
            id: values.id || '',
            userId: user.uid, // Garantir que o userId esteja presente
            title: values.title,
            type: values.goalType!,
            targetAmount: values.targetAmount,
            deadline: values.deadline!.toISOString(),
            currentAmount: item?.type === 'goal' ? (item.data as Goal).currentAmount : 0,
            lastModifiedBy: auditInfo.userName,
        };
        success = await onSave({ type: 'goal', data: goalData, auditInfo });
    } else {
        const budgetData: Budget = {
            id: values.id || '',
            userId: user.uid, // Garantir que o userId esteja presente
            name: values.title,
            category: values.category as BudgetCategory,
            budgetedAmount: values.targetAmount,
            spentAmount: item?.type === 'budget' ? (item.data as Budget).spentAmount : 0,
            lastModifiedBy: auditInfo.userName,
        };
        success = await onSave({ type: 'budget', data: budgetData, auditInfo });
    }
    setLoading(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar' : 'Criar Nova Meta ou Orçamento'}</DialogTitle>
          <DialogDescription>
            Defina seus objetivos financeiros para manter tudo sob controle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                    <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 gap-4"
                        >
                        <Label className={cn("rounded-md p-4 border flex flex-col items-center justify-center cursor-pointer", field.value === 'goal' && "bg-accent border-primary")}>
                            <RadioGroupItem value="goal" className="sr-only" />
                            <Target className="mb-2"/>
                            Meta
                        </Label>
                         <Label className={cn("rounded-md p-4 border flex flex-col items-center justify-center cursor-pointer", field.value === 'budget' && "bg-accent border-primary")}>
                            <RadioGroupItem value="budget" className="sr-only" />
                            <PiggyBank className="mb-2" />
                            Orçamento
                        </Label>
                    </RadioGroup>
                )}
            />

            {itemType === 'goal' && (
                <Controller
                    control={form.control}
                    name="goalType"
                    render={({ field }) => (
                        <div className="space-y-2">
                             <Label>Tipo de Meta</Label>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Selecione o tipo de meta..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="profit">Lucro</SelectItem>
                                    <SelectItem value="savings">Economia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                />
            )}
            
            <div className="space-y-2">
                <Label htmlFor="title">{itemType === 'goal' ? 'Nome da Meta' : 'Nome do Orçamento'}</Label>
                <Input id="title" {...form.register('title')} />
                {form.formState.errors.title && <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="targetAmount">{itemType === 'goal' ? 'Valor Alvo' : 'Valor Orçado'}</Label>
                <Input id="targetAmount" type="number" {...form.register('targetAmount')} />
                 {form.formState.errors.targetAmount && <p className="text-sm text-red-500">{form.formState.errors.targetAmount.message}</p>}
            </div>

            {itemType === 'goal' && (
                 <Controller
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                        <div className="space-y-2">
                             <Label>Data Final</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Escolha uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                             {form.formState.errors.deadline && <p className="text-sm text-red-500">{form.formState.errors.deadline.message}</p>}
                        </div>
                    )}
                />
            )}

            {itemType === 'budget' && (
                <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <div className="space-y-2">
                             <Label>Categoria do Orçamento</Label>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                                <SelectContent>
                                    {budgetCategories.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.category && <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>}
                        </div>
                    )}
                />
            )}
           
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 animate-spin" />}
                    Salvar
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
