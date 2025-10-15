
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addTransactionAction, suggestCategoryAction, updateTransactionAction } from "@/lib/actions.tsx";
import { addTransactionClientAction, updateTransactionClientAction } from "@/lib/client-actions";
import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import type { SuggestTransactionCategoryOutput } from "@/ai/flows/suggest-transaction-category";
import type { Transaction } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { useAuth } from "@/hooks/use-auth";
import LoanAdjustmentDialog from "./loan-adjustment-dialog";
import { getFinancialSummary } from "@/lib/data-utils";
import { getTransactionsClient } from "@/lib/client-data";

const formSchema = z.object({
  description: z.string().min(2, {
    message: "Descrição deve ter pelo menos 2 caracteres.",
  }),
  amount: z.coerce.number().positive({
    message: "O valor deve ser positivo.",
  }),
  date: z.date({
    required_error: "A data é obrigatória.",
  }),
  type: z.enum(["income", "expense"], {
    required_error: "O tipo é obrigatório.",
  }),
  category: z.enum(["personal", "business", "mixed", "loan_to_business", "loan_to_personal"], {
    required_error: "A categoria é obrigatória.",
  }),
  paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "transfer", "boleto"], {
    required_error: "O método de pagamento é obrigatório.",
  }),
  paymentSource: z.enum(["personal", "business"], {
      required_error: "A fonte do pagamento é obrigatória."
  }),
  paymentType: z.enum(["avista", "parcelado"]),
  installments: z.coerce.number().min(1).optional(),
  notes: z.string().optional(),
  applyToFuture: z.boolean().default(false).optional(),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  transaction?: Transaction;
  onFinish?: (data: any) => void;
}

