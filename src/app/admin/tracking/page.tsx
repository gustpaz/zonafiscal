

"use client";

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Monitor, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTrackingSettingsClient, saveTrackingSettingsClient } from '@/lib/client-admin-tracking';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAccess } from '@/hooks/use-admin-access';
import AdminAccessDenied from '@/components/admin-access-denied';

export default function AdminTrackingPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({ metaPixelId: '', googleAnalyticsId: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();
    const { toast } = useToast();
    const { isAuthorized, isChecking, accessDenied } = useAdminAccess('marketing', false);

    useEffect(() => {
        if (isAuthorized) {
            getTrackingSettingsClient().then(data => {
                setSettings(data);
                setLoading(false);
            }).catch(error => {
                console.error("Erro ao carregar configurações:", error);
                toast({
                    title: "Erro ao carregar configurações",
                    description: "Não foi possível carregar as configurações de rastreamento.",
                    variant: "destructive",
                });
                setLoading(false);
            });
        }
    }, [isAuthorized, toast]);

    const handleSave = () => {
        if (!user) return;
        startTransition(async () => {
            try {
                await saveTrackingSettingsClient(settings);
                
                // Salvar também no localStorage para uso imediato do Pixel
                if (settings.metaPixelId) {
                    localStorage.setItem('metaPixelId', settings.metaPixelId);
                }
                if (settings.googleAnalyticsId) {
                    localStorage.setItem('googleAnalyticsId', settings.googleAnalyticsId);
                }
                
                toast({ 
                    title: 'Configurações Salvas!', 
                    description: 'Seus IDs de rastreamento foram atualizados. Recarregue a página para aplicar.' 
                });
            } catch (error) {
                console.error("Erro ao salvar configurações:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível salvar as configurações.",
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
            title="Acesso ao Rastreamento Negado"
            description="Você não tem permissões de administrador para gerenciar rastreamento."
        />;
    }

    if (loading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-8">
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Monitor/> Rastreamento & Pixels</CardTitle>
                <CardDescription>Gerencie os IDs de rastreamento para suas ferramentas de análise e marketing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="metaPixelId">Meta Pixel ID (Facebook/Instagram)</Label>
                    <Input 
                        id="metaPixelId" 
                        placeholder="Seu ID do Pixel da Meta"
                        value={settings.metaPixelId}
                        onChange={(e) => setSettings(prev => ({...prev, metaPixelId: e.target.value}))}
                    />
                     <p className="text-xs text-muted-foreground">
                        Usado para rastrear eventos como PageView, Lead e Purchase para otimização de anúncios.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="googleAnalyticsId">Google Analytics 4 ID</Label>
                    <Input 
                        id="googleAnalyticsId" 
                        placeholder="G-XXXXXXXXXX" 
                        value={settings.googleAnalyticsId}
                        onChange={(e) => setSettings(prev => ({...prev, googleAnalyticsId: e.target.value}))}
                    />
                    <p className="text-xs text-muted-foreground">
                        Usado para análise de tráfego e comportamento do usuário. (Integração futura)
                    </p>
                </div>

                <Button onClick={handleSave} disabled={isSaving || !user}>
                    {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                    Salvar Alterações
                </Button>
            </CardContent>
        </Card>
    )
}
