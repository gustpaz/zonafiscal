
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, PlusCircle, Send, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useTransition } from "react";
import { getMarketingDataClient, saveCampaignClient, deleteCampaignClient, type Campaign } from "@/lib/client-admin-marketing";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";
import { useToast } from "@/hooks/use-toast";
import CampaignFormDialog from "@/components/campaign-form-dialog";

export default function AdminMarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isPending, startTransition] = useTransition();
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('marketing', false);
  const { toast } = useToast();

  const fetchCampaigns = () => {
    startTransition(async () => {
      try {
        const result = await getMarketingDataClient();
        setCampaigns(result.campaigns);
      } catch (error) {
        console.error("Erro ao buscar campanhas:", error);
        toast({
          title: "Erro ao carregar campanhas",
          description: "Não foi possível carregar as campanhas de marketing.",
          variant: "destructive",
        });
      }
    });
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchCampaigns();
    }
  }, [isAuthorized]);

  const handleNewCampaign = () => {
    setSelectedCampaign(null);
    setIsDialogOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsDialogOpen(true);
  };

  const handleSaveCampaign = async (campaign: Campaign) => {
    startTransition(async () => {
      try {
        await saveCampaignClient(campaign);
        toast({
          title: "Campanha salva!",
          description: "A campanha foi salva com sucesso.",
        });
        fetchCampaigns();
      } catch (error) {
        console.error("Erro ao salvar campanha:", error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar a campanha.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    
    startTransition(async () => {
      try {
        await deleteCampaignClient(campaignId);
        toast({
          title: "Campanha excluída!",
          description: "A campanha foi removida com sucesso.",
        });
        fetchCampaigns();
      } catch (error) {
        console.error("Erro ao excluir campanha:", error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a campanha.",
          variant: "destructive",
        });
      }
    });
  };

  // Mostra loading enquanto verifica permissões
  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // Se não tem autorização, mostra página de erro
  if (accessDenied || (!isChecking && !isAuthorized)) {
    return <AdminAccessDenied 
      title="Acesso ao Marketing Negado"
      description="Você não tem permissões de administrador para gerenciar marketing."
    />;
  }

  if (isPending && campaigns.length === 0) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <>
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2"><Megaphone /> Campanhas de Marketing</CardTitle>
                <CardDescription>Crie, envie e gerencie a comunicação com seus clientes.</CardDescription>
            </div>
            <Button onClick={handleNewCampaign} disabled={isPending}>
                <PlusCircle className="mr-2"/>
                Nova Campanha
            </Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Público-Alvo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Visualizações</TableHead>
                        <TableHead className="text-center">Cliques</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {campaigns.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                Nenhum aviso criado ainda. Clique em "Nova Campanha" para começar.
                            </TableCell>
                        </TableRow>
                    ) : (
                      campaigns.map(campaign => (
                        <TableRow key={campaign.id}>
                            <TableCell className="font-medium">
                              <div>
                                <p>{campaign.title}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">{campaign.message}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {campaign.type === 'info' && 'ℹ️ Info'}
                                {campaign.type === 'warning' && '⚠️ Alerta'}
                                {campaign.type === 'success' && '✅ Novidade'}
                                {campaign.type === 'promotion' && '🎁 Promoção'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {campaign.targetAudience === 'all' && '👥 Todos'}
                              {campaign.targetAudience === 'pro' && '⭐ Pro'}
                              {campaign.targetAudience === 'free' && '🆓 Gratuito'}
                              {campaign.targetAudience === 'specific' && (
                                <div className="flex flex-col">
                                  <span>🎯 Específico</span>
                                  <span className="text-xs text-muted-foreground">
                                    {campaign.specificUserIds?.length || 0} {campaign.specificUserIds?.length === 1 ? 'usuário' : 'usuários'}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                                <Badge variant={
                                    campaign.status === 'Ativa' ? 'default' : 
                                    campaign.status === 'Agendada' ? 'secondary' : 'outline'
                                } className={
                                     campaign.status === 'Ativa' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                                     campaign.status === 'Agendada' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : ''
                                }>
                                    {campaign.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center">{campaign.views || 0}</TableCell>
                            <TableCell className="text-center">{campaign.clicks || 0}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditCampaign(campaign)} title="Editar">
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCampaign(campaign.id)} title="Excluir">
                                        <Trash2 className="size-4 text-red-500" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                      ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>

    <CampaignFormDialog
      isOpen={isDialogOpen}
      onClose={() => setIsDialogOpen(false)}
      onSave={handleSaveCampaign}
      campaign={selectedCampaign}
    />
  </>
  );
}
