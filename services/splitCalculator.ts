import type { IncomeDate, SplitInstallment } from '../types/finance';

/**
 * Retorna o número de meses entre duas datas (mínimo 1)
 */
export function calculateMonthsDifference(startDate: Date, endDate: Date): number {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  const diffMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  return Math.max(1, diffMonths + 1);
}

/**
 * Ajusta o dia para não ultrapassar os dias válidos do mês (ex: 30 de fevereiro -> 28/29)
 */
export function getSafeDate(year: number, month: number, targetDay: number): Date {
  // Último dia do mês: passar month + 1 e dia 0
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(targetDay, lastDayOfMonth);
  return new Date(year, month, day);
}

/**
 * Formata Date para YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface GenerateInstallmentsParams {
  stepId: string;
  totalAmount: number;
  startDate?: Date;
  deadlineDate: string; // YYYY-MM-DD
  incomeDates: IncomeDate[];
}

/**
 * Calcula determinísticamente as parcelas e splits de pagamento.
 * Divide o valor total pelos meses até a data limite e distribui
 * entre os dias de recebimento cadastrados com suas porcentagens.
 */
export function generateSplitInstallments({
  stepId,
  totalAmount,
  startDate = new Date(),
  deadlineDate,
  incomeDates,
}: GenerateInstallmentsParams): SplitInstallment[] {
  if (totalAmount <= 0) return [];

  // Se não houver datas cadastradas, cria um split padrão para o dia 10 (100%)
  const effectiveSplits = incomeDates.length > 0
    ? [...incomeDates].sort((a, b) => a.day - b.day)
    : [{ day: 10, percentage: 100 }];

  // Normaliza as porcentagens para somar 100
  const totalPercentage = effectiveSplits.reduce((acc, curr) => acc + curr.percentage, 0);
  const normalizedSplits = effectiveSplits.map((item) => ({
    day: item.day,
    percentage: totalPercentage > 0 ? (item.percentage / totalPercentage) * 100 : 100 / effectiveSplits.length,
  }));

  const [dYear, dMonth, dDay] = deadlineDate.split('-').map(Number);
  const deadline = new Date(dYear || startDate.getFullYear(), ((dMonth || 1) - 1), dDay || 1);
  const monthsCount = calculateMonthsDifference(startDate, deadline);

  // Valor mensal necessário
  const monthlyAmount = totalAmount / monthsCount;

  const installments: SplitInstallment[] = [];
  let remainingTotalCentavos = Math.round(totalAmount * 100);

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();

  for (let m = 0; m < monthsCount; m++) {
    const currentMonthDate = new Date(startYear, startMonth + m, 1);
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    for (let i = 0; i < normalizedSplits.length; i++) {
      const splitRule = normalizedSplits[i];
      const dueDateObj = getSafeDate(year, month, splitRule.day);
      const isLastInstallment = m === monthsCount - 1 && i === normalizedSplits.length - 1;

      let installmentCentavos: number;
      if (isLastInstallment) {
        // A última parcela absorve os centavos restantes para fechar exatamente o valor total
        installmentCentavos = remainingTotalCentavos;
      } else {
        const rawPortion = (monthlyAmount * (splitRule.percentage / 100));
        installmentCentavos = Math.round(rawPortion * 100);
        remainingTotalCentavos -= installmentCentavos;
      }

      const installmentAmount = Math.max(0, installmentCentavos / 100);

      installments.push({
        id: `inst_${stepId}_${m}_${splitRule.day}_${Math.random().toString(36).substr(2, 5)}`,
        stepId,
        dueDate: formatDateISO(dueDateObj),
        incomeDay: splitRule.day,
        amount: installmentAmount,
        isPaid: false,
      });
    }
  }

  return installments;
}

/**
 * Formata valor em Real brasileiro (BRL)
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data ISO (YYYY-MM-DD) para PT-BR (DD/MM/YYYY)
 */
export function formatDateBR(dateISO: string): string {
  if (!dateISO) return '';
  const parts = dateISO.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateISO;
}
