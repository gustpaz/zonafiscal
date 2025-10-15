"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { makeUserSuperAdmin, removeUserAdminPermissions, isUserSuperAdmin } from "@/lib/admin-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserCheck, UserX, Shield } from "lucide-react";

export default function AdminDebugPage() {
  const { user } = useAuth();
  const [targetUserId, setTargetUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUserStatus, setCurrentUserStatus] = useState<string | null>(null);

  const handleMakeSuperAdmin = async () => {
    if (!targetUserId.trim()) {
      setMessage({ type: 'error', text: 'Por favor, insira um User ID válido.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const success = await makeUserSuperAdmin(targetUserId.trim());
      if (success) {
        setMessage({ type: 'success', text: 'Usuário transformado em Super Admin com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao transformar usuário em Super Admin.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro inesperado ao transformar usuário.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdminPermissions = async () => {
    if (!targetUserId.trim()) {
      setMessage({ type: 'error', text: 'Por favor, insira um User ID válido.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const success = await removeUserAdminPermissions(targetUserId.trim());
      if (success) {
        setMessage({ type: 'success', text: 'Permissões de admin removidas com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao remover permissões de admin.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro inesperado ao remover permissões.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAdmin = async () => {
    if (!targetUserId.trim()) {
      setMessage({ type: 'error', text: 'Por favor, insira um User ID válido.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const isAdmin = await isUserSuperAdmin(targetUserId.trim());
      setMessage({ 
        type: 'success', 
        text: `Usuário ${isAdmin ? 'É' : 'NÃO É'} Super Admin.` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao verificar permissões do usuário.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMakeMeSuperAdmin = async () => {
    if (!user?.uid) {
      setMessage({ type: 'error', text: 'Usuário não logado.' });
      return;
    }

    setTargetUserId(user.uid);
    setLoading(true);
    setMessage(null);

    try {
      const success = await makeUserSuperAdmin(user.uid);
      if (success) {
        setMessage({ type: 'success', text: 'Você foi transformado em Super Admin! Recarregue a página para ver o menu Admin.' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao transformar em Super Admin.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro inesperado ao transformar em Super Admin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckMyStatus = async () => {
    if (!user?.uid) {
      setCurrentUserStatus('❌ Usuário não logado');
      return;
    }

    setLoading(true);
    setCurrentUserStatus('🔍 Verificando...');

    try {
      console.log("🔍 [DEBUG] Verificando status do usuário:", {
        uid: user.uid,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      const { getUserById } = await import('@/lib/admin-data');
      const userData = await getUserById(user.uid);
      
      console.log("🔍 [DEBUG] Dados do usuário no Firestore:", userData);
      
      if (!userData) {
        setCurrentUserStatus(`❌ Usuário não encontrado no Firestore\n\nUID: ${user.uid}\nEmail: ${user.email}`);
      } else {
        const isAdmin = userData.adminRole === 'Super Admin' || 
                        (userData.adminPermissions && userData.adminPermissions.length > 0);
        
        setCurrentUserStatus(
          `📊 STATUS ATUAL:\n\n` +
          `UID: ${user.uid}\n` +
          `Email: ${user.email || 'N/A'}\n` +
          `Nome: ${user.displayName || 'N/A'}\n\n` +
          `Admin Role: ${userData.adminRole || 'Nenhum'}\n` +
          `Admin Permissions: ${userData.adminPermissions?.join(', ') || 'Nenhuma'}\n\n` +
          `${isAdmin ? '✅ VOCÊ É ADMIN!' : '❌ VOCÊ NÃO É ADMIN'}`
        );
      }
    } catch (error) {
      setCurrentUserStatus(`❌ Erro ao buscar dados:\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Página de debug não requer permissões de admin
  if (!user) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-6">
            <p className="text-red-800">Você precisa estar logado para acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Debug - Gerenciamento de Admin</h1>
        <p className="text-muted-foreground">
          Ferramentas para gerenciar permissões de administrador
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Shield className="h-5 w-5" />
            Verificar Meu Status
          </CardTitle>
          <CardDescription>
            Veja suas permissões atuais no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCheckMyStatus}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verificar Meu Status
              </>
            )}
          </Button>
          {currentUserStatus && (
            <Alert>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm font-mono">{currentUserStatus}</pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Shield className="h-5 w-5" />
            Transformar-se em Super Admin
          </CardTitle>
          <CardDescription>
            Transforme seu próprio usuário em Super Admin para acessar o menu Admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleMakeMeSuperAdmin}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Transformando...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Transformar-me em Super Admin
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Permissões de Usuário
          </CardTitle>
          <CardDescription>
            Transforme outros usuários em Super Admin ou remova suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID do Firebase</Label>
            <Input
              id="userId"
              placeholder="Cole o User ID aqui (ex: abc123def456...)"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Você pode encontrar o User ID no console do navegador ou no Firebase Console
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleMakeSuperAdmin}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              Tornar Super Admin
            </Button>

            <Button 
              onClick={handleRemoveAdminPermissions}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
              Remover Permissões
            </Button>

            <Button 
              onClick={handleCheckAdmin}
              disabled={loading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Verificar Status
            </Button>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Usuário Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>User ID:</strong> {user?.uid}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Nome:</strong> {user?.displayName || 'Não definido'}</p>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          <strong>⚠️ Atenção:</strong> Esta é uma ferramenta de debug. Use com cuidado e apenas para fins de desenvolvimento/teste.
          Para transformar seu próprio usuário em Super Admin, use seu User ID atual.
        </AlertDescription>
      </Alert>
    </div>
  );
}
