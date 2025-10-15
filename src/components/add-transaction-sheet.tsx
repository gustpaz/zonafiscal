"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import TransactionForm from "./transaction-form";
import { useState } from "react";
import type { Transaction } from "@/lib/types";

interface AddTransactionSheetProps {
    onTransactionAdded: (newTransactions: Transaction[]) => void;
}

export function AddTransactionSheet({ onTransactionAdded }: AddTransactionSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFinish = (newTransactions: Transaction[]) => {
      onTransactionAdded(newTransactions);
      setIsOpen(false);
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-5 w-5" />
          Nova Transação
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adicionar Nova Transação</SheetTitle>
          <SheetDescription>
            Preencha os detalhes da sua movimentação financeira.
          </SheetDescription>
        </SheetHeader>
        <TransactionForm onFinish={handleFinish} />
      </SheetContent>
    </Sheet>
  );
}
