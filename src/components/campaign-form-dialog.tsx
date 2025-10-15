"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getUsersClient } from "@/lib/client-admin-users";
import type { Campaign } from "@/lib/client-admin-marketing";
import type { User } from "@/lib/types";
import { Loader2, Search } from "lucide-react";

interface CampaignFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaign: Campaign) => void;
  campaign?: Campaign | null;
}

export default function CampaignFormDialog({
  isOpen,
  onClose,
  onSave,
  campaign,
}: CampaignFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Campaign>>({
    title: "",
    message: "",
    type: "info",
    targetAudience: "all",
    status: "Rascunho",
    specificUserIds: [],
    views: 0,
    clicks: 0,
    targetedUsers: 0,
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState<"all" | "Pro" | "Gratuito">("all");

  // Buscar lista de usuários quando o diálogo abre
  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true);
      getUsersClient().then(users => {
        setAvailableUsers(users);
        setLoadingUsers(false);
      }).catch(error => {
        console.error("Erro ao buscar usuários:", error);
        setLoadingUsers(false);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
    } else {
      setFormData({
        title: "",
        message: "",
        type: "info",
        targetAudience: "all",
        status: "Rascunho",
        specificUserIds: [],
        views: 0,
        clicks: 0,
        targetedUsers: 0,
      });
    }
  }, [campaign, isOpen]);

  const toggleUserSelection = (userId: string) => {
    const currentIds = formData.specificUserIds || [];
    const newIds = currentIds.includes(userId)
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId];
    setFormData({ ...formData, specificUserIds: newIds });
  };

  const selectAllUsers = () => {
    setFormData({ ...formData, specificUserIds: availableUsers.map(u => u.id) });
  };

  const deselectAllUsers = () => {
    setFormData({ ...formData, specificUserIds: [] });
  };

  // Filtrar usuários pela busca e plano
  const filteredUsers = useMemo(() => {
    let filtered = availableUsers;
    
    // Filtrar por plano
    if (userPlanFilter !== 'all') {
      filtered = filtered.filter(user => user.plan === userPlanFilter);
    }
    
    // Filtrar por busca
    if (userSearchTerm) {
      const searchLower = userSearchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [availableUsers, userSearchTerm, userPlanFilter]);

  const handleSave = () => {
    if (!formData.title || !formData.message) {
      return;
    }

    const campaignToSave: Campaign = {
      id: campaign?.id || `camp_${Date.now()}`,
      title: formData.title,
      message: formData.message,
      type: formData.type as Campaign['type'] || "info",
      targetAudience: formData.targetAudience as Campaign['targetAudience'] || "all",
      specificUserIds: formData.specificUserIds || [],
      status: formData.status as Campaign['status'] || "Rascunho",
      createdAt: campaign?.createdAt || new Date().toISOString(),
      scheduledFor: formData.scheduledFor,
      expiresAt: formData.expiresAt,
      views: campaign?.views || 0,
      clicks: campaign?.clicks || 0,
      targetedUsers: campaign?.targetedUsers || 0,
    };

    onSave(campaignToSave);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{campaign ? "Editar Aviso/Campanha" : "Novo Aviso/Campanha"}</DialogTitle>
          <DialogDescription>
            {campaign ? "Atualize o aviso ou campanha." : "Crie um novo aviso ou promoção para seus usuários."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[500px] overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="title">Título do Aviso</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Manutenção Programada"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Ex: Teremos uma manutenção no sistema no dia 15/10 das 2h às 4h da manhã."
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Tipo de Aviso</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as Campaign['type'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">ℹ️ Informação</SelectItem>
                <SelectItem value="warning">⚠️ Aviso/Alerta</SelectItem>
                <SelectItem value="success">✅ Sucesso/Novidade</SelectItem>
                <SelectItem value="promotion">🎁 Promoção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="targetAudience">Público-Alvo</Label>
            <Select
              value={formData.targetAudience}
              onValueChange={(value) => setFormData({ ...formData, targetAudience: value as Campaign['targetAudience'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Quem verá este aviso?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">👥 Todos os Usuários</SelectItem>
                <SelectItem value="pro">⭐ Apenas Usuários Pro</SelectItem>
                <SelectItem value="free">🆓 Apenas Usuários Gratuitos</SelectItem>
                <SelectItem value="specific">🎯 Usuários Específicos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.targetAudience === 'specific' && (
            <div className="grid gap-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>Selecionar Usuários</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllUsers}
                    disabled={loadingUsers}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAllUsers}
                    disabled={loadingUsers}
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Campo de Busca e Filtro */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-8"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    disabled={loadingUsers}
                  />
                </div>
                <Select
                  value={userPlanFilter}
                  onValueChange={(value) => setUserPlanFilter(value as "all" | "Pro" | "Gratuito")}
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Planos</SelectItem>
                    <SelectItem value="Pro">⭐ Pro</SelectItem>
                    <SelectItem value="Gratuito">🆓 Gratuito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <ScrollArea className="h-[200px] border rounded-md p-3 bg-background">
                    {filteredUsers.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        Nenhum usuário encontrado
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredUsers.map(user => {
                          const isSelected = formData.specificUserIds?.includes(user.id);
                          return (
                            <div 
                              key={user.id} 
                              className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                                isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                              }`}
                            >
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleUserSelection(user.id)}
                              />
                              <label
                                htmlFor={`user-${user.id}`}
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                  <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                                <Badge variant={user.plan === 'Pro' ? 'default' : 'secondary'} className="text-xs">
                                  {user.plan === 'Pro' ? '⭐ Pro' : '🆓 Free'}
                                </Badge>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      {formData.specificUserIds?.length || 0} de {availableUsers.length} {formData.specificUserIds?.length === 1 ? 'usuário selecionado' : 'usuários selecionados'}
                    </p>
                    {userSearchTerm && (
                      <p className="text-xs text-muted-foreground">
                        Mostrando {filteredUsers.length} {filteredUsers.length === 1 ? 'resultado' : 'resultados'}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as Campaign['status'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rascunho">📝 Rascunho</SelectItem>
                <SelectItem value="Agendada">🕒 Agendada</SelectItem>
                <SelectItem value="Ativa">✅ Ativa (Exibir Agora)</SelectItem>
                <SelectItem value="Finalizada">🏁 Finalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expiresAt">Data de Expiração (Opcional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formData.expiresAt ? new Date(formData.expiresAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
            <p className="text-xs text-muted-foreground">Quando definido, o aviso deixa de aparecer após esta data</p>
          </div>

          {campaign && (
            <div className="grid gap-2 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Métricas (Somente Leitura)</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold">{campaign.views}</p>
                  <p className="text-xs text-muted-foreground">Visualizações</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{campaign.clicks}</p>
                  <p className="text-xs text-muted-foreground">Cliques</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{campaign.targetedUsers}</p>
                  <p className="text-xs text-muted-foreground">Usuários Alvo</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.title || !formData.message}>
            {campaign ? "Salvar Alterações" : "Criar Aviso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

