
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Target, DollarSign, PartyPopper, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import TransactionForm from "@/components/transaction-form";
import { AnimatePresence, motion } from "framer-motion";

const steps = [
  { id: 'welcome', title: 'Boas-vindas!', icon: <Rocket className="size-6" /> },
  { id: 'setup', title: 'Configuração Inicial', icon: <Target className="size-6" /> },
  { id: 'first_transaction', title: 'Primeira Transação', icon: <DollarSign className="size-6" /> },
  { id: 'finish', title: 'Tudo Pronto!', icon: <PartyPopper className="size-6" /> },
];

const setSpendingLimit = (limit: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem("spendingLimit", limit);
    }
};

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [spendingLimit, setSpendingLimitState] = useState("2000");
  const [companyName, setCompanyName] = useState("");

  const handleNext = async () => {
    if (currentStep === 1) { // Setup step
        if (parseFloat(spendingLimit) <= 0) {
            toast({ title: "Valor inválido", description: "Por favor, insira um valor maior que zero.", variant: "destructive"});
            return;
        }
        
        if (!companyName.trim()) {
            toast({ title: "Nome da empresa obrigatório", description: "Por favor, informe o nome da sua empresa ou 'Autônomo'.", variant: "destructive"});
            return;
        }

        // Salvar dados no perfil do usuário
        setSpendingLimit(spendingLimit);
        
        // Salvar nome da empresa no Firestore
        try {
            const { saveCompanyInfo } = await import('@/lib/user-profile');
            await saveCompanyInfo(companyName.trim());
        } catch (error) {
            console.error('Erro ao salvar nome da empresa:', error);
            // Continua mesmo se falhar
        }
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };
  
  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  const handleFinish = () => {
    toast({
      title: "Tudo pronto!",
      description: "Sua configuração inicial foi salva. Bem-vindo(a) ao seu dashboard!",
    });
    router.push("/");
  };
  
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl overflow-hidden">
        <CardHeader>
           <Progress value={progress} className="mb-4" />
           <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {steps[currentStep].icon}
            </div>
            <div>
                <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence mode="wait">
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
            >
                <CardContent className="min-h-[350px]">
                {currentStep === 0 && (
                    <div className="space-y-6 pt-4">
                        <CardDescription className="text-base">
                            Bem-vindo(a) ao Zona Fiscal! Você começou com o <strong>Plano Gratuito</strong>, perfeito para conhecer o sistema.
                        </CardDescription>
                        
                        <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                            <p className="font-semibold text-sm">O que está incluído no seu plano:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>✓ Até 50 transações por mês</li>
                                <li>✓ 2 relatórios com IA por mês</li>
                                <li>✓ Gestão de metas e orçamentos</li>
                                <li>✓ Separação automática PF/PJ</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-2">
                                💡 Você pode fazer upgrade a qualquer momento em <strong>Planos</strong>.
                            </p>
                        </div>
                        
                        <p className="text-muted-foreground">Vamos fazer uma configuração rápida (2 minutos) para personalizar sua experiência!</p>
                    </div>
                )}
                {currentStep === 1 && (
                    <div className="space-y-6 pt-4">
                         <CardDescription className="text-base">
                           Vamos personalizar sua experiência! Precisamos de algumas informações básicas.
                        </CardDescription>
                        
                        <div className="space-y-2">
                            <Label htmlFor="company">Nome da Empresa ou Atividade *</Label>
                            <Input 
                                id="company" 
                                type="text" 
                                placeholder="Ex: Silva Consultoria, João Silva MEI, Autônomo" 
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Se você é autônomo, pode colocar "Autônomo" ou seu nome.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="salary">Seu Limite de Gastos Pessoais (Mensal) *</Label>
                            <Input 
                                id="salary" 
                                type="number" 
                                placeholder="R$ 2000,00" 
                                value={spendingLimit}
                                onChange={(e) => setSpendingLimitState(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Isso nos ajuda a alertar você caso seus gastos pessoais estejam colocando a saúde financeira do seu negócio em risco.
                            </p>
                        </div>
                    </div>
                )}
                {currentStep === 2 && (
                    <div>
                        <CardDescription className="mb-4">
                           Vamos começar na prática! Adicione sua última despesa ou receita para já ver o sistema em ação.
                        </CardDescription>
                        <TransactionForm onFinish={handleNext} />
                    </div>
                )}
                 {currentStep === 3 && (
                    <div className="space-y-6 text-center pt-8">
                        <CardTitle className="text-3xl">🎉 Você está pronto para começar!</CardTitle>
                         <CardDescription className="text-base max-w-md mx-auto">
                           Sua configuração inicial está completa. Agora você pode começar a ter clareza total sobre suas finanças!
                        </CardDescription>
                        
                        <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
                            <p className="font-semibold">📋 Próximos passos:</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>✓ Adicione suas transações diárias</li>
                                <li>✓ Deixe a IA categorizar (Pessoal ou Empresarial)</li>
                                <li>✓ Acompanhe seu lucro real no Dashboard</li>
                                <li>✓ Gere relatórios com insights financeiros</li>
                            </ul>
                            
                            <div className="border-t pt-4 mt-4">
                                <p className="text-xs text-muted-foreground">
                                    💎 <strong>Dica:</strong> Quando bater o limite de 50 transações ou precisar de mais relatórios IA,
                                    acesse <strong>Planos</strong> para fazer upgrade e desbloquear recursos ilimitados!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                </CardContent>
            </motion.div>
        </AnimatePresence>

        <CardFooter className="flex justify-between">
            {currentStep > 0 && currentStep < 2 && (
                 <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2"/> Voltar</Button>
            )}
            <div/> 
            {currentStep < 2 && (
                <Button onClick={handleNext}>
                    Próximo Passo
                </Button>
            )}
             {currentStep === 3 && (
                <Button className="w-full" size="lg" onClick={handleFinish}>
                    Ir para o Dashboard
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
