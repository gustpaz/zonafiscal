"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoanAdjustmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (adjustmentType: 'new_loan' | 'payment') => void;
  transactionData: {
    description: string;
    amount: number;
    category: string;
    paymentSource: string;
  };
  currentLoanBalance: number;
}

export default function LoanAdjustmentDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  transactionData,
  currentLoanBalance
}: LoanAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<'new_loan' | 'payment'>('new_loan');

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Determinar direção do empréstimo
  const isCategoryBusiness = ['business', 'mixed'].includes(transactionData.category);
  const isSourcePersonal = transactionData.paymentSource === 'personal';
  
  // Se categoria é empresarial e fonte é pessoal: PF → PJ (empresa te deve mais)
  // Se categoria é pessoal e fonte é empresarial: PJ → PF (você deve mais para empresa)
  const loanDirection = (isCategoryBusiness && isSourcePersonal) ? 'pf_to_pj' : 'pj_to_pf';

  // Calcular novo saldo baseado na escolha
  const calculateNewBalance = () => {
    if (loanDirection === 'pf_to_pj') {
      // Dinheiro pessoal pagando despesa empresarial
      return adjustmentType === 'new_loan' 
        ? currentLoanBalance + transactionData.amount  // Empresa te deve mais
        : currentLoanBalance - transactionData.amount; // Empresa te paga/devolve
    } else {
      // Dinheiro empresarial pagando despesa pessoal
      return adjustmentType === 'new_loan'
        ? currentLoanBalance - transactionData.amount  // Você deve mais para empresa
        : currentLoanBalance + transactionData.amount; // Você paga a empresa
    }
  };

  const newBalance = calculateNewBalance();

  const getCategoryLabel = () => {
    const labels: Record<string, string> = {
      'business': 'EMPRESARIAL',
      'personal': 'PESSOAL',
      'mixed': 'MISTA (50% cada)'
    };
    return labels[transactionData.category] || transactionData.category.toUpperCase();
  };

  const getSourceLabel = () => {
    return transactionData.paymentSource === 'personal' ? 'PESSOAL' : 'EMPRESARIAL';
  };

  const handleConfirm = () => {
    onConfirm(adjustmentType);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
            💡 Movimentação entre PF e PJ Detectada
          </DialogTitle>
          <DialogDescription className="text-sm">
            Precisamos entender como esta transação afeta o balanço de empréstimos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 sm:py-4">
          {/* Informações da Transação */}
          <div className="rounded-lg border bg-muted/50 p-3 sm:p-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-xs sm:text-sm text-muted-foreground">Você está registrando:</span>
              <span className="font-bold text-sm sm:text-base">{formatCurrency(transactionData.amount)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-medium">💼 Categoria:</span>
              <span className="text-muted-foreground">{getCategoryLabel()}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-medium">💳 Pago com:</span>
              <span className="text-muted-foreground">Dinheiro {getSourceLabel()}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-xs sm:text-sm">
              <span className="font-medium whitespace-nowrap">📝 Descrição:</span>
              <span className="text-muted-foreground break-words">{transactionData.description}</span>
            </div>
          </div>

          {/* Saldo Atual */}
          <div className="rounded-lg border p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted-foreground mb-2">Saldo atual de empréstimos:</div>
            <div className={cn(
              "text-lg sm:text-2xl font-bold break-words",
              currentLoanBalance > 0 ? "text-green-500" : currentLoanBalance < 0 ? "text-red-500" : "text-muted-foreground"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="text-sm sm:text-base">
                  {currentLoanBalance > 0 && "Empresa te deve: "}
                  {currentLoanBalance < 0 && "Você deve: "}
                  {currentLoanBalance === 0 && "Sem dívidas: "}
                </span>
                <span>{formatCurrency(Math.abs(currentLoanBalance))}</span>
              </div>
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-3 sm:space-y-4">
            <div className="text-sm font-medium">Como você quer registrar esta movimentação?</div>
            
            <RadioGroup value={adjustmentType} onValueChange={(value) => setAdjustmentType(value as 'new_loan' | 'payment')}>
              {/* Opção 1: Novo Empréstimo */}
              <div className={cn(
                "flex items-start space-x-2 sm:space-x-3 space-y-0 rounded-lg border p-3 sm:p-4 cursor-pointer transition-colors",
                adjustmentType === 'new_loan' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )} onClick={() => setAdjustmentType('new_loan')}>
                <RadioGroupItem value="new_loan" id="new_loan" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="new_loan" className="cursor-pointer font-medium text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="break-words">
                      {loanDirection === 'pf_to_pj' 
                        ? "É novo empréstimo (PF → PJ)"
                        : "É novo empréstimo (PJ → PF)"
                      }
                    </span>
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {loanDirection === 'pf_to_pj'
                      ? "Você está emprestando dinheiro para a empresa cobrir esta despesa."
                      : "A empresa está emprestando dinheiro para você cobrir esta despesa."
                    }
                  </p>
                  <div className="text-xs font-medium pt-1 break-words">
                    Novo saldo: {formatCurrency(Math.abs(newBalance))}
                    {newBalance > 0 && " (Empresa te deve)"}
                    {newBalance < 0 && " (Você deve)"}
                  </div>
                </div>
              </div>

              {/* Opção 2: Pagamento de Dívida */}
              <div className={cn(
                "flex items-start space-x-2 sm:space-x-3 space-y-0 rounded-lg border p-3 sm:p-4 cursor-pointer transition-colors",
                adjustmentType === 'payment' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )} onClick={() => setAdjustmentType('payment')}>
                <RadioGroupItem value="payment" id="payment" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="payment" className="cursor-pointer font-medium text-sm flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="break-words">
                      {loanDirection === 'pf_to_pj'
                        ? "É pagamento de empréstimo (PJ → PF)"
                        : "É pagamento de empréstimo (PF → PJ)"
                      }
                    </span>
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {loanDirection === 'pf_to_pj'
                      ? "A empresa está te devolvendo/pagando usando este método indireto."
                      : "Você está pagando a empresa usando este método indireto."
                    }
                  </p>
                  <div className="text-xs font-medium pt-1 break-words">
                    Novo saldo: {formatCurrency(Math.abs(newBalance))}
                    {newBalance > 0 && " (Empresa te deve)"}
                    {newBalance < 0 && " (Você deve)"}
                    {newBalance === 0 && " (Sem dívidas)"}
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Resumo do Impacto */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium text-primary break-words">
                Impacto no balanço: {formatCurrency(Math.abs(currentLoanBalance - newBalance))}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            Confirmar e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
