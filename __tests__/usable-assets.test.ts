/// <reference types="jest" />

/**
 * WorthBase (家底) - Future Usable Assets Tests
 *
 * 覆盖 openspec/changes/future-usable-assets：
 *  - cash_flows 仓储（CRUD + 生效月过滤 + 非法值回落）
 *  - 账户流动性分桶（可用 / 受限 / 负债）
 *  - 定期存款到期日门控
 *  - UsableAssetsCalculator：指定日期 → 可用金额
 *  - 现金流月度归一化（月薪 / 季度奖 / 年终奖）
 *  - 现金流感知预测（含负残差、三态）
 *  - migration v11 从 v10 老库升级
 */

import initSqlJs from 'sql.js';

// Mutable holder so the mocked getDatabase can access the current DB instance.
const dbHolder: { current: any } = { current: null };

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
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { AssetRepository } from '@/db/asset-repository';
import { CashFlowRepository } from '@/db/cash-flow-repository';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import { classifyAccount, bucketAccounts, depositsMaturingBy } from '@/engine/accountBuckets';
import { CashFlowCalculator } from '@/engine/CashFlowCalculator';
import { UsableAssetsCalculator } from '@/engine/UsableAssetsCalculator';
import { NetWorthCalculator } from '@/engine/NetWorthCalculator';
import { ProjectionCalculator } from '@/engine/ProjectionCalculator';
import type { MonthlyNetInflow } from '@/engine/CashFlowCalculator';
import { runMigrations, getDbVersion } from '@/db/migrations';
import { toMonthlyAmount } from '@/engine/RecurringExpenseCalculator';
import { addMonths, monthDiff, monthRange, monthsAfter } from '@/utils/months';
import {
  AccountType,
  AmortizationType,
  AssetCategory,
  AssetStatus,
  CashFlowKind,
  ExpenseFrequency,
} from '@/types/enums';
import { initMockDatabase, resetMockDatabase, getMockDb } from './helpers/mock-database';

const TODAY = '2026-11-08';

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

// ─── Helpers ───

async function makeAccount(
  name: string,
  type: AccountType,
  balance: number,
  maturityDate: string | null = null
) {
  const account = await AccountRepository.create({
    name,
    type,
    icon: null,
    sortOrder: 0,
    maturityDate,
  });
  await BalanceSnapshotRepository.create({
    accountId: account.id,
    balance,
    snapshotDate: TODAY,
  });
  return account;
}

async function makeCashFlow(overrides: Partial<Parameters<typeof CashFlowRepository.create>[0]> = {}) {
  return CashFlowRepository.create({
    kind: CashFlowKind.INCOME,
    name: '月薪',
    amount: 20000,
    frequency: ExpenseFrequency.MONTHLY,
    effectiveFrom: '2026-01',
    effectiveTo: null,
    note: null,
    ...overrides,
  });
}

/** 常量月度净流量的假求值器，让预测测试完全不碰数据库 */
function fakeCashFlow(netPerMonth: number): MonthlyNetInflow {
  return {
    breakdown: (month) => ({
      month,
      income: Math.max(0, netPerMonth),
      householdExpense: Math.max(0, -netPerMonth),
      assetExpense: 0,
      net: netPerMonth,
    }),
    net: () => netPerMonth,
  };
}

