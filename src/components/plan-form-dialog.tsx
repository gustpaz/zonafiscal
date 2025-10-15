

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Plan } from "@/lib/types";

interface PlanFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (plan: Plan) => void;
  plan: Plan | null;
}

export default function PlanFormDialog({ isOpen, onOpenChange, onSave, plan }: PlanFormDialogProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [priceIdMonthly, setPriceIdMonthly] = useState('');
  const [priceIdYearly, setPriceIdYearly] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'retention_only' | 'hidden'>('public');
  const [transactions, setTransactions] = useState(0);
  const [aiReportLimit, setAiReportLimit] = useState(0);
  const [teamMembersIncluded, setTeamMembersIncluded] = useState(0);
  const [pricePerMember, setPricePerMember] = useState(0);
  const [unlimitedTransactions, setUnlimitedTransactions] = useState(false);
  const [unlimitedReports, setUnlimitedReports] = useState(false);
  const [aiTips, setAiTips] = useState(false);
  const [pdfExport, setPdfExport] = useState(false);
  const [prioritySupport, setPrioritySupport] = useState(false);
  const [forecast, setForecast] = useState(false);
  const [goalsAndBudgets, setGoalsAndBudgets] = useState(false);
  const [accountingReports, setAccountingReports] = useState(false);
  const [csvImport, setCsvImport] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setPrice(plan.price);
      setPriceIdMonthly(plan.priceIdMonthly || '');
      setPriceIdYearly(plan.priceIdYearly || '');
      setVisibility(plan.visibility || 'public');
      setUnlimitedTransactions(plan.features.transactions === -1);
      setTransactions(plan.features.transactions === -1 ? 0 : plan.features.transactions);
      setUnlimitedReports(plan.features.aiReportLimit === -1);
      setAiReportLimit(plan.features.aiReportLimit === -1 ? 0 : plan.features.aiReportLimit);
      setTeamMembersIncluded(plan.features.teamMembersIncluded);
      setPricePerMember(plan.features.pricePerMember || 0);
      setAiTips(plan.features.aiTips);
      setPdfExport(plan.features.pdfExport);
      setPrioritySupport(plan.features.prioritySupport);
      setForecast(plan.features.forecast);
      setGoalsAndBudgets(plan.features.goalsAndBudgets);
      setAccountingReports(plan.features.accountingReports);
      setCsvImport(plan.features.csvImport ?? false);
    } else {
      // Reset form for new plan
      setName('');
      setPrice(0);
      setPriceIdMonthly('');
      setPriceIdYearly('');
      setTransactions(50);
      setAiReportLimit(1);
      setTeamMembersIncluded(0);
      setPricePerMember(0);
      setUnlimitedTransactions(false);
      setUnlimitedReports(false);
      setAiTips(false);
      setPdfExport(false);
      setPrioritySupport(false);
      setForecast(false);
      setGoalsAndBudgets(false);
      setAccountingReports(false);
      setCsvImport(false);
    }
  }, [plan, isOpen]);

  const handleSave = () => {
    if (!name) {
      toast({
        title: "Erro de Validação",
        description: "O nome do plano é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const savedPlan: Plan = {
      id: plan?.id || '', // ID will be generated for new plans on parent
      name,
      price,
      priceIdMonthly,
      priceIdYearly,
      subscribers: plan?.subscribers || 0,
      status: plan?.status || 'Ativo',
      visibility,
      features: {
        transactions: unlimitedTransactions ? -1 : transactions,
        aiReportLimit: unlimitedReports ? -1 : aiReportLimit,
        teamMembersIncluded,
        pricePerMember,
        aiTips,
        pdfExport,
        prioritySupport,
        forecast,
        goalsAndBudgets,
        accountingReports,
        csvImport,
      }
    };

    onSave(savedPlan);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plano' : 'Adicionar Novo Plano'}</DialogTitle>
          <DialogDescription>
            {plan ? 'Atualize os detalhes e funcionalidades do plano.' : 'Crie um novo plano de assinatura para seus usuários.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Plano</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="price">Preço (para exibição)</Label>
             <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} />
             <p className="text-xs text-muted-foreground">Este valor é apenas para exibição. A cobrança real usa os Price IDs do Stripe.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceIdMonthly">Stripe Price ID (Mensal)</Label>
            <Input id="priceIdMonthly" placeholder="price_..." value={priceIdMonthly} onChange={(e) => setPriceIdMonthly(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="priceIdYearly">Stripe Price ID (Anual)</Label>
            <Input id="priceIdYearly" placeholder="price_..." value={priceIdYearly} onChange={(e) => setPriceIdYearly(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibilidade do Plano</Label>
            <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  📢 Público (aparece em vendas e pricing)
                </SelectItem>
                <SelectItem value="retention_only">
                  🎯 Retenção (só na página de downsell)
                </SelectItem>
                <SelectItem value="hidden">
                  🔒 Oculto (não aparece em lugar nenhum)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {visibility === 'retention_only' && '💡 Planos de retenção aparecem apenas para usuários que tentam fazer downgrade.'}
              {visibility === 'hidden' && '⚠️ Planos ocultos não aparecem em lugar nenhum (útil para manutenção).'}
              {visibility === 'public' && '✅ Planos públicos aparecem nas páginas de vendas e pricing.'}
            </p>
          </div>

          <div className="space-y-4 rounded-md border p-4">
            <h4 className="text-sm font-medium">Funcionalidades do Plano</h4>
            <div className="flex items-center justify-between">
                <Label htmlFor="unlimited-transactions">Transações Ilimitadas</Label>
                <Switch id="unlimited-transactions" checked={unlimitedTransactions} onCheckedChange={setUnlimitedTransactions} />
            </div>
            {!unlimitedTransactions && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="transactions-limit" className="text-right col-span-2">Limite</Label>
                    <Input id="transactions-limit" type="number" value={transactions} onChange={(e) => setTransactions(parseInt(e.target.value))} className="col-span-2" />
                </div>
            )}
             <div className="flex items-center justify-between">
                <Label htmlFor="unlimited-reports">Relatórios IA Ilimitados</Label>
                <Switch id="unlimited-reports" checked={unlimitedReports} onCheckedChange={setUnlimitedReports} />
            </div>
            {!unlimitedReports && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reports-limit" className="text-right col-span-2">Limite Mensal</Label>
                    <Input id="reports-limit" type="number" value={aiReportLimit} onChange={(e) => setAiReportLimit(parseInt(e.target.value))} className="col-span-2" />
                </div>
            )}
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="team-members" className="col-span-2">Membros Incluídos</Label>
                <Input id="team-members" type="number" value={teamMembersIncluded} onChange={(e) => setTeamMembersIncluded(parseInt(e.target.value))} className="col-span-2" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price-per-member" className="col-span-2">Preço por Membro Extra</Label>
                <Input id="price-per-member" type="number" value={pricePerMember} onChange={(e) => setPricePerMember(parseFloat(e.target.value))} className="col-span-2" />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="ai-tips">Relatórios e Dicas com IA</Label>
                <Switch id="ai-tips" checked={aiTips} onCheckedChange={setAiTips} />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="pdf-export">Exportação em PDF e CSV</Label>
                <Switch id="pdf-export" checked={pdfExport} onCheckedChange={setPdfExport} />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="forecast">Previsão de Despesas</Label>
                <Switch id="forecast" checked={forecast} onCheckedChange={setForecast} />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="goals">Gestão de Metas e Orçamentos</Label>
                <Switch id="goals" checked={goalsAndBudgets} onCheckedChange={setGoalsAndBudgets} />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="priority-support">Suporte Prioritário</Label>
                <Switch id="priority-support" checked={prioritySupport} onCheckedChange={setPrioritySupport} />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="accounting-reports">Relatórios Contábeis</Label>
                <Switch id="accounting-reports" checked={accountingReports} onCheckedChange={setAccountingReports} />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="csv-import">Importação de Extratos Bancários (CSV)</Label>
                <Switch id="csv-import" checked={csvImport} onCheckedChange={setCsvImport} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
