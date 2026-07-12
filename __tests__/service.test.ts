/// <reference types="jest" />

/**
 * WorthBase (家底) - Service Layer Tests
 * Tests export-service (JSON/CSV output), import-service (import logic), backup-service (backup management).
 * Uses in-memory SQLite for real data, mocks expo-file-system and expo-sharing.
 */

// ─── In-memory DB holder (same pattern as repository tests) ───
const dbHolder: { current: any } = { current: null };

// Mock the client module (inline generateId to avoid loading expo-sqlite)
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

// ─── Override expo-file-system mock with local file store ───
const mockFiles = new Map<string, string>();
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(async (path: string) => ({ exists: mockFiles.has(path) || [...mockFiles.keys()].some(k => k.startsWith(path)) })),
  makeDirectoryAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async (path: string, content: string) => { mockFiles.set(path, content); }),
  readAsStringAsync: jest.fn(async (path: string) => mockFiles.get(path) ?? ''),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    const content = mockFiles.get(from) ?? '';
    mockFiles.set(to, content);
  }),
  deleteAsync: jest.fn(async (path: string) => { mockFiles.delete(path); }),
  readDirectoryAsync: jest.fn(async (dirPath: string) => {
    const files: string[] = [];
    for (const key of mockFiles.keys()) {
      if (key.startsWith(dirPath)) {
        files.push(key.substring(dirPath.length));
      }
    }
    return files;
  }),
  EncodingType: { UTF8: 'utf8' },
}));

// expo-file-system/legacy — services now import from this path
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(async (path: string) => ({ exists: mockFiles.has(path) || [...mockFiles.keys()].some(k => k.startsWith(path)) })),
  makeDirectoryAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async (path: string, content: string) => { mockFiles.set(path, content); }),
  readAsStringAsync: jest.fn(async (path: string) => mockFiles.get(path) ?? ''),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    const content = mockFiles.get(from) ?? '';
    mockFiles.set(to, content);
  }),
  deleteAsync: jest.fn(async (path: string) => { mockFiles.delete(path); }),
  readDirectoryAsync: jest.fn(async (dirPath: string) => {
    const files: string[] = [];
    for (const key of mockFiles.keys()) {
      if (key.startsWith(dirPath)) {
        files.push(key.substring(dirPath.length));
      }
    }
    return files;
  }),
  EncodingType: { UTF8: 'utf8' },
}));

// ─── Mock expo-sharing ───
const mockShare = jest.fn();
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: mockShare,
}));

// ─── Imports ───
import { ExportService } from '@/services/export-service';
import { ImportService } from '@/services/import-service';
import { BackupService } from '@/services/backup-service';
import { AccountRepository } from '@/db/account-repository';
import { AssetRepository } from '@/db/asset-repository';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { SettingsRepository } from '@/db/settings-repository';
import { AccountType, AssetCategory, AmortizationType, AssetStatus } from '@/types/enums';
import { initMockDatabase, resetMockDatabase } from './helpers/mock-database';
import * as FileSystem from 'expo-file-system/legacy';

// ─── Setup / Teardown ───
beforeAll(async () => {
  dbHolder.current = await initMockDatabase();
});

beforeEach(async () => {
  await resetMockDatabase();
  dbHolder.current = await initMockDatabase();
  mockFiles.clear();
  mockShare.mockClear();
  jest.clearAllMocks();
});

afterAll(async () => {
  await resetMockDatabase();
});

