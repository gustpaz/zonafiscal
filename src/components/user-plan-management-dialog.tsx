
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { User as AppUser, AdminPermission, AdminRole } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";

interface UserPlanManagementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null; // Can be null for new user
  onSave: (user: AppUser) => void;
}

const defaultUser: Omit<AppUser, 'id'> = {
    name: '',
    email: '',
    avatar: '',
    plan: 'Gratuito',
    signupDate: new Date().toISOString(),
    status: 'Ativo',
    adminRole: 'Nenhum',
    adminPermissions: [],
};

const adminPermissionsList: { id: AdminPermission, label: string }[] = [
    { id: 'dashboard', label: 'Ver Dashboard' },
    { id: 'plans', label: 'Gerenciar Planos' },
    { id: 'users', label: 'Gerenciar Usuários' },
    { id: 'payments', label: 'Ver Pagamentos' },
    { id: 'marketing', label: 'Gerenciar Marketing' },
    { id: 'integrations', label: 'Gerenciar Integrações' },
    { id: 'support', label: 'Gerenciar Suporte' },
];

export default function UserPlanManagementDialog({ isOpen, onOpenChange, user, onSave }: UserPlanManagementDialogProps) {
  const [formData, setFormData] = useState<Omit<AppUser, 'id'>>(defaultUser);
  const isNewUser = !user;

  useEffect(() => {
    if (isOpen) {
      setFormData(user ? { ...defaultUser, ...user } : defaultUser);
    }
  }, [isOpen, user]);
  
  const handleChange = (field: keyof Omit<AppUser, 'id'>, value: string | AdminPermission[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleRoleChange = (value: AdminRole) => {
      handleChange('adminRole', value);
      if (value === 'Super Admin') {
          handleChange('adminPermissions', adminPermissionsList.map(p => p.id));
      }
       if (value === 'Nenhum') {
          handleChange('adminPermissions', []);
      }
  }

  const handlePermissionChange = (permission: AdminPermission, checked: boolean) => {
    const currentPermissions = formData.adminPermissions || [];
    let newPermissions: AdminPermission[];
    if (checked) {
        newPermissions = [...currentPermissions, permission];
    } else {
        newPermissions = currentPermissions.filter(p => p !== permission);
    }
    handleChange('adminPermissions', newPermissions);
  }

  const handleSave = () => {
    const userToSave: AppUser = {
      id: user?.id || '', // Handled on the server for new users
      ...formData,
    };
    onSave(userToSave);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            {!isNewUser && (
                <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
            <div>
                <DialogTitle>{isNewUser ? 'Criar Novo Usuário' : `Gerenciar ${user.name}`}</DialogTitle>
                <DialogDescription>{isNewUser ? 'Preencha os dados para criar uma nova conta.' : user.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="plan">Plano do Usuário</Label>
                <Select value={formData.plan} onValueChange={(value) => handleChange('plan', value as 'Gratuito' | 'Pro')}>
                    <SelectTrigger id="plan">
                        <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Gratuito">Gratuito</SelectItem>
                        <SelectItem value="Pro">Pro</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="status">Status da Conta</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange('status', value as 'Ativo' | 'Inativo' | 'Suspenso')}>
                    <SelectTrigger id="status">
                        <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Ativo">
                            <Badge variant="outline" className="text-green-400 border-green-400/50">Ativo</Badge>
                        </SelectItem>
                        <SelectItem value="Inativo">
                             <Badge variant="outline" className="text-gray-400 border-gray-400/50">Inativo</Badge>
                        </SelectItem>
                        <SelectItem value="Suspenso">
                            <Badge variant="destructive">Suspenso</Badge>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Separator />
            
            <div className="space-y-4 rounded-md border p-4">
                 <h4 className="font-semibold">Permissões de Administrador</h4>
                <div className="space-y-2">
                    <Label htmlFor="adminRole">Função de Admin</Label>
                    <Select value={formData.adminRole} onValueChange={(value) => handleRoleChange(value as AdminRole)}>
                        <SelectTrigger id="adminRole">
                            <SelectValue placeholder="Selecione uma função" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Nenhum">Nenhum Acesso</SelectItem>
                            <SelectItem value="Personalizado">Personalizado</SelectItem>
                            <SelectItem value="Super Admin">Super Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {formData.adminRole === 'Personalizado' && (
                    <div className="space-y-2">
                        <Label>Acesso às Áreas</Label>
                        <div className="grid grid-cols-2 gap-4">
                            {adminPermissionsList.map(permission => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`perm-${permission.id}`}
                                        checked={formData.adminPermissions?.includes(permission.id)}
                                        onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                                    />
                                    <Label htmlFor={`perm-${permission.id}`} className="font-normal">{permission.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
