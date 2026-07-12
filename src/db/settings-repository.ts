/**
 * WorthBase (家底) - Settings Repository
 * Key-value JSON storage for app settings.
 */

import { getDatabase } from './client';
import type { AppSettings } from '@/types/models';
import { DEFAULT_SETTINGS } from '@/types/models';

export const SettingsRepository = {
  /**
   * Get a single setting value as string.
   */
  async get(key: string): Promise<string | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?;',
      key
    );
    return result?.value ?? null;
  },

  /**
   * Get a setting value parsed as JSON.
   */
  async getJSON<T>(key: string, defaultValue: T): Promise<T> {
    const raw = await this.get(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Set a setting value (upsert).
   */
  async set(key: string, value: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      key, value
    );
  },

  /**
   * Set a setting value as JSON.
   */
  async setJSON(key: string, value: unknown): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },

  /**
   * Delete a setting.
   */
  async delete(key: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM settings WHERE key = ?;', key);
  },

  /**
   * Load all settings as an AppSettings object.
   * Merges with defaults for any missing keys.
   */
  async loadAll(): Promise<AppSettings> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings;'
    );
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.key, row.value);
    }

    const getBool = (key: string, def: boolean): boolean => {
      const v = map.get(key);
      return v ? v === 'true' : def;
    };
    const getStr = (key: string, def: string): string => map.get(key) ?? def;
    const getNum = (key: string, def: number | null): number | null => {
      const v = map.get(key);
      return v ? parseFloat(v) : def;
    };

    return {
      appLockEnabled: getBool('app_lock_enabled', DEFAULT_SETTINGS.appLockEnabled),
      pinHash: map.get('pin_hash') ?? null,
      biometricEnabled: getBool('biometric_enabled', DEFAULT_SETTINGS.biometricEnabled),
      themeColor: getStr('theme_color', DEFAULT_SETTINGS.themeColor),
      darkMode: getStr('dark_mode', DEFAULT_SETTINGS.darkMode) as AppSettings['darkMode'],
      currencySymbol: getStr('currency_symbol', DEFAULT_SETTINGS.currencySymbol),
      netWorthGoal: getNum('net_worth_goal', DEFAULT_SETTINGS.netWorthGoal),
    };
  },

  /**
   * Save all settings from an AppSettings object.
   */
  async saveAll(settings: AppSettings): Promise<void> {
    await this.set('app_lock_enabled', String(settings.appLockEnabled));
    if (settings.pinHash !== null) {
      await this.set('pin_hash', settings.pinHash);
    }
    await this.set('biometric_enabled', String(settings.biometricEnabled));
    await this.set('theme_color', settings.themeColor);
    await this.set('dark_mode', settings.darkMode);
    await this.set('currency_symbol', settings.currencySymbol);
    if (settings.netWorthGoal !== null) {
      await this.set('net_worth_goal', String(settings.netWorthGoal));
    }
  },
};
