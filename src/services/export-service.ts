/**
 * WorthBase (家底) - Export Service
 * Export all data as JSON or CSV to device shared storage.
 */

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const docDir = (FileSystem as any).documentDirectory as string;
import { AccountRepository } from '@/db/account-repository';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { AssetRepository } from '@/db/asset-repository';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import { MaintenanceRepository } from '@/db/maintenance-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { SettingsRepository } from '@/db/settings-repository';
import { getCurrentDate } from '@/utils/format';

export const ExportService = {
  /**
   * Export all app data as a JSON file.
   */
  async exportJSON(): Promise<void> {
    const [accounts, assets, settings, snapshotDates] = await Promise.all([
      AccountRepository.getAll(),
      AssetRepository.getAll(),
      SettingsRepository.loadAll(),
      BalanceSnapshotRepository.getAllSnapshotDates(),
    ]);

    // Get all balance snapshots, excluding deleted accounts
    const activeAccountIds = new Set((await AccountRepository.getAll()).map(a => a.id));
    const snapshots: { accountId: string; balance: number; snapshotDate: string }[] = [];
    for (const date of snapshotDates) {
      const balMap = await BalanceSnapshotRepository.getBalancesForDate(date);
      for (const [accountId, balance] of balMap) {
        if (!activeAccountIds.has(accountId)) continue;
        snapshots.push({ accountId, balance, snapshotDate: date });
      }
    }

    // Get per-asset data
    const recurringExpenses = [];
    const maintenanceRecords = [];
    const valuationHistory = [];
    for (const asset of assets) {
      const re = await RecurringExpenseRepository.getByAsset(asset.id);
      const mr = await MaintenanceRepository.getByAsset(asset.id);
      const vh = await ValuationRepository.getByAsset(asset.id);
      recurringExpenses.push(...re);
      maintenanceRecords.push(...mr);
      valuationHistory.push(...vh);
    }

    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      accounts,
      balanceSnapshots: snapshots,
      assets,
      recurringExpenses,
      maintenanceRecords,
      valuationHistory,
      settings,
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const fileName = `worthbase_export_${getCurrentDate()}.json`;
    const filePath = `${docDir}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: '导出 WorthBase 数据',
      });
    }
  },

  /**
   * Export accounts and balance history as CSV.
   */
  async exportCSV(): Promise<void> {
    const accounts = await AccountRepository.getAll();
    const snapshotDates = await BalanceSnapshotRepository.getAllSnapshotDates();

    // Build CSV: date, account1, account2, ..., total
    const headers = ['日期', ...accounts.map(a => a.name), '总计'];
    const rows: string[][] = [headers];

    for (const date of snapshotDates.reverse()) {
      const balMap = await BalanceSnapshotRepository.getBalancesForDate(date);
      const row: string[] = [date];
      let total = 0;
      for (const account of accounts) {
        const bal = balMap.get(account.id) ?? 0;
        total += bal;
        row.push(String(bal));
      }
      row.push(String(total));
      rows.push(row);
    }

    // Assets CSV
    const assets = await AssetRepository.getAll();
    const assetHeaders = ['名称', '分类', '购入日期', '购入价格', '当前估值', '状态', '分摊方式'];
    const assetRows: string[][] = [assetHeaders];
    for (const a of assets) {
      assetRows.push([
        a.name, a.category, a.purchaseDate, String(a.purchasePrice),
        String(a.currentValuation ?? ''), a.status, a.amortizationType,
      ]);
    }

    const csv = [...rows, [], ['资产列表'], ...assetRows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const fileName = `worthbase_export_${getCurrentDate()}.csv`;
    const filePath = `${docDir}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: '导出 WorthBase CSV',
      });
    }
  },
};
