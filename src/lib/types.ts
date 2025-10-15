

export type TransactionType = "income" | "expense";
export type TransactionCategory = "personal" | "business" | "mixed" | "loan_to_business" | "loan_to_personal";
export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "cash" | "transfer" | "boleto";
export type PaymentSource = "personal" | "business";
export type PaymentType = "avista" | "parcelado";

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  paymentSource: PaymentSource;
  paymentType: PaymentType;
  installments?: number;
  currentInstallment?: number;
  installmentId?: string; // ID que agrupa as parcelas
  notes?: string;
  lastModifiedBy?: string; // User's name
  isImported?: boolean; // Se foi importada via CSV
  importedAt?: string; // Data/hora da importação
  archived?: boolean; // Se foi arquivada (usuário no plano gratuito com limite)
  archivedAt?: string; // Data/hora do arquivamento
}

export interface FinancialSummary {
  balance: number;
  balanceTrend: number;
  totalIncome: number;
  incomeTrend: number;
  totalExpenses: number;
  expensesTrend: number;
  businessProfit: number;
  profitTrend: number;
  businessIncome: number;
  businessExpenses: number;
  personalExpenses: number;
  loanBalance: number;
}

export interface AuditLog {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete';
  entity: 'transaction' | 'user' | 'goal' | 'budget' | 'plan' | 'feature_flags' | 'support_ticket' | 'tracking';
  entityId: string;
  details: string;
  hash: string;
  previousHash: string | null;
}

export interface PlanFeatures {
  transactions: number; // -1 for unlimited
  aiTips: boolean;
  pdfExport: boolean;
  prioritySupport: boolean;
  forecast: boolean;
  goalsAndBudgets: boolean;
  teamMembersIncluded: number; // Quantidade de membros gratuitos. 0 para desabilitado.
  aiReportLimit: number; // -1 for unlimited
  pricePerMember?: number; // Preço por membro extra
  accountingReports: boolean; // Relatórios contábeis (DRE, etc.)
  csvImport: boolean; // Importação de CSV
}

export type PlanVisibility = 'public' | 'retention_only' | 'hidden';

export interface Plan {
  id: string;
  name: string;
  price: number; // For display purposes only
  priceIdMonthly?: string;
  priceIdYearly?: string;
  subscribers: number;
  status: 'Ativo' | 'Inativo';
  visibility?: PlanVisibility; // Controla onde o plano aparece
  features: PlanFeatures;
}

export type AdminPermission = 'dashboard' | 'plans' | 'users' | 'payments' | 'marketing' | 'integrations' | 'support' | 'tracking';
export type AdminRole = 'Super Admin' | 'Personalizado' | 'Nenhum';
export type TeamMemberPermission = 'view_dashboard' | 'manage_transactions' | 'view_reports' | 'manage_goals' | 'view_loans';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: 'Gratuito' | 'Pro';
  signupDate: string;
  status: 'Ativo' | 'Inativo' | 'Suspenso';
  companyId?: string;
  companyName?: string; // Nome da empresa ou atividade
  role?: 'Dono' | 'Membro';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'canceling' | 'canceled';
  subscriptionCancelAt?: string; // Data de expiração quando cancelamento pendente
  previousPlan?: string; // Plano anterior (usado durante cancelamento pendente)
  adminRole?: AdminRole;
  adminPermissions?: AdminPermission[];
  teamPermissions?: TeamMemberPermission[];
  aiReportsGenerated?: number;
  reportGenerationTimestamp?: string;
  // Tracking fields
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string; // Conjunto de anúncios
  utmTerm?: string; // Anúncio específico / palavra-chave
  convertedAt?: string;
}

export interface AnalyticsData {
    totalIncome: number;
    totalExpenses: number;
    businessNetProfit: number;
    personalSpending: number;
    categoryBreakdown: {
        [key: string]: {
            income: number;
            expenses: number;
        }
    },
    monthlyProfitTrend: { month: string, profit: number }[]
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  type: 'profit' | 'savings';
  lastModifiedBy?: string;
}

export type BudgetCategory = 'business_marketing' | 'business_supplies' | 'business_rent' | 'personal_food' | 'personal_leisure';

export interface Budget {
  id: string;
  userId: string;
  category: BudgetCategory;
  name: string;
  budgetedAmount: number;
  spentAmount: number;
  lastModifiedBy?: string;
}

export interface TicketReply {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: 'user' | 'admin';
    message: string;
    createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  priority: 'Normal' | 'Alta';
  status: 'Aberto' | 'Em Andamento' | 'Resolvido';
  createdAt: string;
  updatedAt: string;
  replies?: TicketReply[];
}

export type AuditInfo = { userId: string, userName: string };

export interface TrackingSettings {
  metaPixelId: string;
  googleAnalyticsId: string;
}
