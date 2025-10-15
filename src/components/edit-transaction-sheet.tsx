"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import TransactionForm from "./transaction-form";
import type { Transaction } from "@/lib/types";

interface EditTransactionSheetProps {
    transaction: Transaction;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean, updatedTransaction?: Transaction) => void;
}

export function EditTransactionSheet({ transaction, isOpen, onOpenChange }: EditTransactionSheetProps) {
  
  const handleFinish = (updatedTransaction: Transaction) => {
    onOpenChange(false, updatedTransaction);
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => onOpenChange(open)}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Transação</SheetTitle>
          <SheetDescription>
            Atualize os detalhes da sua movimentação financeira.
          </SheetDescription>
        </SheetHeader>
        <TransactionForm transaction={transaction} onFinish={handleFinish} />
      </SheetContent>
    </Sheet>
  );
}
