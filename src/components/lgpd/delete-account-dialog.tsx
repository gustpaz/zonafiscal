"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Trash2, Eye, Lock, Loader2 } from 'lucide-react';

interface DeleteAccountDialogProps {
  type: 'anonymize' | 'permanent';
  onConfirm: (password: string) => Promise<void>;
  isLoading?: boolean;
}

export function DeleteAccountDialog({ type, onConfirm, isLoading }: DeleteAccountDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      return;
    }

    await onConfirm(password);
    setPassword('');
    setOpen(false);
  };

  const handleCancel = () => {
    setPassword('');
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {type === 'anonymize' ? (
          <Button 
            variant="outline" 
            className="h-auto flex-col items-start gap-2 border-orange-500 p-4 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
          >
            <Eye className="size-5" />
            <div className="text-left">
              <div className="font-semibold">Anonimizar Dados</div>
              <div className="text-xs text-muted-foreground">
                Tornar dados anônimos (reversível)
              </div>
            </div>
          </Button>
        ) : (
          <Button 
            variant="destructive" 
            className="h-auto flex-col items-start gap-2 p-4"
          >
            <Trash2 className="size-5" />
            <div className="text-left">
              <div className="font-semibold">Excluir Conta</div>
              <div className="text-xs opacity-90">
                Direito ao esquecimento (Art. 18, VI)
              </div>
            </div>
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {type === 'anonymize' ? 'Anonimizar seus dados?' : 'Excluir conta permanentemente?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {type === 'anonymize' ? (
              <>
                Seus dados pessoais serão anonimizados (nome, email, CPF, etc. serão removidos).
                Você perderá o acesso à conta, mas os dados não serão excluídos permanentemente.
                Esta ação pode ser revertida entrando em contato com o suporte.
              </>
            ) : (
              <>
                <strong className="text-destructive">ATENÇÃO:</strong> Esta ação é IRREVERSÍVEL. 
                Todos os seus dados (transações, relatórios, metas, etc.) serão excluídos 
                permanentemente de nossos servidores. Você não poderá recuperar sua conta ou dados.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 dark:bg-red-950">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              🔒 Digite sua senha para confirmar esta ação
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha Atual</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sua senha será verificada antes de processar a solicitação.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !password.trim()}
            variant={type === 'anonymize' ? 'default' : 'destructive'}
            className={type === 'anonymize' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Lock className="mr-2 size-4" />
                {type === 'anonymize' ? 'Confirmar Anonimização' : 'Confirmar Exclusão'}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