// ─── Helper: seed test data ───
async function seedTestData() {
  const acc = await AccountRepository.create({
    name: '微信支付', type: AccountType.WECHAT, icon: null, sortOrder: 1,
  });
  const acc2 = await AccountRepository.create({
    name: '支付宝', type: AccountType.ALIPAY, icon: null, sortOrder: 2,
  });

  await BalanceSnapshotRepository.create({ accountId: acc.id, balance: 5000, snapshotDate: '2025-01-01' });
  await BalanceSnapshotRepository.create({ accountId: acc2.id, balance: 3000, snapshotDate: '2025-01-01' });
  await BalanceSnapshotRepository.create({ accountId: acc.id, balance: 6000, snapshotDate: '2025-02-01' });

  const asset = await AssetRepository.create({
    name: 'iPhone 15', category: AssetCategory.ELECTRONICS,
    purchaseDate: '2025-01-15', purchasePrice: 7999,
    amortizationType: AmortizationType.SIMPLE_LINEAR, expectedLifespanMonths: 24,
    residualValue: null, valuationTracking: true, currentValuation: 6000,
    status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, imagePath: null,
  });

  await ValuationRepository.create({ assetId: asset.id, valuation: 6500, recordedDate: '2025-01-15' });
  await ValuationRepository.create({ assetId: asset.id, valuation: 6000, recordedDate: '2025-02-15' });

  return { acc, acc2, asset };
}

// ─── Export Service Tests ───
describe('ExportService', () => {
  test('exportJSON: writes valid JSON file with all data', async () => {
    const { acc, asset } = await seedTestData();

    await ExportService.exportJSON();

    // Verify file was written
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    const writeCall = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    const filePath = writeCall[0];
    const jsonContent = writeCall[1];

    expect(filePath).toContain('worthbase_export_');
    expect(filePath).toContain('.json');

    const data = JSON.parse(jsonContent);
    expect(data.version).toBe(1);
    expect(data.exportDate).toBeDefined();
    expect(data.accounts).toHaveLength(2);
    expect(data.accounts[0].name).toBe('微信支付');
    expect(data.balanceSnapshots).toHaveLength(3);
    expect(data.assets).toHaveLength(1);
    expect(data.assets[0].name).toBe('iPhone 15');
    expect(data.valuationHistory).toHaveLength(2);
    expect(data.settings).toBeDefined();

    // Verify sharing was called
    expect(mockShare).toHaveBeenCalledWith(
      expect.stringContaining('.json'),
      expect.objectContaining({ mimeType: 'application/json' }),
    );
  });

  test('exportJSON: includes recurring expenses and maintenance records', async () => {
    const { asset } = await seedTestData();
    const { RecurringExpenseRepository } = require('@/db/recurring-expense-repository');
    const { MaintenanceRepository } = require('@/db/maintenance-repository');

    await RecurringExpenseRepository.create({
      assetId: asset.id, name: '保险费', amount: 200, effectiveFrom: '2025-01', effectiveTo: null,
    });
    await MaintenanceRepository.create({
      assetId: asset.id, name: '换屏', amount: 800, date: '2025-02-01', amortize: false,
    });

    await ExportService.exportJSON();

    const writeCall = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    const data = JSON.parse(writeCall[1]);
    expect(data.recurringExpenses).toHaveLength(1);
    expect(data.recurringExpenses[0].name).toBe('保险费');
    expect(data.maintenanceRecords).toHaveLength(1);
    expect(data.maintenanceRecords[0].name).toBe('换屏');
  });

  test('exportCSV: writes CSV with balance history and asset list', async () => {
    await seedTestData();

    await ExportService.exportCSV();

    const writeCall = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    const filePath = writeCall[0];
    const csvContent = writeCall[1];

    expect(filePath).toContain('.csv');

    // CSV should have headers
    const lines = csvContent.split('\n');
    expect(lines[0]).toContain('日期');
    expect(lines[0]).toContain('微信支付');
    expect(lines[0]).toContain('支付宝');
    expect(lines[0]).toContain('总计');

    // Should contain asset section
    expect(csvContent).toContain('资产列表');
    expect(csvContent).toContain('iPhone 15');
    expect(csvContent).toContain('electronics');

    // Verify sharing was called with CSV mime type
    expect(mockShare).toHaveBeenCalledWith(
      expect.stringContaining('.csv'),
      expect.objectContaining({ mimeType: 'text/csv' }),
    );
  });

  test('exportJSON: empty database produces valid empty export', async () => {
    await ExportService.exportJSON();

    const writeCall = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    const data = JSON.parse(writeCall[1]);

    expect(data.version).toBe(1);
    expect(data.accounts).toHaveLength(0);
    expect(data.balanceSnapshots).toHaveLength(0);
    expect(data.assets).toHaveLength(0);
    expect(data.valuationHistory).toHaveLength(0);
  });
});

