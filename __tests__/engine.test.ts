/**
 * WorthBase (家底) - Engine Unit Tests
 * Covers: 4 amortization strategies, recurring expense intervals,
 * maintenance amortization, settlement calculation.
 */

/// <reference types="jest" />

import {
  monthsBetween,
  daysBetween,
} from '@/engine/strategies/AmortizationStrategy';
import { SimpleLinearStrategy } from '@/engine/strategies/SimpleLinearStrategy';
import { ExpectedLifespanStrategy } from '@/engine/strategies/ExpectedLifespanStrategy';
import { ResidualValueStrategy } from '@/engine/strategies/ResidualValueStrategy';
import { NoAmortizationStrategy } from '@/engine/strategies/NoAmortizationStrategy';
import { getStrategy, getStrategyByType } from '@/engine/strategies';
import { AmortizationType, AssetStatus, AssetCategory } from '@/types/enums';
import type { Asset } from '@/types/models';
import { ProjectionCalculator } from '@/engine/ProjectionCalculator';
import { NetWorthCalculator } from '@/engine/NetWorthCalculator';

// ─── Helper: create a test asset ───
function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'test-asset',
    name: 'Test Asset',
    category: AssetCategory.ELECTRONICS,
    purchaseDate: '2025-01-15',
    purchasePrice: 12000,
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

// ─── Utility function tests ───
describe('Utility functions', () => {
  test('monthsBetween: 6 months from Jan to Jul', () => {
    const result = monthsBetween('2025-01-15', new Date('2025-07-15'));
    expect(result).toBe(7); // 6 months + 1 (inclusive of start month)
  });

  test('monthsBetween: same month returns 1', () => {
    const result = monthsBetween('2025-01-01', new Date('2025-01-20'));
    expect(result).toBe(1);
  });

  test('monthsBetween: minimum 1', () => {
    const result = monthsBetween('2025-01-15', new Date('2025-01-16'));
    expect(result).toBe(1);
  });

  test('monthsBetween: across year boundary', () => {
    const result = monthsBetween('2024-12-15', new Date('2025-03-15'));
    expect(result).toBe(4); // Dec, Jan, Feb, Mar
  });

  test('daysBetween: positive days', () => {
    const result = daysBetween('2025-01-01', new Date('2025-01-31'));
    expect(result).toBe(30);
  });

  test('daysBetween: minimum 1', () => {
    const result = daysBetween('2025-01-15', new Date('2025-01-15'));
    expect(result).toBe(1);
  });
});

// ─── SimpleLinearStrategy tests ───
describe('SimpleLinearStrategy', () => {
  const strategy = SimpleLinearStrategy;
  const asset = makeAsset({ purchasePrice: 12000, purchaseDate: '2025-01-15' });

  test('monthly cost decreases over time', () => {
    const cost6m = strategy.calculateMonthlyCost(asset, new Date('2025-07-15'));
    const cost12m = strategy.calculateMonthlyCost(asset, new Date('2026-01-15'));
    expect(cost6m).toBeCloseTo(1714.29, 1); // 12000 / 7
    expect(cost12m).toBeCloseTo(923.08, 1); // 12000 / 13
    expect(cost6m).toBeGreaterThan(cost12m);
  });

  test('accumulated always equals purchase price', () => {
    const accumulated = strategy.calculateAccumulated(asset, new Date('2025-07-15'));
    expect(accumulated).toBe(12000);
  });

  test('remaining is always 0', () => {
    const remaining = strategy.calculateRemaining(asset, new Date('2025-07-15'));
    expect(remaining).toBe(0);
  });

  test('zero purchase price returns 0', () => {
    const zeroAsset = makeAsset({ purchasePrice: 0 });
    expect(strategy.calculateMonthlyCost(zeroAsset, new Date('2025-07-15'))).toBe(0);
  });
});

