"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Loader2, CheckCircle } from 'lucide-react';

export default function ReativarContaPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
  });

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/lgpd/validate-reactivation-token?token=${token}`);
      if (response.ok) {
        setIsValidToken(true);
      } else {
        toast({
          title: "Token inválido",
          description: "Este link de reativação é inválido ou expirou.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/lgpd/submit-reactivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: "Solicitação enviada!",
          description: "Seus dados foram recebidos. Você receberá um email quando a reativação for aprovada.",
        });
      } else {
        const data = await response.json();
        toast({
          title: "Erro ao enviar",
          description: data.error || "Não foi possível enviar a solicitação.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao processar sua solicitação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              Este link de reativação é inválido. Verifique o link no email recebido.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              <Loader2 className="mr-2 inline-block animate-spin" />
              Validando...
            </CardTitle>
            <CardDescription>
              Aguarde enquanto validamos seu link de reativação.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              <CheckCircle className="mx-auto mb-4 size-12 text-green-500" />
              Solicitação Recebida!
            </CardTitle>
            <CardDescription className="text-center">
              Seus dados foram recebidos com sucesso. Nossa equipe irá analisar e você
              receberá um email quando a reativação for aprovada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/50 p-4 text-sm">
              <p><strong>Próximos Passos:</strong></p>
              <ul className="ml-4 mt-2 list-disc space-y-1">
                <li>Aguarde a análise da equipe (até 15 dias úteis)</li>
                <li>Você receberá um email com a confirmação</li>
                <li>Após aprovação, poderá fazer login novamente</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 size-6" />
            Reativar Conta Anonimizada
          </CardTitle>
          <CardDescription>
            Para reativar sua conta, precisamos que você forneça seus dados pessoais novamente.
            Estas informações são necessárias para restaurar seu acesso à plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>ℹ️ Por que preciso fornecer meus dados novamente?</strong>
              </p>
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                Anteriormente, você solicitou a anonimização dos seus dados pessoais.
                Isso significa que suas informações identificáveis foram removidas do sistema.
                Para reativar sua conta, precisamos que você nos forneça esses dados novamente.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="João da Silva"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@exemplo.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  required
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 text-sm">
              <p><strong>🔒 Seus Dados Estão Protegidos</strong></p>
              <p className="mt-2 text-muted-foreground">
                Ao fornecer seus dados, você concorda com nossa{' '}
                <a href="/politica-privacidade" className="underline" target="_blank">
                  Política de Privacidade
                </a>{' '}
                e{' '}
                <a href="/termos-de-uso" className="underline" target="_blank">
                  Termos de Uso
                </a>
                . Seus dados serão tratados de acordo com a LGPD (Lei nº 13.709/2018).
              </p>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação de Reativação'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Dúvidas? Entre em contato: <a href="mailto:dpo@zonafiscal.com.br" className="underline">dpo@zonafiscal.com.br</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

