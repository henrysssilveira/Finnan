export interface IncomeDate {
  day: number; // Ex: 15 ou 30
  percentage: number; // Ex: 40 ou 60 (soma deve ser 100%)
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento' | 'carteira';
}

export interface Debt {
  id: string;
  title: string;
  totalAmount: number;
  remainingAmount: number;
  dueDate?: string;
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
  stepId: string;
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
  steps: Step[];
  createdAt: string;
}
