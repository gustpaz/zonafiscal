
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function CancelPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <XCircle className="mx-auto size-12 text-destructive" />
                    <CardTitle className="mt-4 text-2xl">Pagamento Cancelado</CardTitle>
                    <CardDescription>
                       Sua transação não foi concluída.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Você não foi cobrado. Se você acha que isso é um erro, por favor, tente novamente ou entre em contato com o suporte.
                    </p>
                    <Button asChild className="mt-6 w-full" variant="outline">
                        <Link href="/pricing">Ver Planos Novamente</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
