/**
 * WorthBase (家底) - Cash Flow Store (Zustand)
 * State: cashFlows[]
 * Actions: loadCashFlows, addCashFlow, editCashFlow, removeCashFlow, endCashFlow
 *
 * 只管**家庭层面**的现金流（不依附于资产的固定支出 + 全部固定收入）。
 * 资产附属的经常性支出仍在 asset-store / AssetDetailModal 里管，两者互不重叠。
 */

import { create } from 'zustand';
import { CashFlowRepository, type NewCashFlow } from '@/db/cash-flow-repository';
import type { CashFlow } from '@/types/models';

interface CashFlowStore {
  cashFlows: CashFlow[];
  isLoading: boolean;

  loadCashFlows: () => Promise<void>;
  addCashFlow: (input: NewCashFlow) => Promise<CashFlow>;
  editCashFlow: (id: string, updates: Partial<CashFlow>) => Promise<void>;
  removeCashFlow: (id: string) => Promise<void>;
  endCashFlow: (id: string, effectiveTo: string) => Promise<void>;
}

export const useCashFlowStore = create<CashFlowStore>((set) => ({
  cashFlows: [],
  isLoading: false,

  loadCashFlows: async () => {
    set({ isLoading: true });
    const cashFlows = await CashFlowRepository.getAll();
    set({ cashFlows, isLoading: false });
  },

  addCashFlow: async (input) => {
    const created = await CashFlowRepository.create(input);
    set((state) => ({ cashFlows: [...state.cashFlows, created] }));
    return created;
  },

  editCashFlow: async (id, updates) => {
    await CashFlowRepository.update(id, updates);
    set((state) => ({
      cashFlows: state.cashFlows.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  removeCashFlow: async (id) => {
    await CashFlowRepository.delete(id);
    set((state) => ({ cashFlows: state.cashFlows.filter((f) => f.id !== id) }));
  },

  endCashFlow: async (id, effectiveTo) => {
    await CashFlowRepository.endCashFlow(id, effectiveTo);
    set((state) => ({
      cashFlows: state.cashFlows.map((f) => (f.id === id ? { ...f, effectiveTo } : f)),
    }));
  },
}));
