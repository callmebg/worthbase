/// <reference types="jest" />

/**
 * WorthBase (家底) - Store Unit Tests
 * Tests Zustand stores with mocked repositories to verify state mutations.
 */

import { useAccountStore } from '@/stores/account-store';
import { useAssetStore } from '@/stores/asset-store';
import { useSettingsStore } from '@/stores/settings-store';
import { AccountType, AssetCategory, AmortizationType, AssetStatus } from '@/types/enums';
import type { Account, Asset } from '@/types/models';

// ─── Mock Repositories ───
jest.mock('@/db/account-repository', () => ({
  AccountRepository: {
    getAll: jest.fn(),
    getAllLatestBalances: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/db/balance-snapshot-repository', () => ({
  BalanceSnapshotRepository: {
    create: jest.fn(),
    getAllSnapshotDates: jest.fn(),
    getBalancesForDate: jest.fn(),
  },
}));

jest.mock('@/db/asset-repository', () => ({
  AssetRepository: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    markRetired: jest.fn(),
    recordSale: jest.fn(),
  },
}));

jest.mock('@/db/valuation-repository', () => ({
  ValuationRepository: {
    create: jest.fn(),
    getByAsset: jest.fn(),
  },
}));

jest.mock('@/db/settings-repository', () => ({
  SettingsRepository: {
    loadAll: jest.fn(),
    saveAll: jest.fn(),
  },
}));

import { AccountRepository } from '@/db/account-repository';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { AssetRepository } from '@/db/asset-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { SettingsRepository } from '@/db/settings-repository';

// ─── Helper to create test data ───
function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: '微信支付',
    type: AccountType.WECHAT,
    icon: null,
    sortOrder: 1,
    deletedAt: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    name: 'iPhone 15',
    category: AssetCategory.ELECTRONICS,
    purchaseDate: '2025-01-15',
    purchasePrice: 7999,
    amortizationType: AmortizationType.SIMPLE_LINEAR,
    expectedLifespanMonths: null,
    residualValue: null,
    valuationTracking: false,
    currentValuation: null,
    status: AssetStatus.ACTIVE,
    sellDate: null,
    sellPrice: null,
    imagePath: null,
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    ...overrides,
  };
}

// ─── Reset stores before each test ───
beforeEach(() => {
  jest.clearAllMocks();
  useAccountStore.setState({ accounts: [], balances: new Map(), isLoading: false });
  useAssetStore.setState({ assets: [], statusFilter: 'all', isLoading: false });
  useSettingsStore.setState({
    appLockEnabled: false,
    pinHash: null,
    biometricEnabled: false,
    themeColor: '#6C5CE7',
    darkMode: 'system',
    currencySymbol: '¥',
    netWorthGoal: null,
    isLoading: false,
  });
});

// ─── Account Store Tests ───
describe('Account Store', () => {
  test('loadAccounts: loads accounts and balances from repository', async () => {
    const mockAccounts = [makeAccount(), makeAccount({ id: 'acc-2', name: '支付宝' })];
    const mockBalances = new Map([['acc-1', 5000], ['acc-2', 3000]]);
    (AccountRepository.getAll as jest.Mock).mockResolvedValue(mockAccounts);
    (AccountRepository.getAllLatestBalances as jest.Mock).mockResolvedValue(mockBalances);

    await useAccountStore.getState().loadAccounts();

    const state = useAccountStore.getState();
    expect(state.accounts).toHaveLength(2);
    expect(state.balances.get('acc-1')).toBe(5000);
    expect(state.balances.get('acc-2')).toBe(3000);
    expect(state.isLoading).toBe(false);
  });

  test('addAccount: creates account and appends to state', async () => {
    const newAccount = makeAccount({ id: 'acc-new', name: '现金' });
    (AccountRepository.create as jest.Mock).mockResolvedValue(newAccount);

    const result = await useAccountStore.getState().addAccount('现金', AccountType.CASH);

    expect(AccountRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      name: '现金',
      type: AccountType.CASH,
    }));
    expect(result.id).toBe('acc-new');
    expect(useAccountStore.getState().accounts).toHaveLength(1);
  });

  test('updateBalance: stores snapshot and updates balances map', async () => {
    useAccountStore.setState({ balances: new Map([['acc-1', 1000]]) });
    (BalanceSnapshotRepository.create as jest.Mock).mockResolvedValue({});

    await useAccountStore.getState().updateBalance('acc-1', 2500);

    expect(BalanceSnapshotRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-1',
      balance: 2500,
    }));
    expect(useAccountStore.getState().balances.get('acc-1')).toBe(2500);
  });

  test('deleteAccount: removes account and balance from state', async () => {
    useAccountStore.setState({
      accounts: [makeAccount()],
      balances: new Map([['acc-1', 1000]]),
    });
    (AccountRepository.delete as jest.Mock).mockResolvedValue({});

    await useAccountStore.getState().deleteAccount('acc-1');

    expect(AccountRepository.delete).toHaveBeenCalledWith('acc-1');
    expect(useAccountStore.getState().accounts).toHaveLength(0);
    expect(useAccountStore.getState().balances.has('acc-1')).toBe(false);
  });

  test('getTotalBalance: sums all balances', () => {
    useAccountStore.setState({
      balances: new Map([['acc-1', 500], ['acc-2', 300], ['acc-3', 200]]),
    });
    expect(useAccountStore.getState().getTotalBalance()).toBe(1000);
  });

  test('getTotalBalance: empty balances returns 0', () => {
    useAccountStore.setState({ balances: new Map() });
    expect(useAccountStore.getState().getTotalBalance()).toBe(0);
  });
});

