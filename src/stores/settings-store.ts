/**
 * WorthBase (家底) - Settings Store (Zustand)
 * State: theme, darkMode, currency, netWorthGoal, appLock
 * Actions: update, loadSettings
 */

import { create } from 'zustand';
import { SettingsRepository } from '@/db/settings-repository';
import type { AppSettings } from '@/types/models';
import { DEFAULT_SETTINGS } from '@/types/models';

interface SettingsStore extends AppSettings {
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  update: (updates: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    const settings = await SettingsRepository.loadAll();
    set({ ...settings, isLoading: false });
  },

  update: async (updates) => {
    const current = get();
    const newSettings: AppSettings = { ...current, ...updates };
    await SettingsRepository.saveAll(newSettings);
    set(updates);
  },
}));
