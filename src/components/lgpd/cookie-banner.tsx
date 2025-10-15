"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Cookie, Settings } from 'lucide-react';
import { ConsentType } from '@/lib/lgpd-consent';
import { fetchWithAuth } from '@/lib/auth-token';

interface CookieBannerProps {
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onCustomize?: () => void;
}

export function CookieBanner({ onAcceptAll, onRejectAll, onCustomize }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Verificar se o usuário já deu consentimento
    const hasConsented = localStorage.getItem('lgpd_consent');
    if (!hasConsented) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = async () => {
    const consents = {
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true,
      data_processing: true,
      data_sharing: true,
    };

    localStorage.setItem('lgpd_consent', JSON.stringify(consents));
    localStorage.setItem('lgpd_consent_date', new Date().toISOString());

    // Salvar no backend (se usuário estiver logado)
    try {
      await fetchWithAuth('/api/lgpd/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consents),
      });
    } catch (error) {
      // Usuário não está logado ou erro ao salvar, mas continua com localStorage
      console.log('Consentimentos salvos apenas no localStorage');
    }

    setIsVisible(false);
    onAcceptAll?.();
  };

  const handleRejectAll = async () => {
    const consents = {
      essential: true, // Cookies essenciais são sempre aceitos
      analytics: false,
      marketing: false,
      personalization: false,
      data_processing: false,
      data_sharing: false,
    };

    localStorage.setItem('lgpd_consent', JSON.stringify(consents));
    localStorage.setItem('lgpd_consent_date', new Date().toISOString());

    // Salvar no backend (se usuário estiver logado)
    try {
      await fetchWithAuth('/api/lgpd/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consents),
      });
    } catch (error) {
      // Usuário não está logado ou erro ao salvar, mas continua com localStorage
      console.log('Consentimentos salvos apenas no localStorage');
    }

    setIsVisible(false);
    onRejectAll?.();
  };

  const handleCustomize = () => {
    setShowDetails(!showDetails);
    onCustomize?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <Card className="mx-auto max-w-4xl border-2 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Cookie className="size-8 shrink-0 text-primary" />
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  🍪 Nós usamos cookies e dados pessoais
                </h3>
                <p className="text-sm text-muted-foreground">
                  De acordo com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>, 
                  nós coletamos e processamos alguns dados pessoais para melhorar sua experiência, 
                  realizar análises estatísticas e personalizar conteúdo. Você pode gerenciar 
                  suas preferências a qualquer momento.
                </p>
              </div>

              {showDetails && (
                <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong className="text-foreground">✅ Cookies Essenciais (Obrigatórios)</strong>
                      <p className="text-muted-foreground">
                        Necessários para o funcionamento do site (autenticação, segurança).
                      </p>
                    </div>
                    <div>
                      <strong className="text-foreground">📊 Análise e Performance</strong>
                      <p className="text-muted-foreground">
                        Google Analytics para entender como você usa o site.
                      </p>
                    </div>
                    <div>
                      <strong className="text-foreground">🎯 Marketing</strong>
                      <p className="text-muted-foreground">
                        Pixels de conversão (Google, Meta) para medir eficácia de anúncios.
                      </p>
                    </div>
                    <div>
                      <strong className="text-foreground">✨ Personalização</strong>
                      <p className="text-muted-foreground">
                        Lembrar suas preferências e personalizar conteúdo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button 
                  onClick={handleAcceptAll} 
                  className="flex-1"
                  size="lg"
                >
                  Aceitar Todos
                </Button>
                <Button 
                  onClick={handleRejectAll} 
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Rejeitar Todos
                </Button>
                <Button 
                  onClick={handleCustomize} 
                  variant="ghost"
                  className="flex-1"
                  size="lg"
                >
                  <Settings className="mr-2 size-4" />
                  {showDetails ? 'Ocultar' : 'Personalizar'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Ao continuar navegando, você concorda com nossa{' '}
                <a href="/politica-privacidade" className="underline hover:text-foreground">
                  Política de Privacidade
                </a>{' '}
                e{' '}
                <a href="/termos-de-uso" className="underline hover:text-foreground">
                  Termos de Uso
                </a>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

