
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import * as fbp from '@/lib/fpixel'

export default function SuccessPage() {
    const searchParams = useSearchParams()

    useEffect(() => {
        const value = searchParams.get('value') || '29.90'; // Default value if not present
        const currency = searchParams.get('currency') || 'BRL';

        // Track purchase event
        fbp.track('Purchase', { currency, value: parseFloat(value) });

    }, [searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CheckCircle className="mx-auto size-12 text-green-500" />
                    <CardTitle className="mt-4 text-2xl">Pagamento Aprovado!</CardTitle>
                    <CardDescription>
                        Sua assinatura do Plano Pro foi ativada. Bem-vindo(a)!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Agora você tem acesso a todos os recursos avançados para levar seu controle financeiro para o próximo nível.
                    </p>
                    <Button asChild className="mt-6 w-full">
                        <Link href="/dashboard">Ir para o Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
