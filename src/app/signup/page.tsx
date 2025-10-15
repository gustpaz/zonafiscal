
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import * as fbp from '@/lib/fpixel'

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Capture UTM parameters on page load
  useEffect(() => {
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    const utmContent = searchParams.get('utm_content');
    const utmTerm = searchParams.get('utm_term');

    if (utmSource) localStorage.setItem('utm_source', utmSource);
    if (utmMedium) localStorage.setItem('utm_medium', utmMedium);
    if (utmCampaign) localStorage.setItem('utm_campaign', utmCampaign);
    if (utmContent) localStorage.setItem('utm_content', utmContent);
    if (utmTerm) localStorage.setItem('utm_term', utmTerm);
  }, [searchParams]);

  const handleSuccessfulSignup = () => {
    fbp.track('Lead');
    
    // Verificar se tem convite pendente
    const pendingInviteToken = localStorage.getItem('pending_invite_token');
    
    if (pendingInviteToken) {
      // Redirecionar para aceitar convite
      localStorage.removeItem('pending_invite_token');
      localStorage.removeItem('pending_invite_email');
      router.push(`/aceitar-convite?token=${pendingInviteToken}&auto=true`);
    } else {
      // Fluxo normal
      router.push("/onboarding");
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      handleSuccessfulSignup();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro no Cadastro",
        description: "Não foi possível criar a conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
   const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      handleSuccessfulSignup();
    } catch (error) {
       console.error(error);
      toast({
        title: "Erro com Google",
        description: "Não foi possível fazer login com o Google.",
        variant: "destructive",
      });
    } finally {
        setLoading(false);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Image src="/logo.png" alt="Zona Fiscal Logo" width={48} height={48} className="mx-auto size-12" />
          <CardTitle className="mt-4 text-2xl">Crie sua conta</CardTitle>
          <CardDescription>
            Comece a organizar suas finanças hoje mesmo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </form>
          <div className="my-4 flex items-center">
            <div className="flex-grow border-t border-muted" />
            <span className="mx-4 text-xs uppercase text-muted-foreground">
              Ou
            </span>
            <div className="flex-grow border-t border-muted" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
             <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 102.3 282.7 96 248 96c-88.8 0-160.1 71.1-160.1 160.1 0 88.8 71.3 160.1 160.1 160.1 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
            Cadastrar com Google
          </Button>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{" "}
            <Link href="/login" className="underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