// ═══════════════════════════════════════════════
// 月份运算（现金流口径的地基）
// ═══════════════════════════════════════════════
describe('month arithmetic', () => {
  test('addMonths 跨年且不依赖 Date', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
    expect(addMonths('2026-11', 12)).toBe('2027-11');
  });

  test('monthDiff 有符号', () => {
    expect(monthDiff('2026-11', '2027-02')).toBe(3);
    expect(monthDiff('2027-02', '2026-11')).toBe(-3);
    expect(monthDiff('2026-11', '2026-11')).toBe(0);
  });

  test('monthsAfter 排除起始月、包含目标月', () => {
    expect(monthsAfter('2026-11', '2027-02')).toEqual(['2026-12', '2027-01', '2027-02']);
    expect(monthsAfter('2026-11', '2026-11')).toEqual([]);
    expect(monthsAfter('2026-11', '2026-10')).toEqual([]);
  });

  test('monthRange 两端含', () => {
    expect(monthRange('2026-11', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  test('非法输入不抛错', () => {
    expect(addMonths('nonsense', 1)).toBe('nonsense');
    expect(monthDiff('nonsense', '2026-11')).toBe(0);
    expect(monthRange('2026-13', '2027-01')).toEqual([]);
  });
});

// ═══════════════════════════════════════════════
// cash_flows 仓储
// ═══════════════════════════════════════════════
describe('CashFlowRepository', () => {
  test('create 生成 id 与 createdAt，默认值归一', async () => {
    const flow = await makeCashFlow();
    expect(flow.id).toBeTruthy();
    expect(flow.createdAt).toBeTruthy();
    expect(flow.kind).toBe(CashFlowKind.INCOME);
    expect(flow.effectiveTo).toBeNull();
  });

  test('getAll 返回全部条目', async () => {
    await makeCashFlow({ name: '月薪' });
    await makeCashFlow({ name: '房租', kind: CashFlowKind.EXPENSE, amount: 4500 });
    const all = await CashFlowRepository.getAll();
    expect(all).toHaveLength(2);
  });

  test('getByKind 按方向过滤', async () => {
    await makeCashFlow({ name: '月薪' });
    await makeCashFlow({ name: '房租', kind: CashFlowKind.EXPENSE, amount: 4500 });
    expect(await CashFlowRepository.getByKind(CashFlowKind.INCOME)).toHaveLength(1);
    expect(await CashFlowRepository.getByKind(CashFlowKind.EXPENSE)).toHaveLength(1);
  });

  test('getEffectiveForMonth 生效区间两端含', async () => {
    await makeCashFlow({ name: '房租', kind: CashFlowKind.EXPENSE, effectiveFrom: '2026-01', effectiveTo: '2026-06' });

    expect(await CashFlowRepository.getEffectiveForMonth('2026-01')).toHaveLength(1); // 起始月含
    expect(await CashFlowRepository.getEffectiveForMonth('2026-06')).toHaveLength(1); // 结束月含
    expect(await CashFlowRepository.getEffectiveForMonth('2026-07')).toHaveLength(0); // 次月起不含
    expect(await CashFlowRepository.getEffectiveForMonth('2025-12')).toHaveLength(0); // 起始月前不含
  });

  test('effective_to 为 null 表示持续中', async () => {
    await makeCashFlow({ name: '月薪', effectiveFrom: '2026-01', effectiveTo: null });
    expect(await CashFlowRepository.getEffectiveForMonth('2030-01')).toHaveLength(1);
  });

  test('未来生效的条目当月不计入', async () => {
    await makeCashFlow({ name: '新工作', effectiveFrom: '2027-03' });
    expect(await CashFlowRepository.getEffectiveForMonth('2026-11')).toHaveLength(0);
    expect(await CashFlowRepository.getEffectiveForMonth('2027-03')).toHaveLength(1);
  });

  test('update 可改金额，显式 null 清除结束月', async () => {
    const flow = await makeCashFlow({ amount: 4500, effectiveTo: '2026-12' });
    await CashFlowRepository.update(flow.id, { amount: 5000 });
    expect((await CashFlowRepository.getById(flow.id))?.amount).toBe(5000);

    await CashFlowRepository.update(flow.id, { effectiveTo: null });
    expect((await CashFlowRepository.getById(flow.id))?.effectiveTo).toBeNull();
  });

  test('delete 移除条目', async () => {
    const flow = await makeCashFlow();
    await CashFlowRepository.delete(flow.id);
    expect(await CashFlowRepository.getAll()).toHaveLength(0);
  });

  test('endCashFlow 写入结束月', async () => {
    const flow = await makeCashFlow();
    await CashFlowRepository.endCashFlow(flow.id, '2027-06');
    expect((await CashFlowRepository.getById(flow.id))?.effectiveTo).toBe('2027-06');
  });

  test('非法 kind / frequency 回落而非抛错', async () => {
    const db = getMockDb();
    await db.runAsync(
      `INSERT INTO cash_flows (id, kind, name, amount, frequency, effective_from, effective_to, note, created_at)
       VALUES ('weird', 'banana', '怪数据', 100, 'weekly', '2026-01', NULL, NULL, '2026-01-01T00:00:00Z');`
    );
    const all = await CashFlowRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].kind).toBe(CashFlowKind.EXPENSE); // 回落支出
    expect(all[0].frequency).toBe(ExpenseFrequency.MONTHLY); // 回落按月
  });
});

// ═══════════════════════════════════════════════
// 月度归一化
// ═══════════════════════════════════════════════
describe('cash flow monthly normalization', () => {
  test('月薪 ÷1、季度奖 ÷3、年终奖 ÷12', () => {
    expect(toMonthlyAmount({ amount: 20000, frequency: ExpenseFrequency.MONTHLY })).toBe(20000);
    expect(toMonthlyAmount({ amount: 15000, frequency: ExpenseFrequency.QUARTERLY })).toBe(5000);
    expect(toMonthlyAmount({ amount: 60000, frequency: ExpenseFrequency.YEARLY })).toBe(5000);
  });

  test('收入与支出共用同一条折算规则，相抵为 0', async () => {
    await makeCashFlow({ kind: CashFlowKind.INCOME, amount: 12000, frequency: ExpenseFrequency.YEARLY });
    await makeCashFlow({ kind: CashFlowKind.EXPENSE, name: '人寿险', amount: 12000, frequency: ExpenseFrequency.YEARLY });
    expect(await CashFlowCalculator.getMonthlyNetInflow('2026-11')).toBe(0);
  });

  test('非法频率按按月处理', () => {
    expect(toMonthlyAmount({ amount: 3000, frequency: 'weekly' as ExpenseFrequency })).toBe(3000);
  });

  test('资产附属支出与家庭支出一同计入净流出，且不重复', async () => {
    // 资产附属：车险 ¥3600/年 → ¥300/月
    const asset = await AssetRepository.create({
      name: '轿车',
      category: AssetCategory.VEHICLE,
      purchaseDate: '2024-01-01',
      purchasePrice: 200000,
      amortizationType: AmortizationType.NO_AMORTIZATION,
      expectedLifespanMonths: null,
      residualValue: null,
      valuationTracking: false,
      currentValuation: null,
      usageTracking: false,
      initialUseCount: 0,
      status: AssetStatus.ACTIVE,
      sellDate: null,
      sellPrice: null,
      weightGrams: null,
      imagePath: null,
      icon: null,
    });
    await RecurringExpenseRepository.create({
      assetId: asset.id,
      name: '车险',
      amount: 3600,
      frequency: ExpenseFrequency.YEARLY,
      effectiveFrom: '2026-01',
      effectiveTo: null,
    });
    // 家庭：房租 ¥4500/月
    await makeCashFlow({ kind: CashFlowKind.EXPENSE, name: '房租', amount: 4500 });
    // 收入：月薪 ¥20000/月
    await makeCashFlow({ kind: CashFlowKind.INCOME, name: '月薪', amount: 20000 });

    const breakdown = await CashFlowCalculator.getMonthlyBreakdown('2026-11');
    expect(breakdown.income).toBe(20000);
    expect(breakdown.householdExpense).toBe(4500);
    expect(breakdown.assetExpense).toBe(300);
    expect(breakdown.net).toBe(20000 - 4500 - 300);
  });

  test('accumulate 不含当前月', async () => {
    await makeCashFlow({ kind: CashFlowKind.INCOME, amount: 10000 });
    const result = await CashFlowCalculator.accumulate('2026-11', '2027-02');
    expect(result.months).toBe(3); // 2026-12, 2027-01, 2027-02
    expect(result.total).toBe(30000);
    expect(result.monthlyAverage).toBe(10000);
  });

  test('accumulate 目标月不晚于当前月时为 0', async () => {
    await makeCashFlow({ kind: CashFlowKind.INCOME, amount: 10000 });
    expect(await CashFlowCalculator.accumulate('2026-11', '2026-11')).toEqual({ total: 0, months: 0, monthlyAverage: 0 });
    expect(await CashFlowCalculator.accumulate('2026-11', '2026-10')).toEqual({ total: 0, months: 0, monthlyAverage: 0 });
  });

  test('accumulate 逐月判定生效区间，不做简单乘法', async () => {
    // 只在 2027-01 生效一个月的一次性条目（用生效区间表达）
    await makeCashFlow({ kind: CashFlowKind.INCOME, name: '一次性奖金', amount: 50000, effectiveFrom: '2027-01', effectiveTo: '2027-01' });
    const result = await CashFlowCalculator.accumulate('2026-11', '2027-03');
    // 2026-12, 2027-01, 2027-02, 2027-03 共 4 个月，但只有 2027-01 有生效条目
    expect(result.months).toBe(4);
    expect(result.total).toBe(50000);
  });

  test('代表性月度净流入用 12 个月摊平年终奖', async () => {
    await makeCashFlow({ kind: CashFlowKind.INCOME, name: '年终奖', amount: 120000, frequency: ExpenseFrequency.YEARLY, effectiveFrom: '2026-01' });
    // 120000 ÷ 12 = 10000/月，12 个月均值仍是 10000
    expect(await CashFlowCalculator.getRepresentativeMonthlyInflow('2026-11')).toBe(10000);
  });
});

// ═══════════════════════════════════════════════
// 账户流动性分桶
// ═══════════════════════════════════════════════
describe('account liquidity buckets', () => {
  test('公积金 → 受限', async () => {
    const account = await makeAccount('公积金', AccountType.PROVIDENT_FUND, 80000);
    expect(classifyAccount(account, TODAY)).toBe('restricted');
  });

  test('银行卡无到期日 → 可用', async () => {
    const account = await makeAccount('工资卡', AccountType.BANK_CARD, 50000);
    expect(classifyAccount(account, TODAY)).toBe('available');
  });

  test('信用卡与贷款 → 负债', async () => {
    const card = await makeAccount('信用卡', AccountType.CREDIT_CARD, -5000);
    const loan = await makeAccount('房贷', AccountType.LOAN, -800000);
    expect(classifyAccount(card, TODAY)).toBe('liability');
    expect(classifyAccount(loan, TODAY)).toBe('liability');
  });

  test('未到期的定期 → 受限；到期当天及之后 → 可用', async () => {
    const account = await makeAccount('三年定期', AccountType.BANK_CARD, 100000, '2027-06-30');
    expect(classifyAccount(account, '2026-11-08')).toBe('restricted');
    expect(classifyAccount(account, '2027-06-29')).toBe('restricted');
    expect(classifyAccount(account, '2027-06-30')).toBe('available'); // 含等于
    expect(classifyAccount(account, '2027-07-01')).toBe('available');
  });

  test('bucketAccounts 三分且互斥', async () => {
    const available = await makeAccount('工资卡', AccountType.BANK_CARD, 50000);
    const restricted = await makeAccount('公积金', AccountType.PROVIDENT_FUND, 80000);
    const liability = await makeAccount('信用卡', AccountType.CREDIT_CARD, -5000);

    const buckets = bucketAccounts([available, restricted, liability], TODAY);
    expect(buckets.available.map((a) => a.id)).toEqual([available.id]);
    expect(buckets.restricted.map((a) => a.id)).toEqual([restricted.id]);
    expect(buckets.liability.map((a) => a.id)).toEqual([liability.id]);
  });

  test('未知类型回落 available，不抛错', () => {
    const weird = {
      id: 'x', name: 'x', type: 'banana' as AccountType, icon: null, sortOrder: 0,
      maturityDate: null, deletedAt: null, createdAt: '', updatedAt: '',
    };
    expect(classifyAccount(weird, TODAY)).toBe('available');
  });

  test('depositsMaturingBy 只挑「因到期日而受限」的账户', async () => {
    const deposit = await makeAccount('定期', AccountType.BANK_CARD, 100000, '2027-06-30');
    const provident = await makeAccount('公积金', AccountType.PROVIDENT_FUND, 80000);
    const card = await makeAccount('信用卡', AccountType.CREDIT_CARD, -5000);
    const current = await makeAccount('活期', AccountType.BANK_CARD, 50000);

    const accounts = [deposit, provident, card, current];
    // 公积金永不解锁；已到期/无到期日的不算「将要到期」
    expect(depositsMaturingBy(accounts, '2040-12-31', TODAY).map((a) => a.id)).toEqual([deposit.id]);
    // 目标日期早于到期日 → 空
    expect(depositsMaturingBy(accounts, '2027-01-31', TODAY)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════
// 净资产分桶（总额不变是硬约束）
// ═══════════════════════════════════════════════
describe('NetWorthCalculator liquidity split', () => {
  test('净资产总额 = 可用 + 受限 + 负债 + 估值，且 liquidAssets 保持不变', async () => {
    await makeAccount('工资卡', AccountType.BANK_CARD, 50000);
    await makeAccount('公积金', AccountType.PROVIDENT_FUND, 80000);
    await makeAccount('信用卡', AccountType.CREDIT_CARD, -5000);

    const result = await NetWorthCalculator.calculate(new Date('2026-11-08T00:00:00Z'));

    expect(result.availableLiquid).toBe(50000);
    expect(result.restrictedLiquid).toBe(80000);
    expect(result.liabilities).toBe(-5000);
    expect(result.liquidAssets).toBe(125000); // 与分桶前的口径完全一致
    expect(result.assetValuations).toBe(0);
    expect(result.netWorth).toBe(125000);
    expect(result.netWorth).toBe(result.availableLiquid + result.restrictedLiquid + result.liabilities + result.assetValuations);
  });

  test('未到期的定期算「受限」，到期后转「可用」——与账户页分组同口径', async () => {
    await makeAccount('三年定期', AccountType.BANK_CARD, 100000, '2027-06-30');

    const before = await NetWorthCalculator.calculate(new Date('2026-11-08T00:00:00Z'));
    expect(before.availableLiquid).toBe(0);
    expect(before.restrictedLiquid).toBe(100000);
    expect(before.netWorth).toBe(100000);

    const onMaturity = await NetWorthCalculator.calculate(new Date('2027-06-30T00:00:00Z'));
    expect(onMaturity.availableLiquid).toBe(100000);
    expect(onMaturity.restrictedLiquid).toBe(0);
    // 分桶变了，总额一分没变
    expect(onMaturity.netWorth).toBe(100000);
  });

  test('没有任何账户时各项为 0', async () => {
    const result = await NetWorthCalculator.calculate(new Date('2026-11-08T00:00:00Z'));
    expect(result).toMatchObject({
      liquidAssets: 0, availableLiquid: 0, restrictedLiquid: 0, liabilities: 0,
      assetValuations: 0, netWorth: 0,
    });
  });

  test('buildTrendSeries 结转余额并回落购入价', async () => {
    const account = await makeAccount('工资卡', AccountType.BANK_CARD, 10000);
    await BalanceSnapshotRepository.create({ accountId: account.id, balance: 20000, snapshotDate: '2026-12-01' });

    const accounts = await AccountRepository.getAll();
    const series = NetWorthCalculator.buildTrendSeries({
      accounts,
      trackedAssets: [],
      valuationHistories: new Map(),
      dates: ['2026-11-08', '2026-12-01', '2027-01-01'],
      snapshots: await BalanceSnapshotRepository.getAllSnapshotsChronological(),
    });

    expect(series.get('2026-11-08')?.netWorth).toBe(10000);
    expect(series.get('2026-12-01')?.netWorth).toBe(20000);
    // 当天没快照 → 结转最近一次余额，而不是算成 0
    expect(series.get('2027-01-01')?.netWorth).toBe(20000);
  });
});

// ═══════════════════════════════════════════════
// 指定日期 → 可用金额
// ═══════════════════════════════════════════════
describe('UsableAssetsCalculator', () => {
  test('到期日前不计入，到期日起计入', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 50000);
    await makeAccount('三年定期', AccountType.BANK_CARD, 100000, '2027-06-30');

    const before = await UsableAssetsCalculator.calculate('2027-01-31', TODAY);
    expect(before.availableLiquid).toBe(50000);
    expect(before.maturedDeposits).toBe(0);
    expect(before.total).toBe(50000);

    const onMaturity = await UsableAssetsCalculator.calculate('2027-06-30', TODAY);
    expect(onMaturity.maturedDeposits).toBe(100000);
    expect(onMaturity.total).toBe(150000);

    const after = await UsableAssetsCalculator.calculate('2027-07-31', TODAY);
    expect(after.total).toBe(150000);
  });

  test('受限账户永不解锁，无论目标日期多远', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 50000);
    await makeAccount('公积金', AccountType.PROVIDENT_FUND, 80000);

    const result = await UsableAssetsCalculator.calculate('2040-12-31', TODAY);
    expect(result.total).toBe(50000);
  });

  test('负债账户不计入', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 50000);
    await makeAccount('信用卡', AccountType.CREDIT_CARD, -5000);

    const result = await UsableAssetsCalculator.calculate('2027-01-31', TODAY);
    expect(result.total).toBe(50000);
  });

  test('现金流累计到目标日（当前月不计入）', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 50000);
    await makeCashFlow({ kind: CashFlowKind.INCOME, name: '月薪', amount: 20000, effectiveFrom: '2026-01' });
    await makeCashFlow({ kind: CashFlowKind.EXPENSE, name: '房租', amount: 4500, effectiveFrom: '2026-01' });

    // 资产附属支出 ¥800/月
    const asset = await AssetRepository.create({
      name: '轿车', category: AssetCategory.VEHICLE, purchaseDate: '2024-01-01',
      purchasePrice: 200000, amortizationType: AmortizationType.NO_AMORTIZATION,
      expectedLifespanMonths: null, residualValue: null, valuationTracking: false,
      currentValuation: null, usageTracking: false, initialUseCount: 0,
      status: AssetStatus.ACTIVE, sellDate: null, sellPrice: null,
      weightGrams: null, imagePath: null, icon: null,
    });
    await RecurringExpenseRepository.create({
      assetId: asset.id, name: '车险', amount: 800,
      frequency: ExpenseFrequency.MONTHLY, effectiveFrom: '2026-01', effectiveTo: null,
    });

    const result = await UsableAssetsCalculator.calculate('2027-02-28', TODAY);
    // 2026-12, 2027-01, 2027-02 共 3 个月 × (20000 − 4500 − 800)
    expect(result.monthsCounted).toBe(3);
    expect(result.netCashFlow).toBe(14700 * 3);
    expect(result.total).toBe(50000 + 44100);
  });

  test('目标日在当月内 → 现金流为 0', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 50000);
    await makeCashFlow({ kind: CashFlowKind.INCOME, amount: 20000, effectiveFrom: '2026-01' });

    const result = await UsableAssetsCalculator.calculate('2026-11-30', TODAY);
    expect(result.monthsCounted).toBe(0);
    expect(result.netCashFlow).toBe(0);
    expect(result.total).toBe(50000);
  });

  test('未来才生效的收入不计入更早的目标日', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 50000);
    await makeCashFlow({ kind: CashFlowKind.INCOME, name: '新工作', amount: 30000, effectiveFrom: '2027-03' });

    const beforeEffective = await UsableAssetsCalculator.calculate('2027-02-28', TODAY);
    expect(beforeEffective.netCashFlow).toBe(0);

    const afterEffective = await UsableAssetsCalculator.calculate('2027-03-31', TODAY);
    expect(afterEffective.netCashFlow).toBe(30000);
  });

  test('没有任何现金流记录时净额为 0', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 50000);
    const result = await UsableAssetsCalculator.calculate('2030-01-31', TODAY);
    expect(result.netCashFlow).toBe(0);
    expect(result.total).toBe(50000);
  });

  test('结果回填 targetDate', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 1000);
    const result = await UsableAssetsCalculator.calculate('2028-05-20', TODAY);
    expect(result.targetDate).toBe('2028-05-20');
  });
});