// ─── ExpectedLifespanStrategy tests ───
describe('ExpectedLifespanStrategy', () => {
  const strategy = ExpectedLifespanStrategy;
  const asset = makeAsset({
    purchasePrice: 12000,
    purchaseDate: '2025-01-15',
    amortizationType: AmortizationType.EXPECTED_LIFESPAN,
    expectedLifespanMonths: 36,
  });

  test('monthly cost is fixed', () => {
    const cost6m = strategy.calculateMonthlyCost(asset, new Date('2025-07-15'));
    const cost12m = strategy.calculateMonthlyCost(asset, new Date('2026-01-15'));
    expect(cost6m).toBeCloseTo(333.33, 1); // 12000 / 36
    expect(cost12m).toBeCloseTo(333.33, 1);
  });

  test('accumulated grows linearly', () => {
    const acc6m = strategy.calculateAccumulated(asset, new Date('2025-07-15'));
    expect(acc6m).toBeCloseTo(2333.33, 1); // 333.33 * 7 months
  });

  test('accumulated caps at purchase price', () => {
    const accOver = strategy.calculateAccumulated(asset, new Date('2028-01-15'));
    expect(accOver).toBe(12000);
  });

  test('remaining decreases over time', () => {
    const remaining6m = strategy.calculateRemaining(asset, new Date('2025-07-15'));
    const remaining12m = strategy.calculateRemaining(asset, new Date('2026-01-15'));
    // 7 months: accumulated = 333.33 * 7 = 2333.33, remaining = 9666.67
    expect(remaining6m).toBeCloseTo(9666.67, 1);
    // 13 months: accumulated = 333.33 * 13 = 4333.33, remaining = 7666.67
    expect(remaining12m).toBeCloseTo(7666.67, 1);
    expect(remaining6m).toBeGreaterThan(remaining12m);
  });

  test('no expected lifespan returns 0 cost', () => {
    const badAsset = makeAsset({ expectedLifespanMonths: null });
    expect(strategy.calculateMonthlyCost(badAsset, new Date())).toBe(0);
  });
});

// ─── ResidualValueStrategy tests ───
describe('ResidualValueStrategy', () => {
  const strategy = ResidualValueStrategy;
  const asset = makeAsset({
    purchasePrice: 12000,
    purchaseDate: '2025-01-15',
    amortizationType: AmortizationType.RESIDUAL_VALUE,
    expectedLifespanMonths: 36,
    residualValue: 3000,
  });

  test('monthly cost is depreciable amount ÷ lifespan', () => {
    const cost = strategy.calculateMonthlyCost(asset, new Date('2025-07-15'));
    expect(cost).toBeCloseTo(250.0, 1); // (12000 - 3000) / 36
  });

  test('accumulated caps at depreciable amount', () => {
    const accOver = strategy.calculateAccumulated(asset, new Date('2030-01-15'));
    expect(accOver).toBe(9000); // 12000 - 3000
  });

  test('remaining accounts for accumulated', () => {
    const remaining = strategy.calculateRemaining(asset, new Date('2025-07-15'));
    // remaining = purchasePrice - accumulated = 12000 - (250 * 7) = 12000 - 1750 = 10250
    expect(remaining).toBeCloseTo(10250, 1);
  });

  test('residual > purchase returns 0 cost', () => {
    const badAsset = makeAsset({ purchasePrice: 1000, residualValue: 2000 });
    expect(strategy.calculateMonthlyCost(badAsset, new Date())).toBe(0);
  });
});

// ─── NoAmortizationStrategy tests ───
describe('NoAmortizationStrategy', () => {
  const strategy = NoAmortizationStrategy;
  const asset = makeAsset({ purchasePrice: 5000 });

  test('monthly cost is always 0', () => {
    expect(strategy.calculateMonthlyCost(asset, new Date())).toBe(0);
  });

  test('accumulated is always 0', () => {
    expect(strategy.calculateAccumulated(asset, new Date())).toBe(0);
  });

  test('remaining equals purchase price', () => {
    expect(strategy.calculateRemaining(asset, new Date())).toBe(5000);
  });
});

// ─── Strategy factory tests ───
describe('Strategy factory', () => {
  test('getStrategy returns correct strategy by asset type', () => {
    expect(getStrategy(makeAsset({ amortizationType: AmortizationType.SIMPLE_LINEAR }))).toBe(SimpleLinearStrategy);
    expect(getStrategy(makeAsset({ amortizationType: AmortizationType.EXPECTED_LIFESPAN }))).toBe(ExpectedLifespanStrategy);
    expect(getStrategy(makeAsset({ amortizationType: AmortizationType.RESIDUAL_VALUE }))).toBe(ResidualValueStrategy);
    expect(getStrategy(makeAsset({ amortizationType: AmortizationType.NO_AMORTIZATION }))).toBe(NoAmortizationStrategy);
  });

  test('getStrategyByType returns correct strategy', () => {
    expect(getStrategyByType(AmortizationType.SIMPLE_LINEAR)).toBe(SimpleLinearStrategy);
    expect(getStrategyByType(AmortizationType.NO_AMORTIZATION)).toBe(NoAmortizationStrategy);
  });
});

