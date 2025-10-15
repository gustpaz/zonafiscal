"use client";

import { useState, useEffect } from "react";
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
import type { AdminGoals } from "@/lib/client-admin-dashboard";

interface AdminGoalsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goals: AdminGoals) => void;
  currentGoals: AdminGoals;
}

export default function AdminGoalsDialog({
  isOpen,
  onClose,
  onSave,
  currentGoals,
}: AdminGoalsDialogProps) {
  const [formData, setFormData] = useState<AdminGoals>(currentGoals);

  useEffect(() => {
    setFormData(currentGoals);
  }, [currentGoals, isOpen]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Editar Metas do Mês</DialogTitle>
          <DialogDescription>
            Defina as metas mensais que você deseja alcançar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="monthlyUsers">Meta de Novos Usuários</Label>
            <Input
              id="monthlyUsers"
              type="number"
              value={formData.monthlyUsers}
              onChange={(e) => setFormData({ ...formData, monthlyUsers: Number(e.target.value) })}
              placeholder="Ex: 2000"
            />
            <p className="text-xs text-muted-foreground">
              Quantos novos usuários você quer cadastrar este mês?
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="monthlyRevenue">Meta de Receita Mensal (MRR)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">R$</span>
              <Input
                id="monthlyRevenue"
                type="number"
                step="0.01"
                value={formData.monthlyRevenue}
                onChange={(e) => setFormData({ ...formData, monthlyRevenue: Number(e.target.value) })}
                placeholder="Ex: 40000"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Qual sua meta de receita recorrente mensal?
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Metas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

