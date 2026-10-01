/// <reference types="jest" />

/**
 * WorthBase (家底) - Repository Integration Tests
 * Uses sql.js in-memory SQLite to test CRUD + cascade delete + queries.
 */

// Mutable holder so the mocked getDatabase can access the current DB instance.
// Must be declared before jest.mock (which is hoisted to top of file).
const dbHolder: { current: any } = { current: null };

// Mock the client module so repositories use our in-memory SQLite.
// We inline generateId to avoid loading the real client.ts (which imports expo-sqlite).
jest.mock('@/db/client', () => ({
  getDatabase: () => {
    if (!dbHolder.current) throw new Error('Database not initialized');
    return dbHolder.current;
  },
  initDatabase: jest.fn(async () => dbHolder.current),
  closeDatabase: jest.fn(async () => { dbHolder.current = null; }),
  generateId: () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  },
}));

import { AccountRepository } from '@/db/account-repository';
import { AssetRepository } from '@/db/asset-repository';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import { SettingsRepository } from '@/db/settings-repository';
import { UsageRepository } from '@/db/usage-repository';
import { UsageCalculator } from '@/engine/UsageCalculator';
import { AccountType, AssetCategory, AmortizationType, AssetStatus, ExpenseFrequency } from '@/types/enums';
import { initMockDatabase, resetMockDatabase } from './helpers/mock-database';

// ─── Setup / Teardown ───
beforeAll(async () => {
  dbHolder.current = await initMockDatabase();
});

beforeEach(async () => {
  await resetMockDatabase();
  dbHolder.current = await initMockDatabase();
});

afterAll(async () => {
  await resetMockDatabase();
});

