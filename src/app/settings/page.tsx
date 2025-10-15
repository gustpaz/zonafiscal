
"use client";

import { useState, useEffect, useRef } from "react";
import DashboardHeader from "@/components/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createCustomerPortalSession, getSubscriptionInfo } from "@/lib/stripe/actions";
import { Loader2, Users, Camera, Lock, Edit2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getUserByIdClient } from "@/lib/client-admin-data";
import { updateUserProfile, uploadProfilePhoto, changeUserPassword } from "@/lib/user-profile";
import type { User } from "@/lib/types";
import Link from "next/link";

// Em uma aplicação real, este estado seria gerenciado por um provedor de contexto ou uma store.
// Para este protótipo, vamos usar o localStorage para persistir o valor.
const getSpendingLimit = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem("spendingLimit") || "2000";
    }
    return "2000";
};

const setSpendingLimit = (limit: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem("spendingLimit", limit);
    }
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [limit, setLimit] = useState(getSpendingLimit());
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  // Buscar dados reais do usuário
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      getUserByIdClient(user.uid).then(data => {
        setUserData(data);
        setCompanyName(data?.companyName || "");
        setLoadingUserData(false);
        
        // Buscar info da subscription se tiver
        if (data?.stripeSubscriptionId) {
          getSubscriptionInfo(user.uid).then(subInfo => {
            setSubscriptionInfo(subInfo);
          }).catch(error => {
            console.error("Erro ao buscar info da subscription:", error);
          });
        }
      }).catch(error => {
        console.error("Erro ao buscar dados do usuário:", error);
        setLoadingUserData(false);
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !displayName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o nome.",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateUserProfile(user, displayName.trim());
      
      // Atualizar nome da empresa se foi alterado
      if (companyName.trim() && companyName !== userData?.companyName) {
        const { saveCompanyInfo } = await import('@/lib/user-profile');
        await saveCompanyInfo(companyName.trim());
      }
      
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram atualizadas com sucesso."
      });
      
      // Recarregar dados
      const updatedData = await getUserByIdClient(user.uid);
      setUserData(updatedData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive"
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      await uploadProfilePhoto(user, file);
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso."
      });
      // Recarregar a página para atualizar o avatar
      window.location.reload();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da foto.",
        variant: "destructive"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos de senha.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "A nova senha e a confirmação não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    try {
      await changeUserPassword(user, currentPassword, newPassword);
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso."
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive"
      });
    }
  };
  
  const handleSave = () => {
    setSpendingLimit(limit);
    toast({
      title: "Configurações Salvas!",
      description: "Seu limite de gastos pessoais foi atualizado com sucesso.",
    });
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setLoadingPortal(true);
    try {
        // Em um app real, o customerId do Stripe estaria associado ao seu usuário no banco de dados.
        // Como não temos um banco de dados de usuários completo, vamos simular que o UID do Firebase é o customerId.
        // Isso NÃO FUNCIONARÁ na prática sem uma lógica para criar/associar o customerId.
        const { url } = await createCustomerPortalSession(user.uid);
        window.location.href = url;
    } catch (error) {
        toast({
            title: "Erro",
            description: "Não foi possível acessar o portal de assinaturas. Esta funcionalidade requer um ID de cliente Stripe válido.",
            variant: "destructive"
        });
        setLoadingPortal(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Configurações" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                  <CardTitle>Foto de Perfil</CardTitle>
                  <CardDescription>
                    Atualize sua foto de perfil.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'Usuário'} />
                      <AvatarFallback className="text-2xl">
                        {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Alterar Foto
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG ou GIF. Máximo 5MB.
                      </p>
                    </div>
                  </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                    Atualize seus dados pessoais.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input 
                      id="name" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="company">Empresa ou Atividade</Label>
                    <Input 
                      id="company" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Silva Consultoria, Autônomo"
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome da sua empresa ou atividade profissional.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email ?? ''} disabled />
                    <p className="text-xs text-muted-foreground">
                      O email não pode ser alterado.
                    </p>
                </div>
                <Button onClick={handleUpdateProfile}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Atualizar Perfil
                </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Segurança
                  </CardTitle>
                  <CardDescription>
                    Altere sua senha de acesso.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Senha Atual</Label>
                    <Input 
                      id="current-password" 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input 
                      id="new-password" 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite a nova senha novamente"
                    />
                  </div>
                  <Button onClick={handleChangePassword}>
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Preferências Financeiras</CardTitle>
                <CardDescription>
                    Configure seus limites e alertas.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="salary">"Salário" Informal (Limite Pessoal Mensal)</Label>
                    <Input 
                    id="salary" 
                    type="number" 
                    placeholder="R$ 2000,00" 
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    />
                </div>
                <Button onClick={handleSave}>Salvar Limite</Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento de Dados</CardTitle>
                    <CardDescription>
                        Importe ou exporte seus dados de transação.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Button variant="outline" disabled>Importar CSV (Em Breve)</Button>
                    <Button variant="outline" disabled>Exportar Dados (Em Breve)</Button>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento da Assinatura</CardTitle>
                    <CardDescription>
                        Visualize seu plano atual e gerencie sua assinatura.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-accent/20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                            <p className="font-medium">Plano Atual</p>
                            {loadingUserData ? (
                              <div className="flex items-center gap-2 mt-1">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Carregando...</span>
                              </div>
                            ) : (
                              <div className="space-y-2 mt-1">
                                <Badge variant="outline" className="text-primary border-primary/50">
                                  {userData?.plan || 'Gratuito'}
                                </Badge>
                                
                                {/* Status de Cancelamento Pendente */}
                                {userData?.subscriptionStatus === 'canceling' && userData?.subscriptionCancelAt && (
                                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
                                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                                      <AlertTriangle className="size-3" />
                                      Cancelamento agendado
                                    </p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                      Acesso até: {new Date(userData.subscriptionCancelAt).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Data de Renovação (se assinatura ativa) */}
                                {userData?.stripeSubscriptionId && !userData?.subscriptionStatus && subscriptionInfo?.currentPeriodEnd && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Renovação em: {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                )}
                              </div>
                            )}
                        </div>
                    </div>

                    {/* Botões condicionais baseados no plano */}
                    {!loadingUserData && (userData?.plan === 'Gratuito' || !userData?.stripeCustomerId) ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Faça upgrade para um plano pago e tenha acesso ao portal de gerenciamento de assinatura no Stripe.
                        </p>
                        <Button asChild className="w-full">
                          <Link href="/pricing">Ver Planos Pagos</Link>
                        </Button>
                      </div>
                    ) : !loadingUserData ? (
                      <div className="space-y-3">
                        <Button 
                          variant="outline"
                          onClick={handleManageSubscription} 
                          disabled={loadingPortal}
                          className="w-full"
                        >
                          {loadingPortal && <Loader2 className="mr-2 animate-spin" />}
                          Gerenciar Pagamento e Faturas
                        </Button>
                        <Button 
                          asChild
                          variant="destructive"
                          className="w-full"
                        >
                          <Link href="/downgrade">
                            Cancelar Assinatura
                          </Link>
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Gerencie seus pagamentos ou altere/cancele seu plano
                        </p>
                      </div>
                    ) : null}
                </div>
                </CardContent>
            </Card>
             
             <Card className="border-primary/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="text-primary" /> 
                      Privacidade e Dados
                    </CardTitle>
                    <CardDescription>
                        Gerencie seus dados pessoais e preferências de privacidade (LGPD).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      De acordo com a LGPD, você tem direito a acessar, exportar, corrigir ou excluir seus dados pessoais.
                    </p>
                    <div className="space-y-2">
                      <Button asChild className="w-full" variant="outline">
                          <Link href="/privacidade">
                            <ShieldCheck className="mr-2 size-4" />
                            Configurações de Privacidade
                          </Link>
                      </Button>
                      <Button asChild className="w-full" variant="ghost">
                          <Link href="/politica-privacidade">
                            Política de Privacidade
                          </Link>
                      </Button>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users/> Equipe</CardTitle>
                    <CardDescription>
                        Convide e gerencie os membros da sua equipe.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">Adicione membros à sua conta para colaborar no gerenciamento financeiro.</p>
                    <Button asChild className="w-full">
                        <Link href="/team">Gerenciar Equipe</Link>
                    </Button>
                </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}
