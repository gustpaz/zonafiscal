

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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { User, TeamMemberPermission } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface TeamMemberPermissionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  member: User;
  onSave: (memberId: string, permissions: User['teamPermissions']) => Promise<boolean>;
}

const allPermissions: { id: TeamMemberPermission, label: string }[] = [
    { id: 'view_dashboard', label: 'Ver Dashboard' },
    { id: 'manage_transactions', label: 'Gerenciar Transações (Criar/Editar/Excluir)' },
    { id: 'view_reports', label: 'Ver Relatórios e Análises' },
    { id: 'view_loans', label: 'Ver Gestão de Empréstimos' },
    { id: 'manage_goals', label: 'Gerenciar Metas e Orçamentos' },
];

export default function TeamMemberPermissionsDialog({ isOpen, onOpenChange, member, onSave }: TeamMemberPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<TeamMemberPermission[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (member) {
      setPermissions(member.teamPermissions || []);
    }
  }, [member]);

  const handlePermissionChange = (permissionId: TeamMemberPermission, checked: boolean) => {
    setPermissions(prev => 
      checked ? [...prev, permissionId] : prev.filter(p => p !== permissionId)
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(member.id, permissions);
    setIsSaving(false);
    if (success) {
        onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permissões para {member.name}</DialogTitle>
          <DialogDescription>
            Defina o que este membro pode ver e fazer na sua conta.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {allPermissions.map(permission => (
                <div key={permission.id} className="flex items-center space-x-3">
                    <Checkbox
                        id={`perm-${permission.id}`}
                        checked={permissions.includes(permission.id)}
                        onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                    />
                    <Label htmlFor={`perm-${permission.id}`} className="font-normal cursor-pointer">
                        {permission.label}
                    </Label>
                </div>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