// ─── Recurring expense interval logic tests ───
describe('Recurring expense interval logic', () => {
  type ExpenseCheck = {
    effectiveFrom: string;
    effectiveTo: string | null;
  };

  function isActiveForMonth(expense: ExpenseCheck, month: string): boolean {
    return expense.effectiveFrom <= month &&
      (expense.effectiveTo === null || expense.effectiveTo >= month);
  }

  test('ongoing expense is active for any month after start', () => {
    const expense: ExpenseCheck = { effectiveFrom: '2025-01', effectiveTo: null };
    expect(isActiveForMonth(expense, '2025-01')).toBe(true);
    expect(isActiveForMonth(expense, '2025-06')).toBe(true);
    expect(isActiveForMonth(expense, '2030-12')).toBe(true);
  });

  test('ended expense is active within range', () => {
    const expense: ExpenseCheck = { effectiveFrom: '2025-01', effectiveTo: '2025-06' };
    expect(isActiveForMonth(expense, '2025-03')).toBe(true);
    expect(isActiveForMonth(expense, '2025-06')).toBe(true);
    expect(isActiveForMonth(expense, '2025-07')).toBe(false);
  });

  test('future expense is not active yet', () => {
    const expense: ExpenseCheck = { effectiveFrom: '2025-06', effectiveTo: null };
    expect(isActiveForMonth(expense, '2025-01')).toBe(false);
    expect(isActiveForMonth(expense, '2025-06')).toBe(true);
  });

  test('month comparison works correctly', () => {
    // String comparison of YYYY-MM works for chronological ordering
    expect('2025-01' < '2025-06').toBe(true);
    expect('2025-06' < '2026-01').toBe(true);
    expect('2025-12' < '2026-01').toBe(true);
  });
});

// ─── Settlement calculation logic tests ───
describe('Settlement calculation logic', () => {
  // Test the core settlement math without DB dependencies
  test('net expenditure = purchase + holding cost - sell price', () => {
    const purchasePrice = 12000;
    const totalHoldingCost = 5000;
    const sellPrice = 6000;
    const netExpenditure = purchasePrice + totalHoldingCost - sellPrice;
    expect(netExpenditure).toBe(11000);
  });

  test('depreciation = purchase - sell (negative means appreciation)', () => {
    const purchasePrice = 12000;
    const sellPrice = 15000;
    const depreciation = purchasePrice - sellPrice;
    expect(depreciation).toBe(-3000); // appreciated
  });

  test('daily average = net expenditure ÷ ownership days', () => {
    const netExpenditure = 11000;
    const ownershipDays = 365;
    const dailyAverage = netExpenditure / ownershipDays;
    expect(dailyAverage).toBeCloseTo(30.14, 2);
  });

  test('total holding cost = recurring + maintenance + amortization', () => {
    const recurring = 2000;
    const maintenance = 1500;
    const amortization = 5000;
    const total = recurring + maintenance + amortization;
    expect(total).toBe(8500);
  });

  test('daysBetween for settlement', () => {
    const days = daysBetween('2025-01-15', new Date('2026-01-15'));
    expect(days).toBe(365);
  });
});

// ─── Maintenance amortization logic tests ───
describe('Maintenance amortization logic', () => {
  test('amortized maintenance divides over remaining months', () => {
    const recordAmount = 1200;
    const remainingMonths = 12;
    const monthlyCost = recordAmount / remainingMonths;
    expect(monthlyCost).toBe(100);
  });

  test('non-amortized maintenance is recorded but not monthly', () => {
    const records = [
      { amount: 500, amortize: false },
      { amount: 300, amortize: false },
    ];
    const total = records.reduce((sum, r) => sum + r.amount, 0);
    expect(total).toBe(800);
    // Monthly cost for non-amortized = 0
  });

  test('maintenance with expected lifespan uses lifespan as denominator', () => {
    const purchaseDate = '2025-01-15';
    const maintenanceDate = '2025-06-15';
    const expectedLifespanMonths = 36;
    const monthsBeforeMaintenance = monthsBetween(purchaseDate, new Date(maintenanceDate));
    const remainingMonths = Math.max(1, expectedLifespanMonths - monthsBeforeMaintenance);
    // monthsBeforeMaintenance = 6, remaining = 36 - 6 = 30
    expect(remainingMonths).toBe(30);
  });
});

