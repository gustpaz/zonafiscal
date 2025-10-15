import type { PlanFeatures } from "./types";

export interface FormattedFeature {
  text: string;
  included: boolean; // Se a feature está incluída no plano
  highlight?: string; // Texto destacado (ex: quantidade, valor)
  tooltip?: string; // Informação adicional
}

export function formatPlanFeatures(features: PlanFeatures, planName: string): FormattedFeature[] {
  const formatted: FormattedFeature[] = [];

  // 1. Transações
  if (features.transactions === -1) {
    formatted.push({
      text: "Transações ilimitadas",
      included: true,
      highlight: "∞"
    });
  } else if (features.transactions > 0) {
    formatted.push({
      text: `Até ${features.transactions} transações/mês`,
      included: true,
      highlight: features.transactions.toString()
    });
  } else {
    formatted.push({
      text: "Transações ilimitadas",
      included: false
    });
  }

  // 2. Relatórios com IA
  if (features.aiTips) {
    if (features.aiReportLimit === -1) {
      formatted.push({
        text: "Relatórios com IA ilimitados",
        included: true,
        highlight: "∞",
        tooltip: "Análises financeiras geradas por inteligência artificial"
      });
    } else {
      formatted.push({
        text: `${features.aiReportLimit} relatórios com IA/mês`,
        included: true,
        highlight: features.aiReportLimit.toString(),
        tooltip: "Análises financeiras geradas por inteligência artificial"
      });
    }
  } else {
    formatted.push({
      text: "Relatórios com IA",
      included: false,
      tooltip: "Disponível em planos pagos"
    });
  }

  // 3. Previsão de Despesas
  formatted.push({
    text: "Previsão de despesas com IA",
    included: features.forecast,
    tooltip: features.forecast ? undefined : "Disponível em planos pagos"
  });

  // 4. Metas e Orçamentos
  formatted.push({
    text: "Gestão de metas e orçamentos",
    included: features.goalsAndBudgets
  });

  // 5. Membros da Equipe
  if (features.teamMembersIncluded > 0) {
    const memberText = features.teamMembersIncluded === 1 ? "membro" : "membros";
    const additionalInfo = features.pricePerMember 
      ? ` + R$ ${features.pricePerMember.toFixed(2)}/membro extra`
      : "";
    
    formatted.push({
      text: `${features.teamMembersIncluded} ${memberText} incluído${features.teamMembersIncluded > 1 ? 's' : ''}${additionalInfo}`,
      included: true,
      highlight: features.teamMembersIncluded.toString(),
      tooltip: features.pricePerMember 
        ? `Inclui ${features.teamMembersIncluded} ${memberText}. Membros adicionais custam R$ ${features.pricePerMember.toFixed(2)}/mês cada`
        : undefined
    });
  } else {
    formatted.push({
      text: "Membros da equipe",
      included: false,
      tooltip: "Disponível em planos pagos"
    });
  }

  // 6. Exportação
  formatted.push({
    text: "Exportação em PDF e CSV",
    included: features.pdfExport,
    tooltip: features.pdfExport ? undefined : "Disponível em planos pagos"
  });

  // 7. Relatórios Contábeis
  formatted.push({
    text: "Relatórios contábeis (DRE)",
    included: features.accountingReports,
    tooltip: features.accountingReports 
      ? "Demonstração do Resultado do Exercício para contadores"
      : "Disponível em planos pagos"
  });

  // 8. Suporte
  formatted.push({
    text: features.prioritySupport ? "Suporte prioritário via e-mail" : "Suporte via comunidade",
    included: true, // Todos têm algum tipo de suporte
    tooltip: features.prioritySupport 
      ? "Respostas em até 24h úteis"
      : "Suporte através da comunidade de usuários"
  });

  // 9. Importação CSV
  formatted.push({
    text: "Importação de extratos bancários (CSV)",
    included: features.csvImport,
    tooltip: features.csvImport 
      ? "Importe centenas de transações de uma vez direto do seu banco" 
      : "Disponível em planos pagos"
  });

  return formatted;
}

// Função para gerar descrição curta do plano
export function getPlanDescription(planName: string): string {
  const descriptions: Record<string, string> = {
    'Gratuito': 'Para quem está começando a organizar as finanças',
    'Pro': 'Para profissionais e pequenos negócios',
    'Business': 'Para empresas em crescimento com equipes',
    'Premium': 'Para empresas que precisam do máximo',
  };

  return descriptions[planName] || 'Plano personalizado para suas necessidades';
}

// Função para destacar o diferencial de cada plano
export function getPlanHighlight(planName: string): string | null {
  const highlights: Record<string, string> = {
    'Pro': 'Mais Popular',
    'Business': 'Melhor para Equipes',
    'Premium': 'Recursos Completos',
  };

  return highlights[planName] || null;
}

