'use server';

/**
 * @fileOverview This file defines a Genkit flow for alerting users about potential financial risks,
 * specifically when their personal expenses are exceeding their business income or a predefined limit.
 *
 * - alertOnFinancialRisk - A function that triggers the financial risk assessment and alerting process.
 * - AlertOnFinancialRiskInput - The input type for the alertOnFinancialRisk function.
 * - AlertOnFinancialRiskOutput - The return type for the alertOnFinancialRisk function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AlertOnFinancialRiskInputSchema = z.object({
  businessIncome: z.number().describe('The total business income for the period.'),
  personalExpenses: z.number().describe('The total personal expenses for the period.'),
  spendingLimit: z.number().describe('The defined personal spending limit for the period.'),
  userId: z.string().describe('The ID of the user.'),
});

export type AlertOnFinancialRiskInput = z.infer<typeof AlertOnFinancialRiskInputSchema>;

const AlertOnFinancialRiskOutputSchema = z.object({
  alertMessage: z.string().describe('A message indicating the financial risk, if any.'),
  alertType: z.enum(['exceeds_income', 'exceeds_limit', 'none']).describe('The type of financial risk alert.'),
});

export type AlertOnFinancialRiskOutput = z.infer<typeof AlertOnFinancialRiskOutputSchema>;

export async function alertOnFinancialRisk(input: AlertOnFinancialRiskInput): Promise<AlertOnFinancialRiskOutput> {
  return alertOnFinancialRiskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'alertOnFinancialRiskPrompt',
  input: {schema: AlertOnFinancialRiskInputSchema},
  output: {schema: AlertOnFinancialRiskOutputSchema},
  prompt: `Você é um parceiro financeiro, sempre de olho nas finanças do usuário para ajudá-lo a não se enrolar. Analise os dados e crie uma mensagem de alerta gente boa, mas direta.

Dados para análise:
- Renda do negócio: {{businessIncome}}
- Gastos pessoais: {{personalExpenses}}
- Limite de gastos ("salário informal"): {{spendingLimit}}

Cenários para ficar de olho:
1. Se os gastos pessoais forem maiores que a renda do negócio, o alerta é sobre gastar mais do que ganha. Exemplo: "Opa, cuidado! Seus gastos pessoais (R$ {{personalExpenses}}) passaram o lucro da sua empresa (R$ {{businessIncome}}). Assim a conta não fecha no fim do mês."
2. Se os gastos pessoais ultrapassarem o limite definido, o alerta é sobre estourar o "salário". Exemplo: "Você passou do seu limite de gastos pessoais de R$ {{spendingLimit}}. É bom segurar a onda para não comprometer o caixa."
3. Se estiver tudo certo, não precisa de alerta.

Com base nisso, defina o 'alertMessage' e o 'alertType' ('exceeds_income', 'exceeds_limit', ou 'none').
`,
});

const alertOnFinancialRiskFlow = ai.defineFlow(
  {
    name: 'alertOnFinancialRiskFlow',
    inputSchema: AlertOnFinancialRiskInputSchema,
    outputSchema: AlertOnFinancialRiskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