// ═══════════════════════════════════════════════
// 现金流感知预测
// ═══════════════════════════════════════════════
describe('ProjectionCalculator with cash flows', () => {
  // 回归的 x 轴是「天数 ÷ 30.44」，不是整数月，所以斜率不会正好等于每月的名义增量
  // （31 天的月份算 1.018 个月）。下面对斜率一律用宽松容差断言。

  // 与既有 engine.test.ts 保持一致的 2025 年数据，用于验证向后兼容
  const rising2025 = [
    { date: '2025-01-01', value: 50000 },
    { date: '2025-02-01', value: 60000 },
    { date: '2025-03-01', value: 70000 },
    { date: '2025-04-01', value: 80000 },
    { date: '2025-05-01', value: 90000 },
    { date: '2025-06-01', value: 100000 },
  ];

  // 锚点必须落在 TODAY(2026-11) 所在月，否则「未来 12 个月」会跨过现金流的生效边界
  const flat = [
    { date: '2026-06-01', value: 300000 },
    { date: '2026-07-01', value: 300000 },
    { date: '2026-08-01', value: 300000 },
    { date: '2026-09-01', value: 300000 },
    { date: '2026-10-01', value: 300000 },
    { date: '2026-11-01', value: 300000 },
  ];
  const declining = [
    { date: '2026-06-01', value: 315000 },
    { date: '2026-07-01', value: 312000 },
    { date: '2026-08-01', value: 309000 },
    { date: '2026-09-01', value: 306000 },
    { date: '2026-10-01', value: 303000 },
    { date: '2026-11-01', value: 300000 },
  ];

  test('没有现金流时与改动前完全一致（向后兼容）', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail(rising2025, 150000, null);
    expect(detail.state).toBe('achievable');
    expect(detail.achievementDate).toMatch(/^2025-(10|11)-/);
    expect(detail.knownMonthlyInflow).toBe(0);
    expect(detail.residualMonthlyGrowth).toBeCloseTo(10000, -3);
    // 50000 ÷ ≈10116 ≈ 4.94 个月
    expect(detail.monthsNeeded).toBeCloseTo(5, 0);
    // estimateAchievementDate 与旧实现同源
    expect(ProjectionCalculator.estimateAchievementDate(rising2025, 150000, null))
      .toBe(detail.achievementDate);
  });

  test('历史持平但现金流为正 → 给得出日期', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail(flat, 500000, fakeCashFlow(10000));
    expect(detail.state).toBe('achievable');
    expect(detail.residualMonthlyGrowth).toBeCloseTo(0, 5);
    expect(detail.knownMonthlyInflow).toBe(10000);
    expect(detail.monthlyGrowth).toBeCloseTo(10000, 5);
    expect(detail.monthsNeeded).toBeCloseTo(20, 5);
  });

  test('负残差 + 正现金流 → 用净值推进，不再短路成 null', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail(declining, 500000, fakeCashFlow(12000));
    expect(detail.state).toBe('achievable');
    expect(detail.residualMonthlyGrowth).toBeCloseTo(-3000, -2);
    expect(detail.knownMonthlyInflow).toBe(12000);
    expect(detail.monthlyGrowth).toBeCloseTo(9000, -2);
    // 200000 ÷ ≈8965 ≈ 22.3 个月
    expect(detail.monthsNeeded).toBeCloseTo(200000 / 9000, 0);
  });

  test('总 run-rate ≤ 0 → unreachable，但 gap 与月度净流入仍给出', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail(declining, 500000, fakeCashFlow(1000));
    expect(detail.state).toBe('unreachable');
    expect(detail.achievementDate).toBeNull();
    expect(detail.monthsNeeded).toBeNull();
    expect(detail.gap).toBe(200000);
    expect(detail.monthlyGrowth).toBeCloseTo(-2000, -2);
  });

  test('历史持平且无现金流 → unreachable（等价于改动前的 null）', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail(flat, 500000, null);
    expect(detail.state).toBe('unreachable');
    expect(detail.achievementDate).toBeNull();
    expect(ProjectionCalculator.estimateAchievementDate(flat, 500000, null)).toBeNull();
  });

  test('没有任何数据点 → insufficient-data，不猜', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail([], 100000, fakeCashFlow(10000));
    expect(detail.state).toBe('insufficient-data');
    expect(detail.achievementDate).toBeNull();
    expect(detail.currentValue).toBe(0);
  });

  test('单个数据点也能预测（残差为 0，靠现金流推进）', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail(
      [{ date: '2026-11-01', value: 100000 }],
      130000,
      fakeCashFlow(10000)
    );
    expect(detail.state).toBe('achievable');
    expect(detail.dataPointsUsed).toBe(1);
    expect(detail.residualMonthlyGrowth).toBe(0);
    expect(detail.monthsNeeded).toBeCloseTo(3, 5);
  });

  test('已达成目标 → achieved', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail(rising2025, 90000, fakeCashFlow(10000));
    expect(detail.state).toBe('achieved');
    expect(detail.gap).toBe(0);
    expect(detail.achievementDate).toBeNull();
  });

  test('estimateAchievementDate 与 detail 同源', () => {
    const detail = ProjectionCalculator.estimateProjectionDetail(flat, 500000, fakeCashFlow(10000));
    expect(ProjectionCalculator.estimateAchievementDate(flat, 500000, fakeCashFlow(10000)))
      .toBe(detail.achievementDate);
  });

  test('withCashFlows 读取真实的 cash_flows 表', async () => {
    await makeAccount('活期', AccountType.BANK_CARD, 300000);
    await makeCashFlow({ kind: CashFlowKind.INCOME, name: '月薪', amount: 25000, effectiveFrom: '2026-01' });
    await makeCashFlow({ kind: CashFlowKind.EXPENSE, name: '房租', amount: 5000, effectiveFrom: '2026-01' });

    const detail = await ProjectionCalculator.withCashFlows(flat, 500000);
    expect(detail.knownMonthlyInflow).toBe(20000);
    expect(detail.state).toBe('achievable');
    // 200000 ÷ 20000 = 10 个月
    expect(detail.monthsNeeded).toBeCloseTo(10, 5);
  });
});

