"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Check, X, Loader2, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useAdminAccess } from "@/hooks/use-admin-access";
import AdminAccessDenied from "@/components/admin-access-denied";
import { useToast } from "@/hooks/use-toast";
import { getSlackConfig, saveSlackConfig } from "@/lib/admin-slack-config";

export default function AdminSlackConfigPage() {
  const [slackToken, setSlackToken] = useState('');
  const [slackChannel, setSlackChannel] = useState('#geral');
  const [enabled, setEnabled] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const { isAuthorized, isChecking, accessDenied } = useAdminAccess('integrations', false);
  const { toast } = useToast();

  // Carregar configuração do Firestore ao montar
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getSlackConfig();
        if (config) {
          setSlackToken(config.botToken);
          setSlackChannel(config.channelId);
          setEnabled(config.enabled);
        }
      } catch (error) {
        console.error("Erro ao carregar config:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!slackToken || !slackChannel) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Token e o Canal antes de salvar.",
        variant: "destructive"
      });
      return;
    }

    try {
      const success = await saveSlackConfig({
        botToken: slackToken,
        channelId: slackChannel,
        enabled
      });

      if (success) {
        toast({
          title: "Configuração Salva!",
          description: "As configurações do Slack foram salvas no Firestore.",
        });
        setConnectionStatus('idle');
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  };

  const handleTestConnection = async () => {
    if (!slackToken || !slackChannel) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Token e o Canal antes de testar.",
        variant: "destructive"
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Enviar notificação de teste
      const response = await fetch('/api/slack/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          title: '🧪 Teste de Conexão',
          message: 'Se você está vendo isso, a integração com Slack está funcionando perfeitamente! 🎉',
          color: 'good'
        })
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast({
          title: "Conexão bem-sucedida!",
          description: "Verifique o canal do Slack para a mensagem de teste.",
        });
      } else {
        const error = await response.json();
        setConnectionStatus('error');
        toast({
          title: "Erro na conexão",
          description: error.error || "Não foi possível conectar ao Slack.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      setConnectionStatus('error');
      toast({
        title: "Erro",
        description: "Não foi possível testar a conexão. Verifique as configurações.",
        variant: "destructive"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Mostra loading enquanto verifica permissões ou carrega config
  if (isChecking || loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // Se não tem autorização, mostra página de erro
  if (accessDenied || (!isChecking && !isAuthorized)) {
    return <AdminAccessDenied 
      title="Acesso à Configuração do Slack Negado"
      description="Você não tem permissões de administrador para gerenciar integrações."
    />;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="text-primary" />
                Configuração do Slack
              </CardTitle>
              <CardDescription>
                Receba notificações em tempo real sobre novos usuários, pagamentos, upgrades e mais.
              </CardDescription>
            </div>
            {connectionStatus === 'success' && (
              <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                <Check className="mr-1 size-3" /> Conectado
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-500/30">
                <X className="mr-1 size-3" /> Erro
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="text-base font-semibold">
                Notificações Slack
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar todas as notificações
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slackToken">Bot Token do Slack</Label>
            <Input
              id="slackToken"
              type="password"
              placeholder="xoxb-..."
              value={slackToken}
              onChange={(e) => setSlackToken(e.target.value)}
              disabled={!enabled}
            />
            <p className="text-xs text-muted-foreground">
              Obtenha seu token em <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">api.slack.com/apps</a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slackChannel">Canal do Slack</Label>
            <Input
              id="slackChannel"
              type="text"
              placeholder="#geral ou C01234567"
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              disabled={!enabled}
            />
            <p className="text-xs text-muted-foreground">
              Use o nome do canal (#geral) ou o ID do canal (C01234567)
            </p>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSave} className="flex-1">
              Salvar Configurações
            </Button>
            <Button 
              onClick={handleTestConnection} 
              variant="outline" 
              disabled={testingConnection || !enabled}
            >
              {testingConnection ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Bell className="mr-2 size-4" />
                  Testar Conexão
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Automáticas</CardTitle>
          <CardDescription>
            O que será enviado para o Slack automaticamente:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Bell className="size-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-semibold">🎉 Novo Usuário</p>
                <p className="text-sm text-muted-foreground">
                  Quando alguém se cadastra na plataforma
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Bell className="size-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-semibold">💰 Novo Pagamento</p>
                <p className="text-sm text-muted-foreground">
                  Quando um pagamento é confirmado
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Bell className="size-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold">⬆️ Upgrade de Plano</p>
                <p className="text-sm text-muted-foreground">
                  Quando um usuário faz upgrade
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Bell className="size-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-semibold">😢 Cancelamento</p>
                <p className="text-sm text-muted-foreground">
                  Quando uma assinatura é cancelada
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Bell className="size-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-semibold">⚠️ Falha no Pagamento</p>
                <p className="text-sm text-muted-foreground">
                  Quando um pagamento falha
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Configurar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground mb-2">1. Crie um Slack App</p>
            <p>Acesse <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">api.slack.com/apps</a> e crie um novo app.</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">2. Adicione Permissões (Scopes)</p>
            <p>Em "OAuth & Permissions", adicione os seguintes Bot Token Scopes:</p>
            <ul className="list-disc list-inside mt-1 ml-4">
              <li><code>chat:write</code> - Para enviar mensagens</li>
              <li><code>chat:write.public</code> - Para canais públicos</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">3. Instale o App no Workspace</p>
            <p>Clique em "Install to Workspace" e autorize.</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">4. Copie o Bot Token</p>
            <p>Após instalar, copie o "Bot User OAuth Token" (começa com xoxb-).</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">5. Cole o Token Aqui</p>
            <p>Cole o token no campo acima e escolha o canal desejado.</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">6. Teste a Conexão</p>
            <p>Clique em "Testar Conexão" para verificar se está tudo certo!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

