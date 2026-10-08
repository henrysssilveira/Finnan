import { create } from 'zustand';
import {
  FinancialProfile,
  Planning,
  Step,
  BankAccount,
  Debt,
  IncomeDate,
} from '@/types/finance';
import { FinanceStorage } from './storage';
import { generateSplitInstallments } from '@/services/splitCalculator';
import { scheduleStepReminders, cancelNotification } from '@/services/notificationService';

interface FinanceState {
  isLoaded: boolean;
  profile: FinancialProfile;
  plannings: Planning[];

  // Ações de Ciclo de Vida
  load: () => Promise<void>;
  save: () => Promise<void>;
  resetAll: () => Promise<void>;

  // Perfil Financeiro
  updateProfile: (data: Partial<FinancialProfile>) => Promise<void>;
  addBank: (bank: Omit<BankAccount, 'id'>) => Promise<void>;
  removeBank: (id: string) => Promise<void>;
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
  updateDebt: (id: string, debt: Partial<Debt>) => Promise<void>;
  removeDebt: (id: string) => Promise<void>;
  setIncomeDates: (dates: IncomeDate[]) => Promise<void>;
  completeOnboarding: (data: Partial<FinancialProfile>) => Promise<void>;

  // Planejamentos (Direto ou com Etapas)
  addPlanning: (plan: Omit<Planning, 'id' | 'createdAt' | 'steps' | 'directInstallments'> & { steps?: Step[]; directInstallments?: any[] }) => Promise<string>;
  updatePlanning: (id: string, plan: Partial<Planning>) => Promise<void>;
  deletePlanning: (id: string) => Promise<void>;
  toggleDirectInstallmentPaid: (planId: string, installmentId: string) => Promise<void>;

  // Etapas
  addStep: (
    planId: string,
    stepData: Omit<Step, 'id' | 'planId' | 'installments' | 'createdAt'>
  ) => Promise<void>;
  updateStep: (
    planId: string,
    stepId: string,
    stepData: Partial<Step>
  ) => Promise<void>;
  deleteStep: (planId: string, stepId: string) => Promise<void>;
  toggleInstallmentPaid: (
    planId: string,
    stepId: string,
    installmentId: string
  ) => Promise<void>;
}