// ─── Account Repository Tests ───
describe('Account Repository', () => {
  test('create + getAll: round-trip account data', async () => {
    const created = await AccountRepository.create({
      name: '微信支付',
      type: AccountType.WECHAT,
      icon: null,
      sortOrder: 1,
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('微信支付');
    expect(created.type).toBe(AccountType.WECHAT);
    expect(created.createdAt).toBeDefined();

    const all = await AccountRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('微信支付');
  });

  test('create multiple accounts: ordered by sort_order', async () => {
    await AccountRepository.create({ name: 'Third', type: AccountType.CASH, icon: null, sortOrder: 3 });
    await AccountRepository.create({ name: 'First', type: AccountType.WECHAT, icon: null, sortOrder: 1 });
    await AccountRepository.create({ name: 'Second', type: AccountType.ALIPAY, icon: null, sortOrder: 2 });

    const all = await AccountRepository.getAll();
    expect(all[0].name).toBe('First');
    expect(all[1].name).toBe('Second');
    expect(all[2].name).toBe('Third');
  });

  test('getById: returns null for non-existent', async () => {
    const result = await AccountRepository.getById('non-existent');
    expect(result).toBeNull();
  });

  test('getById: returns account when exists', async () => {
    const created = await AccountRepository.create({
      name: '支付宝', type: AccountType.ALIPAY, icon: null, sortOrder: 1,
    });
    const result = await AccountRepository.getById(created.id);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('支付宝');
  });

  test('update: changes name and type', async () => {
    const created = await AccountRepository.create({
      name: 'Old Name', type: AccountType.CASH, icon: null, sortOrder: 1,
    });
    await AccountRepository.update(created.id, { name: 'New Name', type: AccountType.WECHAT });
    const updated = await AccountRepository.getById(created.id);
    expect(updated!.name).toBe('New Name');
    expect(updated!.type).toBe(AccountType.WECHAT);
  });

  test('delete: removes account', async () => {
    const created = await AccountRepository.create({
      name: 'ToDelete', type: AccountType.CASH, icon: null, sortOrder: 1,
    });
    await AccountRepository.delete(created.id);
    const all = await AccountRepository.getAll();
    expect(all).toHaveLength(0);
  });

  test('cascade delete: deleting account removes balance snapshots', async () => {
    const account = await AccountRepository.create({
      name: 'Test', type: AccountType.CASH, icon: null, sortOrder: 1,
    });
    await BalanceSnapshotRepository.create({
      accountId: account.id, balance: 5000, snapshotDate: '2025-01-01',
    });
    await BalanceSnapshotRepository.create({
      accountId: account.id, balance: 6000, snapshotDate: '2025-02-01',
    });

    // Verify snapshots exist
    const dates = await BalanceSnapshotRepository.getAllSnapshotDates();
    expect(dates).toHaveLength(2);

    // Soft delete account — snapshots should be preserved
    await AccountRepository.delete(account.id);

    // Account should no longer appear in active list
    const accounts = await AccountRepository.getAll();
    expect(accounts).toHaveLength(0);

    // But balance snapshots should still exist
    const datesAfter = await BalanceSnapshotRepository.getAllSnapshotDates();
    expect(datesAfter).toHaveLength(2);
  });
});

// ─── Balance Snapshot Repository Tests ───
describe('BalanceSnapshot Repository', () => {
  test('create + getByAccount: round-trip', async () => {
    const account = await AccountRepository.create({
      name: 'Test', type: AccountType.CASH, icon: null, sortOrder: 1,
    });
    await BalanceSnapshotRepository.create({
      accountId: account.id, balance: 1000, snapshotDate: '2025-01-01',
    });
    await BalanceSnapshotRepository.create({
      accountId: account.id, balance: 2000, snapshotDate: '2025-02-01',
    });

    const snapshots = await BalanceSnapshotRepository.getByAccount(account.id);
    expect(snapshots).toHaveLength(2);
    // Ordered by date DESC
    expect(snapshots[0].balance).toBe(2000);
    expect(snapshots[1].balance).toBe(1000);
  });

  test('getByDateRange: filters by date', async () => {
    const account = await AccountRepository.create({
      name: 'Test', type: AccountType.CASH, icon: null, sortOrder: 1,
    });
    await BalanceSnapshotRepository.create({ accountId: account.id, balance: 1000, snapshotDate: '2025-01-15' });
    await BalanceSnapshotRepository.create({ accountId: account.id, balance: 2000, snapshotDate: '2025-03-15' });
    await BalanceSnapshotRepository.create({ accountId: account.id, balance: 3000, snapshotDate: '2025-06-15' });

    const result = await BalanceSnapshotRepository.getByDateRange(account.id, '2025-02-01', '2025-05-01');
    expect(result).toHaveLength(1);
    expect(result[0].balance).toBe(2000);
  });

  test('getAllSnapshotDates: returns distinct dates DESC', async () => {
    const acc1 = await AccountRepository.create({ name: 'A', type: AccountType.CASH, icon: null, sortOrder: 1 });
    const acc2 = await AccountRepository.create({ name: 'B', type: AccountType.CASH, icon: null, sortOrder: 2 });

    await BalanceSnapshotRepository.create({ accountId: acc1.id, balance: 100, snapshotDate: '2025-01-01' });
    await BalanceSnapshotRepository.create({ accountId: acc2.id, balance: 200, snapshotDate: '2025-01-01' });
    await BalanceSnapshotRepository.create({ accountId: acc1.id, balance: 300, snapshotDate: '2025-03-01' });

    const dates = await BalanceSnapshotRepository.getAllSnapshotDates();
    expect(dates).toHaveLength(2);
    expect(dates[0]).toBe('2025-03-01');
    expect(dates[1]).toBe('2025-01-01');
  });

  test('getBalancesForDate: returns map for specific date', async () => {
    const acc1 = await AccountRepository.create({ name: 'A', type: AccountType.CASH, icon: null, sortOrder: 1 });
    const acc2 = await AccountRepository.create({ name: 'B', type: AccountType.CASH, icon: null, sortOrder: 2 });

    await BalanceSnapshotRepository.create({ accountId: acc1.id, balance: 500, snapshotDate: '2025-01-01' });
    await BalanceSnapshotRepository.create({ accountId: acc2.id, balance: 800, snapshotDate: '2025-01-01' });

    const map = await BalanceSnapshotRepository.getBalancesForDate('2025-01-01');
    expect(map.get(acc1.id)).toBe(500);
    expect(map.get(acc2.id)).toBe(800);
  });

  test('getAllLatestBalances: returns most recent balance per account', async () => {
    const acc1 = await AccountRepository.create({ name: 'A', type: AccountType.CASH, icon: null, sortOrder: 1 });
    const acc2 = await AccountRepository.create({ name: 'B', type: AccountType.CASH, icon: null, sortOrder: 2 });

    await BalanceSnapshotRepository.create({ accountId: acc1.id, balance: 1000, snapshotDate: '2025-01-01' });
    await BalanceSnapshotRepository.create({ accountId: acc1.id, balance: 1500, snapshotDate: '2025-02-01' });
    await BalanceSnapshotRepository.create({ accountId: acc2.id, balance: 2000, snapshotDate: '2025-01-15' });

    const map = await AccountRepository.getAllLatestBalances();
    expect(map.get(acc1.id)).toBe(1500);
    expect(map.get(acc2.id)).toBe(2000);
  });
});

// ─── Asset Repository Tests ───
describe('Asset Repository', () => {
  test('create + getAll: round-trip asset data', async () => {
    const created = await AssetRepository.create({
      name: 'iPhone 15',
      category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-15',
      purchasePrice: 7999,
      amortizationType: AmortizationType.SIMPLE_LINEAR,
      expectedLifespanMonths: null,
      residualValue: null,
      valuationTracking: false,
      currentValuation: null,
      usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE,
      sellDate: null,
      sellPrice: null,
      weightGrams: null,
      imagePath: null, icon: null,
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('iPhone 15');

    const all = await AssetRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('iPhone 15');
    expect(all[0].status).toBe(AssetStatus.ACTIVE);
    expect(all[0].valuationTracking).toBe(false);
  });

  test('getByStatus: filters by status', async () => {
    await AssetRepository.create({
      name: 'Active Asset', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });
    await AssetRepository.create({
      name: 'Retired Asset', category: AssetCategory.HOME,
      purchaseDate: '2025-01-01', purchasePrice: 2000,
      amortizationType: AmortizationType.NO_AMORTIZATION, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.RETIRED, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    const active = await AssetRepository.getByStatus(AssetStatus.ACTIVE);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('Active Asset');

    const retired = await AssetRepository.getByStatus(AssetStatus.RETIRED);
    expect(retired).toHaveLength(1);
    expect(retired[0].name).toBe('Retired Asset');
  });

  test('getByCategory: filters by category', async () => {
    await AssetRepository.create({
      name: 'Phone', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });
    await AssetRepository.create({
      name: 'Sofa', category: AssetCategory.HOME,
      purchaseDate: '2025-01-01', purchasePrice: 2000,
      amortizationType: AmortizationType.NO_AMORTIZATION, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    const electronics = await AssetRepository.getByCategory(AssetCategory.ELECTRONICS);
    expect(electronics).toHaveLength(1);
    expect(electronics[0].name).toBe('Phone');
  });

  test('update: changes multiple fields', async () => {
    const asset = await AssetRepository.create({
      name: 'Original', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: 36,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await AssetRepository.update(asset.id, {
      name: 'Updated Name',
      currentValuation: 800,
      status: AssetStatus.RETIRED,
    });

    const updated = await AssetRepository.getById(asset.id);
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.currentValuation).toBe(800);
    expect(updated!.status).toBe(AssetStatus.RETIRED);
  });

  test('markRetired: sets status to retired', async () => {
    const asset = await AssetRepository.create({
      name: 'Test', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await AssetRepository.markRetired(asset.id);
    const updated = await AssetRepository.getById(asset.id);
    expect(updated!.status).toBe(AssetStatus.RETIRED);
  });

  test('recordSale: sets status to sold with date and price', async () => {
    const asset = await AssetRepository.create({
      name: 'Test', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await AssetRepository.recordSale(asset.id, '2025-06-15', 600);
    const updated = await AssetRepository.getById(asset.id);
    expect(updated!.status).toBe(AssetStatus.SOLD);
    expect(updated!.sellDate).toBe('2025-06-15');
    expect(updated!.sellPrice).toBe(600);
  });

  test('delete: removes asset', async () => {
    const asset = await AssetRepository.create({
      name: 'ToDelete', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await AssetRepository.delete(asset.id);
    const all = await AssetRepository.getAll();
    expect(all).toHaveLength(0);
  });

  test('cascade delete: deleting asset removes valuation history', async () => {
    const asset = await AssetRepository.create({
      name: 'Tracked', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: true, currentValuation: 900, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await ValuationRepository.create({ assetId: asset.id, valuation: 900, recordedDate: '2025-01-01' });
    await ValuationRepository.create({ assetId: asset.id, valuation: 800, recordedDate: '2025-02-01' });

    // Verify valuations exist
    const history = await ValuationRepository.getByAsset(asset.id);
    expect(history).toHaveLength(2);

    // Delete asset — should cascade
    await AssetRepository.delete(asset.id);

    const historyAfter = await ValuationRepository.getByAsset(asset.id);
    expect(historyAfter).toHaveLength(0);
  });
});

// ─── Valuation Repository Tests ───
describe('Valuation Repository', () => {
  test('create + getByAsset: ordered by date ASC', async () => {
    const asset = await AssetRepository.create({
      name: 'Test', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: true, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await ValuationRepository.create({ assetId: asset.id, valuation: 900, recordedDate: '2025-02-01' });
    await ValuationRepository.create({ assetId: asset.id, valuation: 800, recordedDate: '2025-01-01' });

    const history = await ValuationRepository.getByAsset(asset.id);
    expect(history).toHaveLength(2);
    // Ordered by date ASC
    expect(history[0].valuation).toBe(800);
    expect(history[1].valuation).toBe(900);
  });

  test('getLatestByAsset: returns most recent', async () => {
    const asset = await AssetRepository.create({
      name: 'Test', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: true, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await ValuationRepository.create({ assetId: asset.id, valuation: 900, recordedDate: '2025-01-01' });
    await ValuationRepository.create({ assetId: asset.id, valuation: 700, recordedDate: '2025-03-01' });
    await ValuationRepository.create({ assetId: asset.id, valuation: 800, recordedDate: '2025-02-01' });

    const latest = await ValuationRepository.getLatestByAsset(asset.id);
    expect(latest).not.toBeNull();
    expect(latest!.valuation).toBe(700);
    expect(latest!.recordedDate).toBe('2025-03-01');
  });

  test('getLatestForAllAssets: returns map of latest valuations', async () => {
    const asset1 = await AssetRepository.create({
      name: 'A', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: true, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });
    const asset2 = await AssetRepository.create({
      name: 'B', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 2000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: true, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await ValuationRepository.create({ assetId: asset1.id, valuation: 900, recordedDate: '2025-01-01' });
    await ValuationRepository.create({ assetId: asset1.id, valuation: 800, recordedDate: '2025-02-01' });
    await ValuationRepository.create({ assetId: asset2.id, valuation: 1800, recordedDate: '2025-01-15' });

    const map = await ValuationRepository.getLatestForAllAssets();
    expect(map.get(asset1.id)).toBe(800);
    expect(map.get(asset2.id)).toBe(1800);
  });

  test('delete: removes valuation record', async () => {
    const asset = await AssetRepository.create({
      name: 'Test', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: true, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    const record = await ValuationRepository.create({ assetId: asset.id, valuation: 900, recordedDate: '2025-01-01' });
    await ValuationRepository.delete(record.id);

    const history = await ValuationRepository.getByAsset(asset.id);
    expect(history).toHaveLength(0);
  });
});

// ─── Settings Repository Tests ───
describe('Settings Repository', () => {
  test('set + get: round-trip string value', async () => {
    await SettingsRepository.set('test_key', 'test_value');
    const value = await SettingsRepository.get('test_key');
    expect(value).toBe('test_value');
  });

  test('get: returns null for non-existent key', async () => {
    const value = await SettingsRepository.get('non_existent');
    expect(value).toBeNull();
  });

  test('setJSON + getJSON: round-trip object', async () => {
    const obj = { name: 'test', count: 42, nested: { a: true } };
    await SettingsRepository.setJSON('my_obj', obj);
    const result = await SettingsRepository.getJSON('my_obj', null);
    expect(result).toEqual(obj);
  });

  test('getJSON: returns default when key missing', async () => {
    const result = await SettingsRepository.getJSON('missing', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  test('set: upsert (overwrite existing)', async () => {
    await SettingsRepository.set('key1', 'value1');
    await SettingsRepository.set('key1', 'value2');
    const value = await SettingsRepository.get('key1');
    expect(value).toBe('value2');
  });

  test('delete: removes key', async () => {
    await SettingsRepository.set('to_delete', 'hello');
    await SettingsRepository.delete('to_delete');
    const value = await SettingsRepository.get('to_delete');
    expect(value).toBeNull();
  });

  test('saveAll + loadAll: round-trip all settings', async () => {
    const settings = {
      appLockEnabled: true,
      pinHash: 'hashed_pin_value',
      biometricEnabled: false,
      themeColor: '#0984E3',
      darkMode: 'dark' as const,
      currencySymbol: '$',
      netWorthGoal: 500000,
    };
    await SettingsRepository.saveAll(settings);
    const loaded = await SettingsRepository.loadAll();

    expect(loaded.appLockEnabled).toBe(true);
    expect(loaded.pinHash).toBe('hashed_pin_value');
    expect(loaded.biometricEnabled).toBe(false);
    expect(loaded.themeColor).toBe('#0984E3');
    expect(loaded.darkMode).toBe('dark');
    expect(loaded.currencySymbol).toBe('$');
    expect(loaded.netWorthGoal).toBe(500000);
  });

  test('loadAll: returns defaults when no settings saved', async () => {
    const loaded = await SettingsRepository.loadAll();
    expect(loaded.appLockEnabled).toBe(false);
    expect(loaded.pinHash).toBeNull();
    expect(loaded.themeColor).toBe('#6C5CE7');
    expect(loaded.currencySymbol).toBe('¥');
  });
});

// ─── Account Repository hardDelete Tests ───
describe('AccountRepository - hardDelete', () => {
  test('physically removes account and cascades to snapshots', async () => {
    const account = await AccountRepository.create({
      name: 'ToHardDelete', type: AccountType.CASH, icon: null, sortOrder: 1,
    });
    await BalanceSnapshotRepository.create({
      accountId: account.id, balance: 5000, snapshotDate: '2025-01-01',
    });
    await BalanceSnapshotRepository.create({
      accountId: account.id, balance: 6000, snapshotDate: '2025-02-01',
    });

    // Verify account and snapshots exist
    expect(await AccountRepository.getById(account.id)).not.toBeNull();
    const snapshots = await BalanceSnapshotRepository.getByAccount(account.id);
    expect(snapshots).toHaveLength(2);

    // Hard delete — should physically remove the account
    await AccountRepository.hardDelete(account.id);

    // Account should be completely gone (not just soft-deleted)
    expect(await AccountRepository.getById(account.id)).toBeNull();

    // Balance snapshots should be cascade-deleted
    const snapshotsAfter = await BalanceSnapshotRepository.getByAccount(account.id);
    expect(snapshotsAfter).toHaveLength(0);
  });

  test('hardDelete does not affect other accounts', async () => {
    const acc1 = await AccountRepository.create({
      name: 'KeepMe', type: AccountType.CASH, icon: null, sortOrder: 1,
    });
    const acc2 = await AccountRepository.create({
      name: 'DeleteMe', type: AccountType.WECHAT, icon: null, sortOrder: 2,
    });
    await BalanceSnapshotRepository.create({
      accountId: acc1.id, balance: 1000, snapshotDate: '2025-01-01',
    });
    await BalanceSnapshotRepository.create({
      accountId: acc2.id, balance: 2000, snapshotDate: '2025-01-01',
    });

    await AccountRepository.hardDelete(acc2.id);

    // acc1 should still exist with its snapshot
    expect(await AccountRepository.getById(acc1.id)).not.toBeNull();
    const acc1Snapshots = await BalanceSnapshotRepository.getByAccount(acc1.id);
    expect(acc1Snapshots).toHaveLength(1);
    expect(acc1Snapshots[0].balance).toBe(1000);
  });
});

// ─── Asset Repository markRetired with ended_reason Tests ───
describe('AssetRepository - markRetired with ended_reason', () => {
  test('sets ended_reason to retired on active recurring expenses', async () => {
    const asset = await AssetRepository.create({
      name: 'Test', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    await RecurringExpenseRepository.create({
      assetId: asset.id, name: 'Phone Bill', amount: 50,
      frequency: ExpenseFrequency.MONTHLY,
      effectiveFrom: '2025-01', effectiveTo: null,
    });

    // Verify expense is active before retirement
    const expensesBefore = await RecurringExpenseRepository.getByAsset(asset.id);
    expect(expensesBefore).toHaveLength(1);
    expect(expensesBefore[0].effectiveTo).toBeNull();
    expect(expensesBefore[0].endedReason).toBeNull();

    await AssetRepository.markRetired(asset.id);

    // After retirement: expense should be ended with reason 'retired'
    const expensesAfter = await RecurringExpenseRepository.getByAsset(asset.id);
    expect(expensesAfter).toHaveLength(1);
    expect(expensesAfter[0].effectiveTo).not.toBeNull();
    expect(expensesAfter[0].endedReason).toBe('retired');

    // Asset status should also be retired
    const updated = await AssetRepository.getById(asset.id);
    expect(updated!.status).toBe(AssetStatus.RETIRED);
  });

  test('restoreActive only restores retired expenses', async () => {
    const asset = await AssetRepository.create({
      name: 'Test', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    // Create two recurring expenses
    const expense1 = await RecurringExpenseRepository.create({
      assetId: asset.id, name: 'Expense1', amount: 50,
      frequency: ExpenseFrequency.MONTHLY,
      effectiveFrom: '2025-01', effectiveTo: null,
    });
    const expense2 = await RecurringExpenseRepository.create({
      assetId: asset.id, name: 'Expense2', amount: 30,
      frequency: ExpenseFrequency.MONTHLY,
      effectiveFrom: '2025-01', effectiveTo: null,
    });

    // Manually end expense1 with reason 'manual'
    await RecurringExpenseRepository.endExpenseWithReason(expense1.id, '2025-03', 'manual');

    // Retire the asset — this will end expense2 with reason 'retired'
    await AssetRepository.markRetired(asset.id);

    // Verify both expenses are ended with correct reasons
    let expenses = await RecurringExpenseRepository.getByAsset(asset.id);
    expect(expenses).toHaveLength(2);
    const e1 = expenses.find(e => e.name === 'Expense1')!;
    const e2 = expenses.find(e => e.name === 'Expense2')!;
    expect(e1.effectiveTo).toBe('2025-03');
    expect(e1.endedReason).toBe('manual');
    expect(e2.effectiveTo).not.toBeNull();
    expect(e2.endedReason).toBe('retired');

    // Restore the asset to active
    await AssetRepository.restoreActive(asset.id);

    // Only expense2 (retired reason) should be restored; expense1 (manual) stays ended
    expenses = await RecurringExpenseRepository.getByAsset(asset.id);
    expect(expenses).toHaveLength(2);
    const e1After = expenses.find(e => e.name === 'Expense1')!;
    const e2After = expenses.find(e => e.name === 'Expense2')!;
    expect(e1After.effectiveTo).toBe('2025-03');
    expect(e1After.endedReason).toBe('manual');
    expect(e2After.effectiveTo).toBeNull();
    expect(e2After.endedReason).toBeNull();

    // Asset should be active again
    const updated = await AssetRepository.getById(asset.id);
    expect(updated!.status).toBe(AssetStatus.ACTIVE);
  });
});

// ─── Initial Use Count Tests ───
describe('Initial Use Count', () => {
  test('AssetRepository: create/update round-trips initialUseCount', async () => {
    const asset = await AssetRepository.create({
      name: 'Camera', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2024-01-01', purchasePrice: 5000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null,
      usageTracking: true, initialUseCount: 50,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    expect(asset.initialUseCount).toBe(50);

    const fetched = await AssetRepository.getById(asset.id);
    expect(fetched!.initialUseCount).toBe(50);

    // Update initialUseCount
    await AssetRepository.update(asset.id, { initialUseCount: 100 });
    const updated = await AssetRepository.getById(asset.id);
    expect(updated!.initialUseCount).toBe(100);
  });

  test('AssetRepository: initialUseCount defaults to 0', async () => {
    const asset = await AssetRepository.create({
      name: 'Phone', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 3000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null,
      usageTracking: true, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    const fetched = await AssetRepository.getById(asset.id);
    expect(fetched!.initialUseCount).toBe(0);
  });

  test('UsageCalculator: costPerUse with initialUseCount only (no records)', async () => {
    const asset = await AssetRepository.create({
      name: 'Jacket', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2024-06-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null,
      usageTracking: true, initialUseCount: 50,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    const result = await UsageCalculator.calculate(asset);
    expect(result.initialUseCount).toBe(50);
    expect(result.useCount).toBe(0);
    expect(result.totalUseCount).toBe(50);
    expect(result.costPerUse).toBeCloseTo(20, 2); // 1000 / 50 = 20
  });

  test('UsageCalculator: costPerUse with both initialUseCount and records', async () => {
    const asset = await AssetRepository.create({
      name: 'Backpack', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2024-01-01', purchasePrice: 600,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null,
      usageTracking: true, initialUseCount: 50,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    // Add 10 usage records on different dates
    for (let i = 1; i <= 10; i++) {
      await UsageRepository.create({
        assetId: asset.id,
        usedAt: `2025-01-${String(i).padStart(2, '0')}`,
        note: null,
      });
    }

    const result = await UsageCalculator.calculate(asset);
    expect(result.initialUseCount).toBe(50);
    expect(result.useCount).toBe(10);
    expect(result.totalUseCount).toBe(60);
    expect(result.costPerUse).toBeCloseTo(10, 2); // 600 / 60 = 10
  });

  test('UsageCalculator: backward compatibility — initialUseCount 0 and no records', async () => {
    const asset = await AssetRepository.create({
      name: 'Watch', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 2000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null,
      usageTracking: true, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    const result = await UsageCalculator.calculate(asset);
    expect(result.initialUseCount).toBe(0);
    expect(result.useCount).toBe(0);
    expect(result.totalUseCount).toBe(0);
    expect(result.costPerUse).toBe(Infinity);
  });

  test('UsageCalculator.calculateAll: excludes assets with usageTracking disabled', async () => {
    // Asset with usageTracking enabled
    const tracked = await AssetRepository.create({
      name: 'Tracked', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null,
      usageTracking: true, initialUseCount: 10,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    // Asset with usageTracking disabled but has initialUseCount
    const untracked = await AssetRepository.create({
      name: 'Untracked', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 2000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null,
      usageTracking: false, initialUseCount: 50,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });

    const allAssets = [tracked, untracked];
    const results = await UsageCalculator.calculateAll(allAssets);

    // Only the tracked asset should be in the results
    expect(results.size).toBe(1);
    expect(results.has(tracked.id)).toBe(true);
    expect(results.has(untracked.id)).toBe(false);
  });
});

// ─── Balance History As-Of Fix Verification ───
describe('Balance History as-of-date calculation (fix-balance-history-mismatch)', () => {
  test('getLatestSnapshotForDate: returns all accounts latest balances as of a date', async () => {
    const accA = await AccountRepository.create({ name: '微信', type: AccountType.WECHAT, icon: null, sortOrder: 1 });
    const accB = await AccountRepository.create({ name: '支付宝', type: AccountType.ALIPAY, icon: null, sortOrder: 2 });

    // Account A updated on Jan 1
    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 5000, snapshotDate: '2025-01-01' });
    // Account B updated on Jan 15
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3000, snapshotDate: '2025-01-15' });

    // As of Jan 15: should include BOTH accounts
    const mapJan15 = await BalanceSnapshotRepository.getLatestSnapshotForDate('2025-01-15');
    expect(mapJan15.get(accA.id)).toBe(5000); // carried forward from Jan 1
    expect(mapJan15.get(accB.id)).toBe(3000);

    // Sum should be 8000, not 3000 (which was the bug)
    let total = 0;
    for (const b of mapJan15.values()) total += b;
    expect(total).toBe(8000);
  });

  test('getLatestSnapshotForDate: balance history does not decrease after partial update', async () => {
    const accA = await AccountRepository.create({ name: '微信', type: AccountType.WECHAT, icon: null, sortOrder: 1 });
    const accB = await AccountRepository.create({ name: '支付宝', type: AccountType.ALIPAY, icon: null, sortOrder: 2 });

    // Initial setup: both accounts have balances
    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 5000, snapshotDate: '2025-07-01' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3000, snapshotDate: '2025-07-15' });

    // User receives income, updates only account B on Aug 8
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3500, snapshotDate: '2025-08-08' });

    // Compute balance history totals using getLatestSnapshotForDate (as-of algorithm)
    const dates = await BalanceSnapshotRepository.getAllSnapshotDates();
    const historyTotals: { date: string; total: number }[] = [];
    for (const date of dates.reverse()) { // chronological order
      const map = await BalanceSnapshotRepository.getLatestSnapshotForDate(date);
      let total = 0;
      for (const b of map.values()) total += b;
      historyTotals.push({ date, total });
    }

    // Expected:
    // 2025-07-01: A=5000 (B not yet created → not in map) = 5000
    // 2025-07-15: A=5000 + B=3000 = 8000
    // 2025-08-08: A=5000 + B=3500 = 8500
    expect(historyTotals).toHaveLength(3);
    expect(historyTotals[0].total).toBe(5000);
    expect(historyTotals[1].total).toBe(8000);
    expect(historyTotals[2].total).toBe(8500);

    // Key assertion: each total should be >= previous (since user added money)
    for (let i = 1; i < historyTotals.length; i++) {
      expect(historyTotals[i].total).toBeGreaterThanOrEqual(historyTotals[i - 1].total);
    }
  });

  test('getLatestSnapshotForDate: latest date total matches getAllLatestBalances', async () => {
    const accA = await AccountRepository.create({ name: 'A', type: AccountType.CASH, icon: null, sortOrder: 1 });
    const accB = await AccountRepository.create({ name: 'B', type: AccountType.WECHAT, icon: null, sortOrder: 2 });
    const accC = await AccountRepository.create({ name: 'C', type: AccountType.ALIPAY, icon: null, sortOrder: 3 });

    // Different accounts updated on different dates
    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 1000, snapshotDate: '2025-01-01' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 2000, snapshotDate: '2025-03-15' });
    await BalanceSnapshotRepository.create({ accountId: accC.id, balance: 3000, snapshotDate: '2025-06-01' });
    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 1500, snapshotDate: '2025-08-01' });

    // The most recent snapshot date is 2025-08-01
    const dates = await BalanceSnapshotRepository.getAllSnapshotDates();
    const latestDate = dates[0]; // DESC order, first is latest
    expect(latestDate).toBe('2025-08-01');

    // getLatestSnapshotForDate for the latest date
    const asOfMap = await BalanceSnapshotRepository.getLatestSnapshotForDate(latestDate);
    let asOfTotal = 0;
    for (const b of asOfMap.values()) asOfTotal += b;

    // getAllLatestBalances
    const latestMap = await AccountRepository.getAllLatestBalances();
    let latestTotal = 0;
    for (const b of latestMap.values()) latestTotal += b;

    // They MUST match
    expect(asOfTotal).toBe(latestTotal);
    // Specifically: A=1500 + B=2000 + C=3000 = 6500
    expect(asOfTotal).toBe(6500);
  });

  test('getLatestSnapshotForDate: excludes soft-deleted accounts', async () => {
    const accA = await AccountRepository.create({ name: 'Active', type: AccountType.CASH, icon: null, sortOrder: 1 });
    const accB = await AccountRepository.create({ name: 'ToDelete', type: AccountType.CASH, icon: null, sortOrder: 2 });

    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 1000, snapshotDate: '2025-01-01' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 2000, snapshotDate: '2025-01-01' });

    // Both should appear before deletion
    const mapBefore = await BalanceSnapshotRepository.getLatestSnapshotForDate('2025-01-01');
    expect(mapBefore.size).toBe(2);

    // Soft delete accB
    await AccountRepository.delete(accB.id);

    // After deletion, only accA should appear
    const mapAfter = await BalanceSnapshotRepository.getLatestSnapshotForDate('2025-01-01');
    expect(mapAfter.size).toBe(1);
    expect(mapAfter.get(accA.id)).toBe(1000);
    expect(mapAfter.get(accB.id)).toBeUndefined();
  });

  test('getBalancesForDate vs getLatestSnapshotForDate: demonstrates the bug', async () => {
    const accA = await AccountRepository.create({ name: '微信', type: AccountType.WECHAT, icon: null, sortOrder: 1 });
    const accB = await AccountRepository.create({ name: '支付宝', type: AccountType.ALIPAY, icon: null, sortOrder: 2 });

    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 5000, snapshotDate: '2025-07-01' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3000, snapshotDate: '2025-07-15' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3500, snapshotDate: '2025-08-08' });

    // OLD (buggy) behavior: getBalancesForDate only returns accounts updated on that exact date
    const buggyMap = await BalanceSnapshotRepository.getBalancesForDate('2025-08-08');
    let buggyTotal = 0;
    for (const b of buggyMap.values()) buggyTotal += b;
    expect(buggyTotal).toBe(3500); // Only B! Missing A's 5000

    // NEW (fixed) behavior: getLatestSnapshotForDate returns all accounts' latest as of that date
    const fixedMap = await BalanceSnapshotRepository.getLatestSnapshotForDate('2025-08-08');
    let fixedTotal = 0;
    for (const b of fixedMap.values()) fixedTotal += b;
    expect(fixedTotal).toBe(8500); // A=5000 + B=3500
  });

  test('getAllSnapshotsChronological: returns all snapshots ordered by date ASC', async () => {
    const accA = await AccountRepository.create({ name: '微信', type: AccountType.WECHAT, icon: null, sortOrder: 1 });
    const accB = await AccountRepository.create({ name: '支付宝', type: AccountType.ALIPAY, icon: null, sortOrder: 2 });

    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 5000, snapshotDate: '2025-07-01' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3000, snapshotDate: '2025-07-15' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3500, snapshotDate: '2025-08-08' });

    const snapshots = await BalanceSnapshotRepository.getAllSnapshotsChronological();
    expect(snapshots).toHaveLength(3);
    expect(snapshots[0].snapshotDate).toBe('2025-07-01');
    expect(snapshots[1].snapshotDate).toBe('2025-07-15');
    expect(snapshots[2].snapshotDate).toBe('2025-08-08');
  });

  test('running balance: trend chart correctly carries forward unchanged accounts', async () => {
    const accA = await AccountRepository.create({ name: '微信', type: AccountType.WECHAT, icon: null, sortOrder: 1 });
    const accB = await AccountRepository.create({ name: '支付宝', type: AccountType.ALIPAY, icon: null, sortOrder: 2 });
    const accC = await AccountRepository.create({ name: '银行卡', type: AccountType.BANK_CARD, icon: null, sortOrder: 3 });

    // Day 1: all three accounts updated
    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 5000, snapshotDate: '2025-07-01' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3000, snapshotDate: '2025-07-01' });
    await BalanceSnapshotRepository.create({ accountId: accC.id, balance: 2000, snapshotDate: '2025-07-01' });

    // Day 2: only A and B updated, C unchanged
    await BalanceSnapshotRepository.create({ accountId: accA.id, balance: 5500, snapshotDate: '2025-08-01' });
    await BalanceSnapshotRepository.create({ accountId: accB.id, balance: 3200, snapshotDate: '2025-08-01' });

    // Simulate the trend chart running balance computation
    const allDates = await BalanceSnapshotRepository.getAllSnapshotDates();
    const datesChrono = [...allDates].reverse();
    const allSnapshots = await BalanceSnapshotRepository.getAllSnapshotsChronological();
    const activeAccountIds = new Set([accA.id, accB.id, accC.id]);

    const runningBalances = new Map<string, number>();
    let snapIdx = 0;
    const balanceTotals = new Map<string, number>();
    for (const date of datesChrono) {
      while (snapIdx < allSnapshots.length && allSnapshots[snapIdx].snapshotDate <= date) {
        runningBalances.set(allSnapshots[snapIdx].accountId, allSnapshots[snapIdx].balance);
        snapIdx++;
      }
      let total = 0;
      for (const [accountId, b] of runningBalances.entries()) {
        if (activeAccountIds.has(accountId)) total += b;
      }
      balanceTotals.set(date, total);
    }

    // Day 1: A=5000 + B=3000 + C=2000 = 10000
    expect(balanceTotals.get('2025-07-01')).toBe(10000);
    // Day 2: A=5500 + B=3200 + C=2000 (carried forward) = 10700
    expect(balanceTotals.get('2025-08-01')).toBe(10700);
  });
});

// ─── Recurring Expense Frequency Tests ───
describe('RecurringExpenseRepository - frequency', () => {
  async function makeAsset() {
    return AssetRepository.create({
      name: 'Test', category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-01-01', purchasePrice: 1000,
      amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: null,
      residualValue: null, valuationTracking: false, currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, weightGrams: null, imagePath: null, icon: null,
    });
  }

  test('create + read round-trips yearly frequency', async () => {
    const asset = await makeAsset();
    const created = await RecurringExpenseRepository.create({
      assetId: asset.id, name: '车险', amount: 3000,
      frequency: ExpenseFrequency.YEARLY,
      effectiveFrom: '2025-01', effectiveTo: null,
    });
    expect(created.frequency).toBe(ExpenseFrequency.YEARLY);

    const all = await RecurringExpenseRepository.getByAsset(asset.id);
    expect(all).toHaveLength(1);
    expect(all[0].frequency).toBe(ExpenseFrequency.YEARLY);
  });

  test('update can change frequency', async () => {
    const asset = await makeAsset();
    const created = await RecurringExpenseRepository.create({
      assetId: asset.id, name: '物业费', amount: 900,
      frequency: ExpenseFrequency.MONTHLY,
      effectiveFrom: '2025-01', effectiveTo: null,
    });

    await RecurringExpenseRepository.update(created.id, { frequency: ExpenseFrequency.QUARTERLY });

    const all = await RecurringExpenseRepository.getByAsset(asset.id);
    expect(all[0].frequency).toBe(ExpenseFrequency.QUARTERLY);
  });

  test('rows without frequency (pre-v10) default to monthly on read', async () => {
    const asset = await makeAsset();
    // Simulate a legacy row inserted before the frequency column existed
    const db = dbHolder.current;
    await db.runAsync(
      `INSERT INTO recurring_expenses (id, asset_id, name, amount, effective_from, effective_to, ended_reason, created_at)
       VALUES ('legacy-1', ?, '旧数据', 100, '2025-01', NULL, NULL, '2025-01-01T00:00:00Z');`,
      asset.id
    );

    const all = await RecurringExpenseRepository.getByAsset(asset.id);
    expect(all).toHaveLength(1);
    expect(all[0].frequency).toBe(ExpenseFrequency.MONTHLY);
  });
});
