
"use client";

import { MoreHorizontal, Pen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Transaction } from "@/lib/types";
import { deleteTransactionAction } from "@/lib/actions.tsx";
import { deleteTransactionClientAction } from "@/lib/client-actions";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { EditTransactionSheet } from "./edit-transaction-sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";


interface TransactionActionsProps {
  transaction: Transaction;
  onTransactionDeleted: (id: string) => void;
  onTransactionUpdated: (transaction: Transaction) => void;
}

export function TransactionActions({ transaction, onTransactionDeleted, onTransactionUpdated }: TransactionActionsProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const handleSheetClose = (isOpen: boolean, updatedTransaction?: Transaction) => {
        setIsSheetOpen(isOpen);
        if (!isOpen && updatedTransaction) {
            onTransactionUpdated(updatedTransaction);
        }
    }

    const handleDelete = async () => {
        if (!user) {
            toast({ title: "Erro", description: "Você precisa estar logado para excluir uma transação.", variant: "destructive" });
            return;
        }

        const auditInfo = {
            userId: user.uid,
            userName: user.displayName || user.email || "Usuário Desconhecido"
        };
        
        const result = await deleteTransactionClientAction(transaction.id, transaction.description, auditInfo);
        if (result.success && result.deletedId) {
            toast({
                title: "Transação Excluída!",
                description: `A transação "${transaction.description}" foi excluída com sucesso.`,
            });
            onTransactionDeleted(result.deletedId);
        } else {
             toast({
                title: "Erro!",
                description: "Não foi possível excluir a transação.",
                variant: "destructive"
            })
        }
        setIsAlertOpen(false);
    }

  return (
    <>
    <EditTransactionSheet transaction={transaction} isOpen={isSheetOpen} onOpenChange={handleSheetClose} />
     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsSheetOpen(true)}>
            <Pen className="mr-2 h-4 w-4" />
            Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                </DropdownMenuItem>
            </AlertDialogTrigger>
        </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a transação
                    <span className="font-bold"> "{transaction.description}"</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
