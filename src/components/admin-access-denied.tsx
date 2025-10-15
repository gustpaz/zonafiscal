"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Home } from "lucide-react";
import Link from "next/link";

interface AdminAccessDeniedProps {
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

export default function AdminAccessDenied({ 
  title = "Acesso Negado",
  description = "Você não tem permissão para acessar esta área administrativa.",
  showHomeButton = true
}: AdminAccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
            <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Área Restrita</p>
                <p className="mt-1">
                  Esta seção é exclusiva para administradores do sistema. 
                  Entre em contato com o suporte se você acredita que deveria ter acesso.
                </p>
              </div>
            </div>
          </div>
          
          {showHomeButton && (
            <div className="flex justify-center">
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Voltar ao Dashboard
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
