'use server';

/**
 * @fileOverview Este arquivo define um fluxo Genkit para fornecer consultoria financeira com base nas transações do usuário,
 * com foco em ajudar a separar as finanças pessoais e empresariais.
 *
 * - provideFinancialAdvice - Uma função que aciona o processo de análise e consultoria financeira.
 * - ProvideFinancialAdviceInput - O tipo de entrada para a função provideFinancialAdvice.
 * - ProvideFinancialAdviceOutput - O tipo de retorno para a função provideFinancialAdvice.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Transaction } from '@/lib/types';

const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.enum(['personal', 'business', 'mixed', 'loan_to_business', 'loan_to_personal']),
  paymentMethod: z.enum(['pix', 'credit_card', 'debit_card', 'cash', 'transfer']),
  notes: z.string().optional(),
});

const ProvideFinancialAdviceInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe('A lista de transações do usuário.'),
});
export type ProvideFinancialAdviceInput = z.infer<typeof ProvideFinancialAdviceInputSchema>;

const AdviceSchema = z.object({
  title: z.string().describe('Um título curto e chamativo para o conselho.'),
  description: z.string().describe('Uma breve descrição do conselho ou da observação.'),
  actionable_link: z.string().optional().describe('Um link para uma ação sugerida (por exemplo, visualizar uma transação específica).'),
});

const ProvideFinancialAdviceOutputSchema = z.object({
  insights: z.array(AdviceSchema).describe('Uma lista de insights e conselhos acionáveis para o usuário.'),
});
export type ProvideFinancialAdviceOutput = z.infer<typeof ProvideFinancialAdviceOutputSchema>;

export async function provideFinancialAdvice(input: { transactions: Transaction[] }): Promise<ProvideFinancialAdviceOutput> {
  // O Zod não consegue inferir o tipo complexo da transação, então fazemos o type assertion aqui
  return provideFinancialAdviceFlow(input as ProvideFinancialAdviceInput);
}

const prompt = ai.definePrompt({
  name: 'provideFinancialAdvicePrompt',
  input: { schema: ProvideFinancialAdviceInputSchema },
  output: { schema: ProvideFinancialAdviceOutputSchema },
  prompt: `Você é um consultor financeiro gente boa, especialista em ajudar donos de pequenos negócios a organizar a bagunça das contas. Seu foco é analisar as transações e dar dicas práticas para separar as despesas pessoais (CPF) das da empresa (CNPJ).

A principal missão é encontrar transações marcadas como 'Misto' e dar um jeito nelas.

Analise estas transações:
{{#each transactions}}
- Descrição: {{description}}, Valor: R$ {{amount}}, Categoria: {{category}}, Data: {{date}}
{{/each}}

Com base nisso, crie uma lista de 'insights'. Cada insight precisa ser:
1. Ter um 'title' (título) curto e que chame a atenção.
2. Ter uma 'description' (descrição) clara, explicando a dica de forma simples.
3. Se o insight for sobre uma transação 'Misto', sugira uma divisão (ex: 70% empresa, 30% pessoal) e incentive o usuário a corrigir a classificação.
4. Se achar válido, dê conselhos gerais sobre como parar de misturar as contas no futuro.
5. Mantenha o tom amigável e encorajador, como um papo de bar.

Exemplo de um bom insight:
- title: "Vamos dar um jeito nas compras do Atacadão?"
- description: "Vi aqui que sua compra de R$750 no Atacadão foi marcada como 'Misto'. Compra de mercado quase sempre é uma mistura, né? Que tal a gente lançar uns 60% (R$450) como despesa do negócio e 40% (R$300) como pessoal? Assim seus relatórios ficam certinhos."

Crie pelo menos 2 dicas focadas nas transações 'Misto' ou em outros padrões que você notar.
`,
});

const provideFinancialAdviceFlow = ai.defineFlow(
  {
    name: 'provideFinancialAdviceFlow',
    inputSchema: ProvideFinancialAdviceInputSchema,
    outputSchema: ProvideFinancialAdviceOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