// ─── Asset Store Tests ───
describe('Asset Store', () => {
  test('loadAssets: loads assets from repository', async () => {
    const mockAssets = [makeAsset(), makeAsset({ id: 'asset-2', name: 'MacBook' })];
    (AssetRepository.getAll as jest.Mock).mockResolvedValue(mockAssets);

    await useAssetStore.getState().loadAssets();

    expect(useAssetStore.getState().assets).toHaveLength(2);
    expect(useAssetStore.getState().isLoading).toBe(false);
  });

  test('addAsset: creates asset with ACTIVE status and prepends to list', async () => {
    const newAsset = makeAsset({ id: 'asset-new' });
    (AssetRepository.create as jest.Mock).mockResolvedValue(newAsset);

    const result = await useAssetStore.getState().addAsset({
      name: 'iPad',
      category: AssetCategory.ELECTRONICS,
      purchaseDate: '2025-03-01',
      purchasePrice: 5000,
      amortizationType: AmortizationType.SIMPLE_LINEAR,
      expectedLifespanMonths: null,
      residualValue: null,
      valuationTracking: false,
      currentValuation: null,
      imagePath: null,
      sellDate: null,
      sellPrice: null,
    });

    expect(result.status).toBe(AssetStatus.ACTIVE);
    expect(AssetRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      status: AssetStatus.ACTIVE,
    }));
    expect(useAssetStore.getState().assets[0].id).toBe('asset-new');
  });

  test('editAsset: updates asset in state', async () => {
    const existing = makeAsset();
    useAssetStore.setState({ assets: [existing] });
    (AssetRepository.update as jest.Mock).mockResolvedValue({});

    await useAssetStore.getState().editAsset('asset-1', { name: 'iPhone 16' });

    expect(AssetRepository.update).toHaveBeenCalledWith('asset-1', { name: 'iPhone 16' });
    expect(useAssetStore.getState().assets[0].name).toBe('iPhone 16');
  });

  test('deleteAsset: removes asset from state', async () => {
    useAssetStore.setState({ assets: [makeAsset()] });
    (AssetRepository.delete as jest.Mock).mockResolvedValue({});

    await useAssetStore.getState().deleteAsset('asset-1');

    expect(useAssetStore.getState().assets).toHaveLength(0);
  });

  test('markRetired: changes status to RETIRED', async () => {
    useAssetStore.setState({ assets: [makeAsset()] });
    (AssetRepository.markRetired as jest.Mock).mockResolvedValue({});

    await useAssetStore.getState().markRetired('asset-1');

    expect(AssetRepository.markRetired).toHaveBeenCalledWith('asset-1');
    expect(useAssetStore.getState().assets[0].status).toBe(AssetStatus.RETIRED);
  });

  test('recordSale: changes status to SOLD with sell date and price', async () => {
    useAssetStore.setState({ assets: [makeAsset()] });
    (AssetRepository.recordSale as jest.Mock).mockResolvedValue({});

    await useAssetStore.getState().recordSale('asset-1', '2025-06-15', 4000);

    expect(AssetRepository.recordSale).toHaveBeenCalledWith('asset-1', '2025-06-15', 4000);
    const asset = useAssetStore.getState().assets[0];
    expect(asset.status).toBe(AssetStatus.SOLD);
    expect(asset.sellDate).toBe('2025-06-15');
    expect(asset.sellPrice).toBe(4000);
  });

  test('updateValuation: creates valuation record and updates asset', async () => {
    useAssetStore.setState({ assets: [makeAsset({ valuationTracking: true })] });
    (ValuationRepository.create as jest.Mock).mockResolvedValue({});
    (AssetRepository.update as jest.Mock).mockResolvedValue({});

    await useAssetStore.getState().updateValuation('asset-1', 5000);

    expect(ValuationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      assetId: 'asset-1',
      valuation: 5000,
    }));
    expect(AssetRepository.update).toHaveBeenCalledWith('asset-1', { currentValuation: 5000 });
    expect(useAssetStore.getState().assets[0].currentValuation).toBe(5000);
  });

  test('setStatusFilter: updates filter', () => {
    useAssetStore.getState().setStatusFilter(AssetStatus.ACTIVE);
    expect(useAssetStore.getState().statusFilter).toBe(AssetStatus.ACTIVE);
  });

  test('getFilteredAssets: returns all when filter is "all"', () => {
    const assets = [makeAsset(), makeAsset({ id: 'asset-2', status: AssetStatus.RETIRED })];
    useAssetStore.setState({ assets, statusFilter: 'all' });
    expect(useAssetStore.getState().getFilteredAssets()).toHaveLength(2);
  });

  test('getFilteredAssets: filters by status', () => {
    const assets = [
      makeAsset(),
      makeAsset({ id: 'asset-2', status: AssetStatus.RETIRED }),
      makeAsset({ id: 'asset-3', status: AssetStatus.SOLD }),
    ];
    useAssetStore.setState({ assets, statusFilter: AssetStatus.RETIRED });
    const filtered = useAssetStore.getState().getFilteredAssets();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('asset-2');
  });
});