// ─── Import Service Tests ───
describe('ImportService', () => {
  test('readJSON: parses JSON file content', async () => {
    const testData = {
      version: 1,
      accounts: [{ name: 'Test', type: 'wechat', icon: null, sortOrder: 1 }],
      assets: [],
      balanceSnapshots: [],
    };
    mockFiles.set('/test/import.json', JSON.stringify(testData));

    const result = await ImportService.readJSON('/test/import.json');
    expect(result.version).toBe(1);
    expect(result.accounts).toHaveLength(1);
  });

  test('preview: returns counts without writing to DB', async () => {
    const testData = {
      version: 1,
      accounts: [{ name: 'A', type: 'cash', icon: null, sortOrder: 1 }, { name: 'B', type: 'alipay', icon: null, sortOrder: 2 }],
      assets: [{ name: 'Phone', category: 'electronics' }],
      balanceSnapshots: [{ accountId: 'a1', balance: 100, snapshotDate: '2025-01-01' }],
    };
    mockFiles.set('/test/preview.json', JSON.stringify(testData));

    const preview = await ImportService.preview('/test/preview.json');
    expect(preview.accounts).toBe(2);
    expect(preview.assets).toBe(1);
    expect(preview.snapshots).toBe(1);

    // Verify nothing was written to DB
    const accounts = await AccountRepository.getAll();
    expect(accounts).toHaveLength(0);
  });

  test('importReplace: replaces all data in DB', async () => {
    // Seed existing data
    await seedTestData();

    // Prepare import data
    const importData = {
      version: 1,
      accounts: [
        { name: 'New Account', type: AccountType.CASH, icon: null, sortOrder: 1 },
      ],
      assets: [
        {
          name: 'New Asset', category: AssetCategory.FURNITURE,
          purchaseDate: '2025-03-01', purchasePrice: 5000,
          amortizationType: AmortizationType.NO_AMORTIZATION, expectedLifespanMonths: null,
          residualValue: null, valuationTracking: false, currentValuation: null,
          status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, imagePath: null,
        },
      ],
      balanceSnapshots: [],
      recurringExpenses: [],
      maintenanceRecords: [],
      valuationHistory: [],
      settings: {
        appLockEnabled: true, pinHash: 'new_hash', biometricEnabled: false,
        themeColor: '#FF0000', darkMode: 'dark', currencySymbol: '€', netWorthGoal: 100000,
      },
    };
    mockFiles.set('/test/replace.json', JSON.stringify(importData));

    await ImportService.importReplace('/test/replace.json');

    // Verify old data is gone, new data is present
    const accounts = await AccountRepository.getAll();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe('New Account');

    const assets = await AssetRepository.getAll();
    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe('New Asset');

    // Verify settings were replaced
    const settings = await SettingsRepository.loadAll();
    expect(settings.appLockEnabled).toBe(true);
    expect(settings.themeColor).toBe('#FF0000');
    expect(settings.currencySymbol).toBe('€');
  });

  test('importReplace: handles empty/null arrays gracefully', async () => {
    mockFiles.set('/test/empty.json', JSON.stringify({ version: 1 }));

    await ImportService.importReplace('/test/empty.json');

    const accounts = await AccountRepository.getAll();
    expect(accounts).toHaveLength(0);
    const assets = await AssetRepository.getAll();
    expect(assets).toHaveLength(0);
  });

  test('importReplace: imports all data types correctly', async () => {
    const { acc } = await seedTestData();

    const importData = {
      version: 1,
      accounts: [
        { name: '银行', type: AccountType.BANK_CARD, icon: null, sortOrder: 1 },
      ],
      assets: [
        {
          name: 'MacBook', category: AssetCategory.ELECTRONICS,
          purchaseDate: '2025-02-01', purchasePrice: 15000,
          amortizationType: AmortizationType.EXPECTED_LIFESPAN, expectedLifespanMonths: 36,
          residualValue: 3000, valuationTracking: true, currentValuation: 12000,
          status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null, imagePath: null,
        },
      ],
      balanceSnapshots: [],
      recurringExpenses: [],
      maintenanceRecords: [],
      valuationHistory: [],
      settings: null,
    };
    mockFiles.set('/test/full.json', JSON.stringify(importData));

    await ImportService.importReplace('/test/full.json');

    // Verify asset was imported with all fields
    const assets = await AssetRepository.getAll();
    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe('MacBook');
    expect(assets[0].expectedLifespanMonths).toBe(36);
    expect(assets[0].residualValue).toBe(3000);
    expect(assets[0].currentValuation).toBe(12000);
  });
});