export default function TransactionForm({ transaction, onFinish }: TransactionFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestTransactionCategoryOutput | null>(null);
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<TransactionFormValues | null>(null);
  const [currentLoanBalance, setCurrentLoanBalance] = useState(0);

  const isEditMode = !!transaction;
  const isInstallment = isEditMode && (transaction.installments || 0) > 1;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
      ? {
          ...transaction,
          date: new Date(transaction.date),
          installments: transaction.installments || 1,
          applyToFuture: false,
        }
      : {
          description: "",
          amount: 0,
          date: new Date(),
          notes: "",
          paymentSource: "personal",
          paymentType: "avista",
          installments: 1,
          applyToFuture: false,
        },
  });
  
  const paymentType = form.watch("paymentType");
  const transactionType = form.watch("type");
  const category = form.watch("category");

  const handleCategoryChange = (value: string) => {
      const categoryValue = value as TransactionFormValues['category'];
      form.setValue('category', categoryValue);
      // This automation should only trigger on manual user input, not on AI suggestion
      if (categoryValue === 'loan_to_business') {
          form.setValue('type', 'income');
          form.setValue('paymentSource', 'personal');
          form.setValue('paymentType', 'avista');
          form.setValue('paymentMethod', 'transfer');
      } else if (categoryValue === 'loan_to_personal') {
          form.setValue('type', 'expense');
          form.setValue('paymentSource', 'business');
          form.setValue('paymentType', 'avista');
          form.setValue('paymentMethod', 'transfer');
      }
  };
  
  // Verificar se é empréstimo
  const isLoanTransaction = category === 'loan_to_business' || category === 'loan_to_personal';

  useEffect(() => {
    if (transactionType === 'income') {
        form.setValue('paymentType', 'avista');
    }
  }, [transactionType, form]);

  // Buscar saldo de empréstimos ao montar o componente
  useEffect(() => {
    if (user) {
      getTransactionsClient(user.uid).then(transactions => {
        const summary = getFinancialSummary(transactions);
        setCurrentLoanBalance(summary.loanBalance);
      });
    }
  }, [user]);

  async function onSubmit(values: TransactionFormValues) {
    if (!user) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para salvar uma transação.", variant: "destructive" });
        return;
    }
    
    // Verificar se há desencontro entre categoria e fonte (apenas para transações normais)
    const isLoanCategory = values.category === 'loan_to_business' || values.category === 'loan_to_personal';
    const categoryNeedsBusinessSource = ['business', 'mixed'].includes(values.category);
    const categoryNeedsPersonalSource = values.category === 'personal';
    const hasMismatch = !isEditMode && !isLoanCategory && (
      (categoryNeedsBusinessSource && values.paymentSource === 'personal') ||
      (categoryNeedsPersonalSource && values.paymentSource === 'business')
    );

    // Se há desencontro, mostrar modal
    if (hasMismatch) {
      setPendingSubmission(values);
      setShowLoanDialog(true);
      return;
    }

    // Se não há desencontro, processar normalmente
    await processTransaction(values, null);
  }

  async function processTransaction(values: TransactionFormValues, loanAdjustment: 'new_loan' | 'payment' | null) {
    if (!user) return;
    
    const auditInfo = { userId: user.uid, userName: user.displayName || user.email! };
    
    const dataForAction = {
        ...values,
        date: values.date.toISOString(),
    };

    const result = isEditMode
      ? await updateTransactionClientAction(transaction.id, { ...dataForAction, userId: user.uid }, values.applyToFuture || false, auditInfo)
      : await addTransactionClientAction(dataForAction, auditInfo);
      
    if (result?.success) {
      toast({
        title: isEditMode ? "Transação Atualizada!" : "Transação Adicionada!",
        description: `${values.description} foi ${isEditMode ? 'atualizada' : 'salva'} com sucesso.`,
      });
      
      if (!isEditMode) {
          form.reset();
          setSuggestion(null);
      }
      
      const dataToReturn = isEditMode ? result.updatedTransaction : result.transactions;
      
      // Se houve ajuste de empréstimo, criar a transação de empréstimo
      if (loanAdjustment && !isEditMode && result.transactions) {
        await createLoanAdjustment(values, loanAdjustment, auditInfo);
      }
      
      onFinish?.(dataToReturn);
    } else {
       toast({
          title: "Erro ao Salvar",
          description: result?.error || "Ocorreu um erro inesperado.",
          variant: "destructive"
      });
    }
  }

  async function createLoanAdjustment(
    values: TransactionFormValues, 
    adjustmentType: 'new_loan' | 'payment',
    auditInfo: { userId: string; userName: string }
  ) {
    const isCategoryBusiness = ['business', 'mixed'].includes(values.category);
    const isSourcePersonal = values.paymentSource === 'personal';
    const amount = values.category === 'mixed' ? values.amount / 2 : values.amount;
    
    // Determinar tipo de empréstimo baseado na situação
    let loanCategory: 'loan_to_business' | 'loan_to_personal';
    let loanType: 'income' | 'expense';
    
    if (isCategoryBusiness && isSourcePersonal) {
      // Dinheiro pessoal pagando despesa empresarial
      if (adjustmentType === 'new_loan') {
        // Novo empréstimo PF → PJ (empresa recebe)
        loanCategory = 'loan_to_business';
        loanType = 'income';
      } else {
        // Pagamento PJ → PF (empresa paga/devolve)
        loanCategory = 'loan_to_personal';
        loanType = 'expense';
      }
    } else {
      // Dinheiro empresarial pagando despesa pessoal
      if (adjustmentType === 'new_loan') {
        // Novo empréstimo PJ → PF (você recebe)
        loanCategory = 'loan_to_personal';
        loanType = 'expense';
      } else {
        // Pagamento PF → PJ (você paga)
        loanCategory = 'loan_to_business';
        loanType = 'income';
      }
    }

    const loanTransaction = {
      description: `Ajuste de empréstimo - ${values.description}`,
      amount: amount,
      date: values.date.toISOString(),
      type: loanType,
      category: loanCategory,
      paymentMethod: values.paymentMethod,
      paymentSource: values.paymentSource,
      paymentType: 'avista' as const,
      installments: 1,
      notes: `Ajuste automático devido a desencontro entre categoria e fonte de pagamento.`
    };

    await addTransactionClientAction(loanTransaction, auditInfo);
  }

  const handleLoanDialogConfirm = async (adjustmentType: 'new_loan' | 'payment') => {
    if (pendingSubmission) {
      await processTransaction(pendingSubmission, adjustmentType);
      setPendingSubmission(null);
    }
  }

  const handleDescriptionBlur = async () => {
    if (isEditMode) return;
    const description = form.getValues("description");
    if (description.length > 3) {
      setIsSuggesting(true);
      setSuggestion(null);
      try {
        const result = await suggestCategoryAction({ description });
        if (result && ['personal', 'business', 'mixed'].includes(result.category)) {
          form.setValue('category', result.category as any, { shouldValidate: true });
          setSuggestion(result);
        }
      } catch (error) {
        // Falha silenciosa - IA não está configurada ou indisponível
        // Não mostra erro para o usuário, apenas não sugere
      } finally {
        setIsSuggesting(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Compra no Atacadão" {...field} onBlur={handleDescriptionBlur} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CATEGORIA MOVIDA PARA O TOPO */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Categoria</FormLabel>
              {isSuggesting && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sugerindo categoria...</div>}
              {suggestion && !isSuggesting && (
                <div className="text-sm p-3 rounded-md bg-accent/50 text-accent-foreground border border-accent">
                  <p className="font-semibold">Sugestão da IA:</p>
                  <p>{suggestion.reason}</p>
                </div>
              )}
              {isLoanTransaction && (
                <div className="text-sm p-3 rounded-md bg-primary/10 text-primary border border-primary/20">
                  <p className="font-semibold mb-1">
                    {category === 'loan_to_business' ? '💰 Aporte (PF → PJ)' : '💸 Retirada (PJ → PF)'}
                  </p>
                  <p className="text-xs">
                    {category === 'loan_to_business' 
                      ? 'Você está transferindo dinheiro pessoal para a empresa. A empresa passará a te dever este valor.'
                      : 'Você está retirando dinheiro da empresa para uso pessoal. Você passará a dever este valor para a empresa.'
                    }
                  </p>
                </div>
              )}
              <FormControl>
                <RadioGroup
                  onValueChange={handleCategoryChange}
                  value={field.value}
                  className="space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="personal" disabled={isEditMode && isInstallment} />
                      </FormControl>
                      <FormLabel className="font-normal">Pessoal</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="business" disabled={isEditMode && isInstallment} />
                      </FormControl>
                      <FormLabel className="font-normal">Empresarial</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="mixed" disabled={isEditMode && isInstallment} />
                      </FormControl>
                      <FormLabel className="font-normal">Misto (50/50)</FormLabel>
                    </FormItem>
                  </div>
                  <Separator className="my-2" />
                  <FormLabel className="text-xs text-muted-foreground">Transferências entre PF e PJ:</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="loan_to_business" disabled={isEditMode && isInstallment} />
                      </FormControl>
                      <FormLabel className="font-normal">Aporte (Empréstimo)</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="loan_to_personal" disabled={isEditMode && isInstallment} />
                      </FormControl>
                      <FormLabel className="font-normal">Retirada (Empréstimo)</FormLabel>
                    </FormItem>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4 sm:flex-row">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="120.00" {...field} disabled={isInstallment} />
                </FormControl>
                {isInstallment && <FormDescription>O valor da parcela não pode ser editado individualmente.</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{isLoanTransaction ? "Data da Transferência" : "Data da Compra"}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      locale={ptBR}
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                 <FormDescription>Para compras parceladas, use a data da primeira parcela.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!isLoanTransaction && (
          <div className="flex flex-col gap-4 sm:flex-row">
            <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                <FormItem className="flex-1">
                    <FormLabel>Tipo de Pagamento</FormLabel>
                    <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={transactionType === 'income' || isEditMode}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de pagamento" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="avista">À Vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            {paymentType === "parcelado" && (
                <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                    <FormItem className="flex-1">
                    <FormLabel>Nº de Parcelas</FormLabel>
                    <FormControl>
                        <Input type="number" min="2" placeholder="3" {...field} disabled={isEditMode} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
        </div>
        )}

        {!isLoanTransaction && (
          <div className="flex flex-col gap-4 sm:flex-row">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Método de Pagamento</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        )}

        {!isLoanTransaction && (
          <FormField
            control={form.control}
            name="paymentSource"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>{transactionType === 'income' ? 'Destino do Dinheiro' : 'Fonte do Pagamento'}</FormLabel>
                <FormDescription>{transactionType === 'income' ? 'Para qual conta o dinheiro entrou?' : 'De qual conta/cartão o dinheiro saiu?'}</FormDescription>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex gap-4"
                    >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="personal" />
                        </FormControl>
                        <FormLabel className="font-normal">Conta Pessoal</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="business" />
                        </FormControl>
                        <FormLabel className="font-normal">Conta Empresarial</FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
          />
        )}
        
        {isInstallment && (
           <FormField
            control={form.control}
            name="applyToFuture"
            render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                    <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    />
                </FormControl>
                <div className="space-y-1 leading-none">
                    <FormLabel>
                    Aplicar alterações às parcelas futuras
                    </FormLabel>
                    <FormDescription>
                    Se marcado, as alterações de categoria, método, fonte e observações serão aplicadas a todas as parcelas futuras desta compra.
                    </FormDescription>
                </div>
                </FormItem>
            )}
            />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalhes adicionais..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? 'Salvar Alterações' : 'Salvar Transação'}
        </Button>
      </form>
      
      {/* Modal de Ajuste de Empréstimo */}
      {pendingSubmission && (
        <LoanAdjustmentDialog
          isOpen={showLoanDialog}
          onOpenChange={setShowLoanDialog}
          onConfirm={handleLoanDialogConfirm}
          transactionData={{
            description: pendingSubmission.description,
            amount: pendingSubmission.amount,
            category: pendingSubmission.category,
            paymentSource: pendingSubmission.paymentSource
          }}
          currentLoanBalance={currentLoanBalance}
        />
      )}
    </Form>
  );
}
