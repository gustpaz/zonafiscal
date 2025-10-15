'use server';

/**
 * @fileOverview Este arquivo define um fluxo Genkit para gerar um relatório financeiro detalhado
 * com base nas transações de um usuário em um período específico.
 *
 * - generateFinancialReport - Uma função que aciona o processo de geração de relatório.
 * - GenerateFinancialReportInput - O tipo de entrada para a função.
 * - GenerateFinancialReportOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(['income', 'expense']),
  category: z.enum(['personal', 'business', 'mixed', 'loan_to_business', 'loan_to_personal']),
  paymentMethod: z.enum(['pix', 'credit_card', 'debit_card', 'cash', 'transfer', 'boleto']),
  paymentSource: z.enum(['personal', 'business']),
  paymentType: z.enum(['avista', 'parcelado']),
  installments: z.number().optional(),
  currentInstallment: z.number().optional(),
  notes: z.string().optional(),
});

const GenerateFinancialReportInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe('A lista de transações do usuário no período selecionado.'),
  name: z.string().describe('O nome do usuário.'),
  startDate: z.string().describe('A data de início do período do relatório (ISO 8601).'),
  endDate: z.string().describe('A data de término do período do relatório (ISO 8601).'),
});
export type GenerateFinancialReportInput = z.infer<typeof GenerateFinancialReportInputSchema>;

const GenerateFinancialReportOutputSchema = z.object({
    title: z.string().describe('Um título para o relatório, ex: "Relatório Financeiro de Julho/2024".'),
    summary: z.string().describe('Um parágrafo resumindo a saúde financeira geral do usuário no período.'),
    totalIncome: z.number().describe('A soma de todas as receitas.'),
    totalExpenses: z.number().describe('A soma de todas as despesas.'),
    businessProfit: z.number().describe('O lucro líquido do negócio (receitas de negócio - despesas de negócio).'),
    personalSpending: z.number().describe('O total de gastos pessoais.'),
    reportDetails: z.string().describe('Uma análise mais detalhada em formato markdown, com insights sobre padrões de gastos, e sugestões para melhorias.'),
});
export type GenerateFinancialReportOutput = z.infer<typeof GenerateFinancialReportOutputSchema>;

// O Zod não consegue inferir o tipo complexo da transação, então fazemos o type assertion aqui
export async function generateFinancialReport(input: { transactions: Transaction[], name: string, startDate: string, endDate: string }): Promise<GenerateFinancialReportOutput> {
  return generateFinancialReportFlow(input as GenerateFinancialReportInput);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialReportPrompt',
  input: { schema: GenerateFinancialReportInputSchema },
  output: { schema: GenerateFinancialReportOutputSchema },
  prompt: `Você é o assistente financeiro do Zona Fiscal, um sistema que ajuda empreendedores que misturam finanças pessoais e empresariais a entenderem melhor seu dinheiro. Seu trabalho é criar um relatório financeiro para {{name}} que seja fácil de entender e direto ao ponto.

IMPORTANTE: O Zona Fiscal foi criado PARA pessoas que misturam finanças PF e PJ. Não critique essa prática - ao invés disso, ajude o usuário a ORGANIZAR e VISUALIZAR melhor essa mistura. O sistema já faz o trabalho de separação através das categorias.

O relatório deve cobrir o período de {{startDate}} a {{endDate}}.

Analise as seguintes transações:
{{#each transactions}}
- Descrição: {{description}}, Valor: R$ {{amount}}, Categoria: {{category}}, Tipo: {{type}}, Data: {{date}}, Fonte do Pagamento: {{paymentSource}}
{{/each}}

Com base nos dados, gere um relatório completo:
1. 'title': Um título claro que inclua o período, como "Raio-X Financeiro de [Mês/Ano]". Se o período for maior que um mês, use o formato "Relatório de [data_inicio] a [data_fim]".

2. 'summary': Um resumo objetivo sobre a situação financeira. Destaque o que foi positivo e o que precisa de atenção. Se não houver transações, mencione isso e incentive o registro.

3. 'totalIncome': O valor total que entrou (sem contar empréstimos - categorias 'loan_to_business' e 'loan_to_personal').

4. 'totalExpenses': O valor total que saiu (sem contar empréstimos).

5. 'businessProfit': O lucro real da empresa (entradas 'business' + metade das 'mixed' - saídas 'business' - metade das 'mixed'). Não inclua empréstimos neste cálculo.

6. 'personalSpending': O total de gastos pessoais (saídas 'personal' e metade das 'mixed'). Não inclua empréstimos.

7. 'reportDetails': Uma análise detalhada com as seguintes seções. CRÍTICO: Use APENAS caracteres ASCII básicos (A-Z, a-z, 0-9, espaços, pontuação comum). NÃO use emojis, símbolos especiais, ou caracteres Unicode. Use quebras de linha duplas entre seções e parágrafos para separação visual.

IMPORTANTE: NÃO liste transações individualmente. Faça agrupamentos inteligentes e destaque apenas os valores mais relevantes. Se houver muitas transações similares, agrupe-as e mostre apenas o total.

### Entradas

De onde veio o dinheiro (vendas, salários, etc). Agrupe por fonte e destaque apenas as principais receitas. Exemplo: "Receitas empresariais: R$ 5.000 (vendas de produtos), Receitas pessoais: R$ 3.000 (salário)". NÃO liste cada transação separadamente.

### Saídas

Para onde foi o dinheiro. Agrupe por categoria e destaque apenas os principais gastos. Exemplo: "Despesas empresariais: R$ 2.500 (marketing: R$ 1.200, equipamentos: R$ 800, outros: R$ 500), Despesas pessoais: R$ 1.000 (alimentação: R$ 600, transporte: R$ 400)". NÃO liste cada transação individualmente.

### Visão Geral

Como está o equilíbrio entre PF e PJ. Mostre se há empréstimos entre as contas (aportes/retiradas) e se o fluxo está saudável.

### Dicas do Zona Fiscal

1. **Primeira Dica**: [descrição prática]

2. **Segunda Dica**: [descrição prática]

3. **Terceira Dica**: [descrição prática]

As dicas devem focar em:
- Melhorar o controle usando as categorias do sistema
- Otimizar gastos identificados
- Aproveitar melhor os recursos disponíveis
- Usar os empréstimos PF/PJ de forma mais estratégica

Se não houver transações, forneça dicas sobre a importância de registrar todas as movimentações no Zona Fiscal.

LEMBRE-SE: Não sugira "separar as contas" ou "parar de misturar". O sistema JÁ organiza isso através das categorias. Foque em como o usuário pode usar MELHOR o Zona Fiscal para ter mais controle e tomar decisões melhores.

Use uma linguagem amigável, direta e motivadora.
`,
});

const generateFinancialReportFlow = ai.defineFlow(
  {
    name: 'generateFinancialReportFlow',
    inputSchema: GenerateFinancialReportInputSchema,
    outputSchema: GenerateFinancialReportOutputSchema,
  },
  async (input) => {
    // Format dates for better readability in the prompt
    const formattedInput = {
      ...input,
      startDate: format(new Date(input.startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      endDate: format(new Date(input.endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    };
    const { output } = await prompt(formattedInput);
    return output!;
  }
);
