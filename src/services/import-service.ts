/**
 * WorthBase (家底) - Import Service
 * Read JSON → preview → replace/merge → write to DB.
 * Maps old IDs to new IDs to maintain referential integrity.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { AccountRepository } from '@/db/account-repository';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { AssetRepository } from '@/db/asset-repository';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import { MaintenanceRepository } from '@/db/maintenance-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { SettingsRepository } from '@/db/settings-repository';
import { getDatabase } from '@/db/client';
import { AccountType, AssetCategory, AmortizationType, AssetStatus } from '@/types/enums';

interface ImportData {
  version?: number;
  exportDate?: string;
  accounts?: any[];
  balanceSnapshots?: any[];
  assets?: any[];
  recurringExpenses?: any[];
  maintenanceRecords?: any[];
  valuationHistory?: any[];
  settings?: any;
}

export const ImportService = {
  /**
   * Read and parse a JSON file from the given path.
   */
  async readJSON(filePath: string): Promise<ImportData> {
    const content = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.parse(content);
  },

  /**
   * Preview the data from a JSON file (without writing to DB).
   */
  async preview(filePath: string): Promise<{ accounts: number; assets: number; snapshots: number }> {
    const data = await ImportService.readJSON(filePath);
    return {
      accounts: data.accounts?.length ?? 0,
      assets: data.assets?.length ?? 0,
      snapshots: data.balanceSnapshots?.length ?? 0,
    };
  },

  /**
   * Import data from JSON, replacing all existing data.
   * Tracks old→new ID mappings to maintain referential integrity.
   */
  async importReplace(filePath: string): Promise<void> {
    const data = await ImportService.readJSON(filePath);
    const db = getDatabase();

    await db.withTransactionAsync(async () => {
      // Clear all tables
      await db.execAsync(`
        DELETE FROM balance_snapshots;
        DELETE FROM recurring_expenses;
        DELETE FROM maintenance_records;
        DELETE FROM valuation_history;
        DELETE FROM accounts;
        DELETE FROM assets;
        DELETE FROM settings;
      `);

      // Map old IDs → new IDs for referential integrity
      const accountIdMap = new Map<string, string>();
      const assetIdMap = new Map<string, string>();

      // Import accounts — track old→new ID mapping
      if (data.accounts) {
        for (const a of data.accounts) {
          if (!Object.values(AccountType).includes(a.type)) {
            throw new Error(`Invalid account type: ${a.type}`);
          }
          const created = await AccountRepository.create({
            name: a.name, type: a.type, icon: a.icon ?? null, sortOrder: a.sortOrder ?? 0,
          });
          accountIdMap.set(a.id, created.id);
        }
      }

      // Import assets — track old→new ID mapping
      if (data.assets) {
        for (const a of data.assets) {
          if (!Object.values(AssetCategory).includes(a.category)) {
            throw new Error(`Invalid asset category: ${a.category}`);
          }
          if (!Object.values(AmortizationType).includes(a.amortizationType)) {
            throw new Error(`Invalid amortization type: ${a.amortizationType}`);
          }
          const created = await AssetRepository.create({
            name: a.name, category: a.category, purchaseDate: a.purchaseDate,
            purchasePrice: a.purchasePrice, amortizationType: a.amortizationType,
            expectedLifespanMonths: a.expectedLifespanMonths ?? null,
            residualValue: a.residualValue ?? null,
            valuationTracking: a.valuationTracking ?? false,
            currentValuation: a.currentValuation ?? null,
            status: a.status, sellDate: a.sellDate ?? null,
            sellPrice: a.sellPrice ?? null, weightGrams: a.weightGrams ?? null,
            imagePath: a.imagePath ?? null,
          });
          assetIdMap.set(a.id, created.id);
        }
      }

      // Import balance snapshots — remap accountId
      if (data.balanceSnapshots) {
        for (const s of data.balanceSnapshots) {
          const newAccountId = accountIdMap.get(s.accountId);
          if (!newAccountId) continue; // skip orphan snapshots
          await BalanceSnapshotRepository.create({
            accountId: newAccountId, balance: s.balance, snapshotDate: s.snapshotDate,
          });
        }
      }

      // Import recurring expenses — remap assetId
      if (data.recurringExpenses) {
        for (const re of data.recurringExpenses) {
          const newAssetId = assetIdMap.get(re.assetId);
          if (!newAssetId) continue;
          await RecurringExpenseRepository.create({
            assetId: newAssetId, name: re.name, amount: re.amount,
            effectiveFrom: re.effectiveFrom, effectiveTo: re.effectiveTo ?? null,
          });
        }
      }

      // Import maintenance records — remap assetId
      if (data.maintenanceRecords) {
        for (const m of data.maintenanceRecords) {
          const newAssetId = assetIdMap.get(m.assetId);
          if (!newAssetId) continue;
          await MaintenanceRepository.create({
            assetId: newAssetId, name: m.name, amount: m.amount,
            date: m.date, amortize: m.amortize ?? false,
          });
        }
      }

      // Import valuation history — remap assetId
      if (data.valuationHistory) {
        for (const v of data.valuationHistory) {
          const newAssetId = assetIdMap.get(v.assetId);
          if (!newAssetId) continue;
          await ValuationRepository.create({
            assetId: newAssetId, valuation: v.valuation, recordedDate: v.recordedDate,
          });
        }
      }

      // Import settings
      if (data.settings) {
        await SettingsRepository.saveAll(data.settings);
      }
    });
  },
};