// ═══════════════════════════════════════════════
// migration v11：v10 老库升级
// ═══════════════════════════════════════════════
describe('migration v11', () => {
  /** 最小 SQLiteDatabase 适配器，直接跑在裸 sql.js 上 */
  function adapter(raw: any) {
    return {
      async execAsync(sql: string) { raw.run(sql); },
      async runAsync(sql: string, ...params: (string | number | null)[]) { raw.run(sql, params as never); },
      async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null> {
        const stmt = raw.prepare(sql);
        try {
          stmt.bind(params as never);
          return stmt.step() ? (stmt.getAsObject() as T) : null;
        } finally { stmt.free(); }
      },
      async getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]> {
        const stmt = raw.prepare(sql);
        try {
          stmt.bind(params as never);
          const out: T[] = [];
          while (stmt.step()) out.push(stmt.getAsObject() as T);
          return out;
        } finally { stmt.free(); }
      },
    } as any;
  }

  /** 构造一个 v10 状态的库：accounts 无 maturity_date，没有 cash_flows 表 */
  function makeV10Database(raw: any) {
    raw.run(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE db_version (
        version INTEGER PRIMARY KEY NOT NULL,
        description TEXT,
        applied_at TEXT NOT NULL
      );
    `);
    for (let v = 1; v <= 10; v++) {
      raw.run(`INSERT INTO db_version (version, description, applied_at) VALUES (${v}, 'v${v}', '2026-01-01T00:00:00Z');`);
    }
    raw.run(`INSERT INTO accounts (id, name, type, icon, sort_order, deleted_at, created_at, updated_at)
             VALUES ('old-1', '老工资卡', 'bank_card', NULL, 0, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');`);
  }

  test('v10 → v11：加列、建表、老数据无损', async () => {
    const SQL = await initSqlJs();
    const raw = new SQL.Database();
    makeV10Database(raw);

    await runMigrations(adapter(raw));

    expect(await getDbVersion(adapter(raw))).toBe(11);

    const accounts = raw.exec('SELECT id, name, maturity_date FROM accounts;');
    expect(accounts[0].values).toEqual([['old-1', '老工资卡', null]]);

    const cashFlows = raw.exec('SELECT COUNT(*) FROM cash_flows;');
    expect(cashFlows[0].values[0][0]).toBe(0);

    raw.close();
  });

  test('重复执行幂等', async () => {
    const SQL = await initSqlJs();
    const raw = new SQL.Database();
    makeV10Database(raw);

    await runMigrations(adapter(raw));
    await runMigrations(adapter(raw)); // 第二次应被 currentVersion >= CURRENT_VERSION 短路
    await runMigrations(adapter(raw));

    expect(await getDbVersion(adapter(raw))).toBe(11);
    expect(raw.exec('SELECT COUNT(*) FROM accounts;')[0].values[0][0]).toBe(1);
    expect(raw.exec('SELECT COUNT(*) FROM cash_flows;')[0].values[0][0]).toBe(0);

    raw.close();
  });

  test('v11 migration 自身可重入（列已存在时不再 ALTER）', async () => {
    const SQL = await initSqlJs();
    const raw = new SQL.Database();
    makeV10Database(raw);
    // 模拟上次迁移跑了一半：列已加上，但 db_version 还没记到 11
    raw.run(`ALTER TABLE accounts ADD COLUMN maturity_date TEXT;`);

    await expect(runMigrations(adapter(raw))).resolves.not.toThrow();
    expect(await getDbVersion(adapter(raw))).toBe(11);

    raw.close();
  });

  test('全新库（CREATE_TABLES_SQL）已经是 v11 形状', async () => {
    // initMockDatabase 跑的就是 schema.ts —— 新装用户不经过 migration
    const db = getMockDb();
    const account = await AccountRepository.create({
      name: '新账户', type: AccountType.BANK_CARD, icon: null, sortOrder: 0, maturityDate: '2027-06-30',
    });
    expect(account.maturityDate).toBe('2027-06-30');

    await CashFlowRepository.create({
      kind: CashFlowKind.EXPENSE, name: '房租', amount: 4500,
      frequency: ExpenseFrequency.MONTHLY, effectiveFrom: '2026-01', effectiveTo: null, note: null,
    });
    expect(await CashFlowRepository.getAll()).toHaveLength(1);

    const row = await db.getFirstAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='cash_flows';`
    );
    expect(row?.name).toBe('cash_flows');
  });
});
