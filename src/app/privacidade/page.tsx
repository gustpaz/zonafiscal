"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Download, Trash2, Eye, FileText, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { fetchWithAuth } from '@/lib/auth-token';
import { verifyPasswordWithRateLimit } from '@/lib/verify-password';
import { DeleteAccountDialog } from '@/components/lgpd/delete-account-dialog';

export default function PrivacidadePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [consents, setConsents] = useState({
    essential: true,
    analytics: false,
    marketing: false,
    personalization: false,
    data_processing: false,
    data_sharing: false,
  });

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const response = await fetchWithAuth('/api/lgpd/consent');
      if (response.ok) {
        const data = await response.json();
        if (data.consents) {
          const formattedConsents = {
            essential: true, // Sempre true
            analytics: data.consents.analytics?.granted || false,
            marketing: data.consents.marketing?.granted || false,
            personalization: data.consents.personalization?.granted || false,
            data_processing: data.consents.data_processing?.granted || false,
            data_sharing: data.consents.data_sharing?.granted || false,
          };
          setConsents(formattedConsents);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar consentimentos:', error);
    }
  };

  const handleConsentChange = async (type: string, value: boolean) => {
    if (type === 'essential') return; // Não pode desabilitar cookies essenciais

    setConsents(prev => ({ ...prev, [type]: value }));
  };

  const saveConsents = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/api/lgpd/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consents),
      });

      if (response.ok) {
        toast({
          title: "Preferências salvas!",
          description: "Suas preferências de privacidade foram atualizadas com sucesso.",
        });
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas preferências. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/api/lgpd/export-data');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meus-dados-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Dados exportados!",
          description: "Seus dados foram exportados com sucesso.",
        });
      } else {
        throw new Error('Erro ao exportar');
      }
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar seus dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async (type: 'anonymize' | 'permanent', password: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verificar senha no frontend primeiro
      const passwordCheck = await verifyPasswordWithRateLimit(user.uid, password);

      if (!passwordCheck.valid) {
        toast({
          title: "Senha incorreta",
          description: passwordCheck.error || "A senha fornecida está incorreta.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Senha verificada, prosseguir com a exclusão
      const response = await fetchWithAuth('/api/lgpd/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passwordVerified: true,
          deleteType: type,
          reason: 'Solicitação do usuário',
        }),
      });

      if (response.ok) {
        toast({
          title: type === 'anonymize' ? "Dados anonimizados" : "Conta excluída",
          description: type === 'anonymize' 
            ? "Seus dados foram anonimizados com sucesso." 
            : "Sua conta foi excluída permanentemente.",
        });
        // Redirecionar para logout
        setTimeout(() => {
          window.location.href = '/logout';
        }, 2000);
      } else {
        throw new Error('Erro ao excluir');
      }
    } catch (error) {
      toast({
        title: "Erro ao processar",
        description: "Não foi possível processar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar logado para acessar as configurações de privacidade.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          <Shield className="mr-2 inline-block" />
          Privacidade e Dados Pessoais
        </h1>
        <p className="text-muted-foreground">
          Gerencie seus dados pessoais e preferências de privacidade de acordo com a LGPD
          (Lei Geral de Proteção de Dados - Lei nº 13.709/2018).
        </p>
      </div>

      {/* Consentimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Consentimentos</CardTitle>
          <CardDescription>
            Controle como seus dados são coletados e utilizados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="essential" className="text-base font-medium">
                ✅ Cookies Essenciais
              </Label>
              <p className="text-sm text-muted-foreground">
                Necessários para o funcionamento do site (sempre ativo)
              </p>
            </div>
            <Switch
              id="essential"
              checked={consents.essential}
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="analytics" className="text-base font-medium">
                📊 Análise e Performance
              </Label>
              <p className="text-sm text-muted-foreground">
                Google Analytics para melhorar a experiência
              </p>
            </div>
            <Switch
              id="analytics"
              checked={consents.analytics}
              onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing" className="text-base font-medium">
                🎯 Marketing
              </Label>
              <p className="text-sm text-muted-foreground">
                Pixels de conversão e remarketing
              </p>
            </div>
            <Switch
              id="marketing"
              checked={consents.marketing}
              onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="personalization" className="text-base font-medium">
                ✨ Personalização
              </Label>
              <p className="text-sm text-muted-foreground">
                Personalizar conteúdo e recomendações
              </p>
            </div>
            <Switch
              id="personalization"
              checked={consents.personalization}
              onCheckedChange={(checked) => handleConsentChange('personalization', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data_processing" className="text-base font-medium">
                🔄 Processamento de Dados
              </Label>
              <p className="text-sm text-muted-foreground">
                Processar dados para melhorias e análises
              </p>
            </div>
            <Switch
              id="data_processing"
              checked={consents.data_processing}
              onCheckedChange={(checked) => handleConsentChange('data_processing', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data_sharing" className="text-base font-medium">
                🔗 Compartilhamento de Dados
              </Label>
              <p className="text-sm text-muted-foreground">
                Compartilhar dados com parceiros de confiança
              </p>
            </div>
            <Switch
              id="data_sharing"
              checked={consents.data_sharing}
              onCheckedChange={(checked) => handleConsentChange('data_sharing', checked)}
            />
          </div>

          <Button onClick={saveConsents} disabled={isLoading} className="w-full">
            {isLoading ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </CardContent>
      </Card>

      {/* Direitos do Titular */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Direitos (LGPD)</CardTitle>
          <CardDescription>
            Conforme o Art. 18 da LGPD, você tem os seguintes direitos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" onClick={exportData} disabled={isLoading}>
              <Download className="size-5" />
              <div className="text-left">
                <div className="font-semibold">Exportar Meus Dados</div>
                <div className="text-xs text-muted-foreground">
                  Direito à portabilidade (Art. 18, V)
                </div>
              </div>
            </Button>

            <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
              <a href="/politica-privacidade">
                <FileText className="size-5" />
                <div className="text-left">
                  <div className="font-semibold">Política de Privacidade</div>
                  <div className="text-xs text-muted-foreground">
                    Como tratamos seus dados
                  </div>
                </div>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Zona de Perigo */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">
            <AlertTriangle className="mr-2 inline-block" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis relacionadas aos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DeleteAccountDialog 
              type="anonymize" 
              onConfirm={(password) => deleteAccount('anonymize', password)}
              isLoading={isLoading}
            />

            <DeleteAccountDialog 
              type="permanent" 
              onConfirm={(password) => deleteAccount('permanent', password)}
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Dúvidas sobre privacidade?</strong> Entre em contato com nosso
            Encarregado de Dados (DPO) através do email{' '}
            <a href="mailto:dpo@zonafiscal.com.br" className="underline">
              dpo@zonafiscal.com.br
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

