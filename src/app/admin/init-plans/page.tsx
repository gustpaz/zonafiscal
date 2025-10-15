"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Database } from "lucide-react";
import { initializePlans } from "@/scripts/init-plans";

export default function InitPlansPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; created?: number; message?: string; error?: any } | null>(null);

  const handleInitialize = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const res = await initializePlans();
      setResult(res);
    } catch (error) {
      setResult({ success: false, error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Inicializar Planos no Firestore</h1>
        <p className="text-muted-foreground">
          Execute esta ação UMA VEZ para criar os planos padrão no Firestore.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Criar Planos Padrão
          </CardTitle>
          <CardDescription>
            Isso criará os planos "Gratuito" e "Pro" na coleção 'plans' do Firestore.
            Se os planos já existirem, nada acontecerá.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleInitialize} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Inicializando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Inicializar Planos
              </>
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription>
                {result.success ? (
                  <div>
                    <p className="font-medium">✅ Sucesso!</p>
                    <p>{result.message}</p>
                    {result.created && result.created > 0 && (
                      <p className="mt-2">Foram criados {result.created} planos.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">❌ Erro!</p>
                    <p>Não foi possível inicializar os planos.</p>
                    <pre className="mt-2 text-xs">{JSON.stringify(result.error, null, 2)}</pre>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

