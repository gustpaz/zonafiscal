"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight, Sparkles, LucideIcon } from "lucide-react";

interface FeatureLockedScreenProps {
  featureName: string;
  description: string;
  benefits: {
    title: string;
    description: string;
  }[];
  icon: LucideIcon;
}

export function FeatureLockedScreen({ featureName, description, benefits, icon: Icon }: FeatureLockedScreenProps) {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950 dark:to-orange-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-amber-900 dark:text-amber-100">
            <div className="rounded-full bg-amber-200 p-2 dark:bg-amber-800">
              <Lock className="size-6" />
            </div>
            {featureName}
          </CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300 text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Banner de Upgrade */}
            <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 p-6 dark:border-amber-700 dark:from-amber-900 dark:to-orange-900">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="size-8 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="font-bold text-lg text-amber-900 dark:text-amber-100">
                    Funcionalidade Premium
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Disponível em todos os planos pagos
                  </p>
                </div>
              </div>
              <p className="text-amber-800 dark:text-amber-200 mb-4">
                Desbloqueie esta funcionalidade e tenha acesso a recursos profissionais que vão 
                <strong> economizar seu tempo</strong> e <strong>melhorar sua gestão financeira</strong>.
              </p>
              <Button 
                onClick={() => window.location.href = '/pricing'}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-6 text-lg shadow-lg"
              >
                <Crown className="mr-2 size-5" />
                Fazer Upgrade Agora
              </Button>
            </div>
            
            {/* Benefícios */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Sparkles className="size-5 text-blue-500" />
                O que você ganha com esta funcionalidade:
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-1">
                      <ArrowRight className="size-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{benefit.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action Final */}
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Planos a partir de <span className="font-bold text-green-600 dark:text-green-400">R$ 29,90/mês</span>
              </p>
              <Button 
                onClick={() => window.location.href = '/pricing'}
                variant="outline"
                className="w-full border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-950"
              >
                Comparar Planos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
