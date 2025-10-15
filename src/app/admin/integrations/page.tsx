
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, Power, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";

const integrationsData = [
    { id: 'stripe', name: "Stripe", description: "Gateway de pagamento para processar assinaturas.", connected: true, logo: "https://cdn.worldvectorlogo.com/logos/stripe-4.svg" },
    { id: 'hubspot', name: "HubSpot", description: "Plataforma de CRM e marketing.", connected: false, logo: "https://cdn.worldvectorlogo.com/logos/hubspot.svg" },
    { id: 'slack', name: "Slack", description: "Receba notificações sobre novos usuários e pagamentos.", connected: true, logo: "https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg" },
];

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState(integrationsData);
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('integrations', false);
  const { toast } = useToast();

  const handleIntegrationClick = (id: string) => {
    if (id === 'slack') {
      window.location.href = '/admin/slack-config';
    } else {
      toast({
        title: "Em desenvolvimento",
        description: `A integração com ${integrations.find(i => i.id === id)?.name} será implementada em breve.`,
      });
    }
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
      title="Acesso às Integrações Negado"
      description="Você não tem permissões de administrador para gerenciar integrações."
    />;
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plug /> Integrações</CardTitle>
            <CardDescription>Conecte o Zona Fiscal com outras ferramentas para automatizar processos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {integrations.map(integration => (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                        <Image src={integration.logo} alt={`${integration.name} logo`} className="w-10 h-10 object-contain" width={40} height={40}/>
                        <div>
                            <p className="font-semibold">{integration.name}</p>
                            <p className="text-sm text-muted-foreground">{integration.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant={integration.connected ? "default" : "outline"} className={integration.connected ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}>
                            {integration.connected ? "Conectado" : "Desconectado"}
                        </Badge>
                        {integration.id === 'slack' ? (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleIntegrationClick(integration.id)}
                            >
                                <Settings className="mr-2 size-4" />
                                Configurar
                            </Button>
                        ) : (
                            <Switch
                                id={`integration-${integration.id}`}
                                checked={integration.connected}
                                onCheckedChange={() => handleIntegrationClick(integration.id)}
                                aria-label={`Ativar/Desativar integração com ${integration.name}`}
                            />
                        )}
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
  );
}