// ─── Settings Store Tests ───
describe('Settings Store', () => {
  test('loadSettings: loads from repository and merges with defaults', async () => {
    (SettingsRepository.loadAll as jest.Mock).mockResolvedValue({
      appLockEnabled: true,
      pinHash: 'hashed_pin',
      biometricEnabled: false,
      themeColor: '#0984E3',
      darkMode: 'dark' as const,
      currencySymbol: '$',
      netWorthGoal: 500000,
    });

    await useSettingsStore.getState().loadSettings();

    const state = useSettingsStore.getState();
    expect(state.appLockEnabled).toBe(true);
    expect(state.themeColor).toBe('#0984E3');
    expect(state.netWorthGoal).toBe(500000);
    expect(state.isLoading).toBe(false);
  });

  test('update: persists changes to repository and updates state', async () => {
    (SettingsRepository.saveAll as jest.Mock).mockResolvedValue({});

    await useSettingsStore.getState().update({ netWorthGoal: 1000000 });

    expect(SettingsRepository.saveAll).toHaveBeenCalled();
    expect(useSettingsStore.getState().netWorthGoal).toBe(1000000);
  });

  test('update: merges with existing settings', async () => {
    useSettingsStore.setState({ themeColor: '#6C5CE7', currencySymbol: '¥' });
    (SettingsRepository.saveAll as jest.Mock).mockResolvedValue({});

    await useSettingsStore.getState().update({ currencySymbol: '$' });

    expect(useSettingsStore.getState().currencySymbol).toBe('$');
    expect(useSettingsStore.getState().themeColor).toBe('#6C5CE7');
  });

  test('default settings: all flags are safe defaults', () => {
    const state = useSettingsStore.getState();
    expect(state.appLockEnabled).toBe(false);
    expect(state.pinHash).toBeNull();
    expect(state.biometricEnabled).toBe(false);
    expect(state.themeColor).toBe('#6C5CE7');
    expect(state.darkMode).toBe('system');
    expect(state.currencySymbol).toBe('¥');
    expect(state.netWorthGoal).toBeNull();
  });
});
