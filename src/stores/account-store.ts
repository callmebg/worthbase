/**
 * WorthBase (家底) - Account Store (Zustand)
 * State: accounts[], currentBalances map
 * Actions: addAccount, updateBalance, deleteAccount, loadAccounts
 */

import { create } from 'zustand';
import { AccountRepository } from '@/db/account-repository';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import type { Account } from '@/types/models';
import { AccountType } from '@/types/enums';

interface AccountStore {
  accounts: Account[];
  balances: Map<string, number>;
  isLoading: boolean;

  loadAccounts: () => Promise<void>;
  addAccount: (name: string, type: AccountType, icon?: string | null) => Promise<Account>;
  editAccount: (id: string, updates: Partial<Pick<Account, 'name' | 'type' | 'icon'>>) => Promise<void>;
  updateBalance: (accountId: string, balance: number, date?: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getTotalBalance: () => number;
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  balances: new Map(),
  isLoading: false,

  loadAccounts: async () => {
    set({ isLoading: true });
    const accounts = await AccountRepository.getAll();
    const balances = await AccountRepository.getAllLatestBalances();
    set({ accounts, balances, isLoading: false });
  },

  addAccount: async (name, type, icon = null) => {
    const maxOrder = Math.max(0, ...get().accounts.map(a => a.sortOrder));
    const account = await AccountRepository.create({
      name,
      type,
      icon,
      sortOrder: maxOrder + 1,
    });
    set(state => ({
      accounts: [...state.accounts, account],
    }));
    return account;
  },

  editAccount: async (id, updates) => {
    await AccountRepository.update(id, updates);
    set(state => ({
      accounts: state.accounts.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  },

  updateBalance: async (accountId, balance, date) => {
    const snapshotDate = date ?? new Date().toISOString().substring(0, 10);
    await BalanceSnapshotRepository.create({
      accountId,
      balance,
      snapshotDate,
    });
    set(state => {
      const newBalances = new Map(state.balances);
      newBalances.set(accountId, balance);
      return { balances: newBalances };
    });
  },

  deleteAccount: async (id) => {
    await AccountRepository.delete(id);
    set(state => {
      const newBalances = new Map(state.balances);
      newBalances.delete(id);
      return {
        accounts: state.accounts.filter(a => a.id !== id),
        balances: newBalances,
      };
    });
  },

  getTotalBalance: () => {
    let total = 0;
    for (const balance of get().balances.values()) {
      total += balance;
    }
    return total;
  },
}));
