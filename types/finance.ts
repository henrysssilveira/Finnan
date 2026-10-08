export interface IncomeDate {
  day: number; // Ex: 15 ou 30
  percentage: number; // Ex: 40 ou 60 (soma deve ser 100%)
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento' | 'carteira';
}

export type PaymentMethod =
  | 'pix'
  | 'credito'
  | 'debito'
  | 'boleto'
  | 'dinheiro'
  | 'transferencia'
  | 'outro';

export type PaymentMode = 'single' | 'split'; // 'single' = à vista/único, 'split' = dividido por ciclo

export interface Debt {
  id: string;
  title: string;
  creditor?: string;
  totalAmount: number;
  remainingAmount: number;
  installmentsCount?: number; // Ex: 12x
  monthlyPayment?: number; // Parcela mensal
  dueDate?: string; // Dia do vencimento
  bankAccountId?: string; // Conta usada para pagar
  paymentMethod?: PaymentMethod;
  isIncludedInMonthlyPlanning?: boolean; // Entra no cálculo de comprometido
}

export interface FinancialProfile {
  monthlyIncome: number;
  incomeDates: IncomeDate[];
  banks: BankAccount[];
  debts: Debt[];
  onboardingCompleted: boolean;
}

export interface SplitInstallment {
  id: string;
  stepId: string; // id da etapa ou id do planejamento direto
  dueDate: string; // YYYY-MM-DD
  incomeDay: number; // Dia de recebimento correspondente
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  notificationId?: string;
}

export type RecurrenceType = 'none' | 'monthly' | 'biweekly' | 'weekly';

export interface Step {
  id: string;
  planId: string;
  title: string;
  description: string;
  totalAmount: number;
  recipientName: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  bankAccountId?: string;
  paymentMethod?: PaymentMethod;
  paymentMode?: PaymentMode;
  singleDueDate?: string; // se pagamento único
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceType;
  deadlineDate: string; // YYYY-MM-DD
  customSplit?: IncomeDate[]; // Se não fornecido, usa incomeDates do perfil
  installments: SplitInstallment[];
  createdAt: string;
}

export interface Planning {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  type: 'direct' | 'container'; // 'direct' = despesa direta (sem etapas), 'container' = com etapas
  // Campos utilizados quando type === 'direct'
  totalAmount?: number;
  recipientName?: string;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  bankAccountId?: string;
  paymentMethod?: PaymentMethod;
  paymentMode?: PaymentMode;
  singleDueDate?: string;
  deadlineDate?: string;
  customSplit?: IncomeDate[];
  directInstallments?: SplitInstallment[];
  // Campos utilizados quando type === 'container'
  steps: Step[];
  createdAt: string;
}