// ─── Backup Service Tests ───
describe('BackupService', () => {
  test('createBackup: creates backup file when db exists', async () => {
    // Simulate db file
    mockFiles.set('/mock/documents/SQLite/worthbase.db', 'database content');

    await BackupService.createBackup();

    // Verify a backup file was created
    let backupCount = 0;
    for (const key of mockFiles.keys()) {
      if (key.includes('backups/') && key.includes('worthbase_') && key.endsWith('.db')) {
        backupCount++;
      }
    }
    expect(backupCount).toBeGreaterThanOrEqual(1);
  });

  test('createBackup: does nothing when db file does not exist', async () => {
    // Don't set the db file
    await BackupService.createBackup();

    let backupCount = 0;
    for (const key of mockFiles.keys()) {
      if (key.includes('backups/')) backupCount++;
    }
    expect(backupCount).toBe(0);
  });

  test('listBackups: returns empty list when no backups exist', async () => {
    const result = await BackupService.listBackups();
    expect(result).toEqual([]);
  });

  test('listBackups: returns sorted backup file names', async () => {
    // Simulate backup files
    mockFiles.set('/mock/documents/backups/worthbase_2025-01-01T00-00-00-000Z.db', 'backup1');
    mockFiles.set('/mock/documents/backups/worthbase_2025-03-01T00-00-00-000Z.db', 'backup2');
    mockFiles.set('/mock/documents/backups/worthbase_2025-02-01T00-00-00-000Z.db', 'backup3');
    mockFiles.set('/mock/documents/backups/not_a_backup.txt', 'ignore me');

    const result = await BackupService.listBackups();
    expect(result).toHaveLength(3);
    // Sorted in reverse (newest first)
    expect(result[0]).toContain('2025-03-01');
    expect(result[1]).toContain('2025-02-01');
    expect(result[2]).toContain('2025-01-01');
  });

  test('cleanOldBackups: keeps only MAX_BACKUPS files', async () => {
    // Create 5 backup files
    for (let i = 1; i <= 5; i++) {
      const date = `2025-0${i}-01T00-00-00-000Z`;
      mockFiles.set(`/mock/documents/backups/worthbase_${date}.db`, `backup${i}`);
    }

    await BackupService.cleanOldBackups();

    let remaining = 0;
    for (const key of mockFiles.keys()) {
      if (key.includes('backups/worthbase_')) remaining++;
    }
    // MAX_BACKUPS is 3
    expect(remaining).toBe(3);
  });

  test('restoreFromBackup: copies backup to db path', async () => {
    mockFiles.set('/mock/documents/backups/worthbase_2025-06-01T00-00-00-000Z.db', 'backup content');

    await BackupService.restoreFromBackup('worthbase_2025-06-01T00-00-00-000Z.db');

    // Verify the db file was overwritten
    const dbContent = mockFiles.get('/mock/documents/SQLite/worthbase.db');
    expect(dbContent).toBe('backup content');
  });
});