const DEFAULT_PROFILE: FinancialProfile = {
  monthlyIncome: 0,
  incomeDates: [
    { day: 15, percentage: 40 },
    { day: 30, percentage: 60 },
  ],
  banks: [],
  debts: [],
  onboardingCompleted: false,
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  isLoaded: false,
  profile: DEFAULT_PROFILE,
  plannings: [],

  load: async () => {
    const data = await FinanceStorage.loadData<{
      profile: FinancialProfile;
      plannings: Planning[];
    }>({
      profile: DEFAULT_PROFILE,
      plannings: [],
    });

    set({
      profile: { ...DEFAULT_PROFILE, ...data.profile },
      plannings: data.plannings || [],
      isLoaded: true,
    });
  },

  save: async () => {
    const state = get();
    await FinanceStorage.saveData({
      profile: state.profile,
      plannings: state.plannings,
    });
  },

  resetAll: async () => {
    await FinanceStorage.clearAll();
    set({
      profile: DEFAULT_PROFILE,
      plannings: [],
    });
  },

  updateProfile: async (data) => {
    set((state) => ({
      profile: { ...state.profile, ...data },
    }));
    await get().save();
  },

  addBank: async (bank) => {
    const newBank: BankAccount = {
      ...bank,
      id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    set((state) => ({
      profile: {
        ...state.profile,
        banks: [...state.profile.banks, newBank],
      },
    }));
    await get().save();
  },

  removeBank: async (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        banks: state.profile.banks.filter((b) => b.id !== id),
      },
    }));
    await get().save();
  },

  addDebt: async (debt) => {
    const newDebt: Debt = {
      ...debt,
      id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    set((state) => ({
      profile: {
        ...state.profile,
        debts: [...state.profile.debts, newDebt],
      },
    }));
    await get().save();
  },

  updateDebt: async (id, debtData) => {
    set((state) => ({
      profile: {
        ...state.profile,
        debts: state.profile.debts.map((d) => (d.id === id ? { ...d, ...debtData } : d)),
      },
    }));
    await get().save();
  },

  removeDebt: async (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        debts: state.profile.debts.filter((d) => d.id !== id),
      },
    }));
    await get().save();
  },

  setIncomeDates: async (dates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        incomeDates: dates,
      },
    }));
    await get().save();
  },

  completeOnboarding: async (data) => {
    const state = get();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const deadlineStr = futureDate.toISOString().split('T')[0];

    const generatedDebtPlans: Planning[] = (data.debts || []).map((debt) => {
      const planId = `plan_debt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const effectiveSplits = data.incomeDates || state.profile.incomeDates;
      const directInstallments = generateSplitInstallments({
        stepId: planId,
        totalAmount: debt.totalAmount || 0,
        paymentMode: 'split',
        deadlineDate: deadlineStr,
        incomeDates: effectiveSplits,
      });

      return {
        id: planId,
        title: debt.title,
        description: debt.creditor ? `Credor: ${debt.creditor}` : 'Dívida cadastrada no setup inicial',
        category: 'Dívidas',
        color: '#EF4444',
        type: 'direct',
        totalAmount: debt.totalAmount,
        paymentMode: 'split',
        paymentMethod: 'boleto',
        deadlineDate: deadlineStr,
        directInstallments,
        steps: [],
        createdAt: new Date().toISOString(),
      };
    });

    set((s) => ({
      profile: {
        ...s.profile,
        ...data,
        onboardingCompleted: true,
      },
      plannings: [...generatedDebtPlans, ...s.plannings],
    }));
    await get().save();
  },

  addPlanning: async (planData) => {
    const newPlanId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const state = get();

    let directInstallments: any[] = [];
    if (planData.type === 'direct' && (planData.totalAmount || 0) > 0) {
      const effectiveSplits = planData.customSplit?.length
        ? planData.customSplit
        : state.profile.incomeDates;

      directInstallments = generateSplitInstallments({
        stepId: newPlanId,
        totalAmount: planData.totalAmount || 0,
        paymentMode: planData.paymentMode || 'split',
        singleDueDate: planData.singleDueDate,
        deadlineDate: planData.deadlineDate || new Date().toISOString().split('T')[0],
        incomeDates: effectiveSplits,
      });

      if (directInstallments.length > 0) {
        const firstDue = directInstallments[0];
        scheduleStepReminders(
          planData.title,
          firstDue.dueDate,
          firstDue.amount,
          planData.recipientName || ''
        ).catch(() => {});
      }
    }

    const newPlan: Planning = {
      ...planData,
      id: newPlanId,
      type: planData.type || 'direct',
      steps: planData.steps || [],
      directInstallments,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      plannings: [newPlan, ...s.plannings],
    }));

    await get().save();
    return newPlanId;
  },

  updatePlanning: async (id, planData) => {
    const state = get();
    const existingPlan = state.plannings.find((p) => p.id === id);
    if (!existingPlan) return;

    let updatedDirectInstallments = existingPlan.directInstallments || [];

    if (existingPlan.type === 'direct' || planData.type === 'direct') {
      const targetAmount = planData.totalAmount ?? existingPlan.totalAmount ?? 0;
      const targetDeadline = planData.deadlineDate ?? existingPlan.deadlineDate ?? '';
      const targetMode = planData.paymentMode ?? existingPlan.paymentMode ?? 'split';
      const targetSingleDueDate = planData.singleDueDate ?? existingPlan.singleDueDate;
      const effectiveSplits =
        planData.customSplit?.length
          ? planData.customSplit
          : existingPlan.customSplit?.length
          ? existingPlan.customSplit
          : state.profile.incomeDates;

      if (targetAmount > 0) {
        updatedDirectInstallments = generateSplitInstallments({
          stepId: id,
          totalAmount: targetAmount,
          paymentMode: targetMode,
          singleDueDate: targetSingleDueDate,
          deadlineDate: targetDeadline,
          incomeDates: effectiveSplits,
        });
      }
    }

    set((s) => ({
      plannings: s.plannings.map((p) =>
        p.id === id ? { ...p, ...planData, directInstallments: updatedDirectInstallments } : p
      ),
    }));
    await get().save();
  },

  deletePlanning: async (id) => {
    const plan = get().plannings.find((p) => p.id === id);
    if (plan) {
      if (plan.steps) {
        for (const step of plan.steps) {
          for (const inst of step.installments) {
            if (inst.notificationId) {
              cancelNotification(inst.notificationId);
            }
          }
        }
      }
      if (plan.directInstallments) {
        for (const inst of plan.directInstallments) {
          if (inst.notificationId) {
            cancelNotification(inst.notificationId);
          }
        }
      }
    }

    set((state) => ({
      plannings: state.plannings.filter((p) => p.id !== id),
    }));
    await get().save();
  },

  toggleDirectInstallmentPaid: async (planId, installmentId) => {
    set((state) => ({
      plannings: state.plannings.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          directInstallments: (p.directInstallments || []).map((inst) => {
            if (inst.id !== installmentId) return inst;
            const nextPaid = !inst.isPaid;
            return {
              ...inst,
              isPaid: nextPaid,
              paidAt: nextPaid ? new Date().toISOString() : undefined,
            };
          }),
        };
      }),
    }));
    await get().save();
  },

  addStep: async (planId, stepData) => {
    const newStepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const state = get();
    const effectiveSplits = stepData.customSplit?.length
      ? stepData.customSplit
      : state.profile.incomeDates;

    // Gera parcelas determinísticas considerando modo de pagamento (à vista ou split)
    const installments = generateSplitInstallments({
      stepId: newStepId,
      totalAmount: stepData.totalAmount,
      paymentMode: stepData.paymentMode || 'split',
      singleDueDate: stepData.singleDueDate,
      deadlineDate: stepData.deadlineDate,
      incomeDates: effectiveSplits,
    });

    if (installments.length > 0) {
      const firstDue = installments[0];
      scheduleStepReminders(
        stepData.title,
        firstDue.dueDate,
        firstDue.amount,
        stepData.recipientName
      ).catch(() => {});
    }

    const newStep: Step = {
      ...stepData,
      id: newStepId,
      planId,
      installments,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      plannings: s.plannings.map((p) =>
        p.id === planId ? { ...p, steps: [...(p.steps || []), newStep] } : p
      ),
    }));

    await get().save();
  },

  updateStep: async (planId, stepId, stepData) => {
    const state = get();
    const plan = state.plannings.find((p) => p.id === planId);
    const existingStep = plan?.steps?.find((s) => s.id === stepId);
    if (!existingStep) return;

    let updatedInstallments = existingStep.installments;

    if (
      stepData.totalAmount !== undefined ||
      stepData.deadlineDate !== undefined ||
      stepData.paymentMode !== undefined ||
      stepData.singleDueDate !== undefined ||
      stepData.customSplit !== undefined
    ) {
      const targetAmount = stepData.totalAmount ?? existingStep.totalAmount;
      const targetDeadline = stepData.deadlineDate ?? existingStep.deadlineDate;
      const targetMode = stepData.paymentMode ?? existingStep.paymentMode ?? 'split';
      const targetSingleDate = stepData.singleDueDate ?? existingStep.singleDueDate;
      const effectiveSplits =
        stepData.customSplit?.length
          ? stepData.customSplit
          : existingStep.customSplit?.length
          ? existingStep.customSplit
          : state.profile.incomeDates;

      updatedInstallments = generateSplitInstallments({
        stepId,
        totalAmount: targetAmount,
        paymentMode: targetMode,
        singleDueDate: targetSingleDate,
        deadlineDate: targetDeadline,
        incomeDates: effectiveSplits,
      });
    }

    set((s) => ({
      plannings: s.plannings.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          steps: (p.steps || []).map((st) =>
            st.id === stepId
              ? { ...st, ...stepData, installments: updatedInstallments }
              : st
          ),
        };
      }),
    }));

    await get().save();
  },

  deleteStep: async (planId, stepId) => {
    set((state) => ({
      plannings: state.plannings.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          steps: (p.steps || []).filter((s) => s.id !== stepId),
        };
      }),
    }));
    await get().save();
  },

  toggleInstallmentPaid: async (planId, stepId, installmentId) => {
    set((state) => ({
      plannings: state.plannings.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          steps: (p.steps || []).map((st) => {
            if (st.id !== stepId) return st;
            return {
              ...st,
              installments: st.installments.map((inst) => {
                if (inst.id !== installmentId) return inst;
                const nextPaid = !inst.isPaid;
                return {
                  ...inst,
                  isPaid: nextPaid,
                  paidAt: nextPaid ? new Date().toISOString() : undefined,
                };
              }),
            };
          }),
        };
      }),
    }));
    await get().save();
  },
}));