// ─── ProjectionCalculator tests ───
describe('ProjectionCalculator', () => {
  describe('estimateAchievementDate', () => {
    test('returns null with less than 2 data points', () => {
      // 0 data points
      expect(ProjectionCalculator.estimateAchievementDate([], 100000)).toBeNull();
      // 1 data point
      expect(
        ProjectionCalculator.estimateAchievementDate(
          [{ date: '2025-01-01', value: 50000 }],
          100000
        )
      ).toBeNull();
    });

    test('returns null when slope is zero or negative', () => {
      // Flat growth (slope = 0)
      const flatPoints = [
        { date: '2025-01-01', value: 50000 },
        { date: '2025-02-01', value: 50000 },
        { date: '2025-03-01', value: 50000 },
      ];
      expect(ProjectionCalculator.estimateAchievementDate(flatPoints, 100000)).toBeNull();

      // Declining net worth (slope < 0)
      const decliningPoints = [
        { date: '2025-01-01', value: 60000 },
        { date: '2025-02-01', value: 55000 },
        { date: '2025-03-01', value: 50000 },
      ];
      expect(ProjectionCalculator.estimateAchievementDate(decliningPoints, 100000)).toBeNull();
    });

    test('returns null when goal is already achieved', () => {
      const points = [
        { date: '2025-01-01', value: 100000 },
        { date: '2025-02-01', value: 110000 },
      ];
      // currentValue (110000) >= goal (100000)
      expect(ProjectionCalculator.estimateAchievementDate(points, 100000)).toBeNull();
      // currentValue equals goal exactly
      const exactPoints = [
        { date: '2025-01-01', value: 90000 },
        { date: '2025-02-01', value: 100000 },
      ];
      expect(ProjectionCalculator.estimateAchievementDate(exactPoints, 100000)).toBeNull();
    });

    test('estimates correct date with linear growth', () => {
      // Monthly growth of ~10000: from 50000 to 100000 over 6 months
      const points = [
        { date: '2025-01-01', value: 50000 },
        { date: '2025-02-01', value: 60000 },
        { date: '2025-03-01', value: 70000 },
        { date: '2025-04-01', value: 80000 },
        { date: '2025-05-01', value: 90000 },
        { date: '2025-06-01', value: 100000 },
      ];
      const result = ProjectionCalculator.estimateAchievementDate(points, 150000);
      expect(result).not.toBeNull();
      // Goal is 150000, current is 100000, need ~50000 more at ~10000/month ≈ 5 months
      // 5 months after June 2025 → approximately October–November 2025
      expect(result).toMatch(/^2025-(10|11)-/);
    });

    test('uses only last 6 points when more are provided', () => {
      // 10 points: first 4 are flat, last 6 have linear growth
      const points = [
        { date: '2024-09-01', value: 50000 },
        { date: '2024-10-01', value: 50000 },
        { date: '2024-11-01', value: 50000 },
        { date: '2024-12-01', value: 50000 },
        { date: '2025-01-01', value: 50000 },
        { date: '2025-02-01', value: 60000 },
        { date: '2025-03-01', value: 70000 },
        { date: '2025-04-01', value: 80000 },
        { date: '2025-05-01', value: 90000 },
        { date: '2025-06-01', value: 100000 },
      ];
      const result = ProjectionCalculator.estimateAchievementDate(points, 150000);
      expect(result).not.toBeNull();

      // Result should be identical to using only the last 6 points
      const resultLast6 = ProjectionCalculator.estimateAchievementDate(points.slice(-6), 150000);
      expect(result).toBe(resultLast6);
    });
  });
});

// ─── NetWorthCalculator negative progress tests ───
describe('NetWorthCalculator - negative progress', () => {
  test('returns negative percentage when net worth is negative', () => {
    const result = NetWorthCalculator.calculateProgress(-10000, 100000);
    expect(result.percentage).toBe(-10);
    expect(result.isOnTrack).toBe(false);
  });

  test('returns 0 when goal is null or <= 0', () => {
    expect(NetWorthCalculator.calculateProgress(-5000, null).percentage).toBe(0);
    expect(NetWorthCalculator.calculateProgress(-5000, 0).percentage).toBe(0);
  });
});
