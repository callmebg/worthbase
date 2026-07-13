/// <reference types="jest" />

/**
 * WorthBase (家底) - Engine Boundary Value Tests
 * Tests edge cases: 0 price, 0 lifespan, negative residual, leap year dates.
 */

import {
  monthsBetween,
  daysBetween,
} from '@/engine/strategies/AmortizationStrategy';
import { SimpleLinearStrategy } from '@/engine/strategies/SimpleLinearStrategy';
import { ExpectedLifespanStrategy } from '@/engine/strategies/ExpectedLifespanStrategy';
import { ResidualValueStrategy } from '@/engine/strategies/ResidualValueStrategy';
import { NoAmortizationStrategy } from '@/engine/strategies/NoAmortizationStrategy';
import { AmortizationType, AssetCategory, AssetStatus } from '@/types/enums';
import type { Asset } from '@/types/models';

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
    weightGrams: null,
    imagePath: null,
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    ...overrides,
  };
}

// ─── Zero purchase price boundary tests ───
describe('Zero purchase price boundary', () => {
  test('SimpleLinear with 0 price returns 0 monthly cost', () => {
    const asset = makeAsset({ purchasePrice: 0 });
    expect(SimpleLinearStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('SimpleLinear with 0 price: accumulated is 0', () => {
    const asset = makeAsset({ purchasePrice: 0 });
    expect(SimpleLinearStrategy.calculateAccumulated(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('ExpectedLifespan with 0 price returns 0 monthly cost', () => {
    const asset = makeAsset({
      purchasePrice: 0,
      amortizationType: AmortizationType.EXPECTED_LIFESPAN,
      expectedLifespanMonths: 36,
    });
    expect(ExpectedLifespanStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('ResidualValue with 0 price returns 0 monthly cost', () => {
    const asset = makeAsset({
      purchasePrice: 0,
      amortizationType: AmortizationType.RESIDUAL_VALUE,
      expectedLifespanMonths: 36,
      residualValue: 0,
    });
    expect(ResidualValueStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('NoAmortization with 0 price: remaining is 0', () => {
    const asset = makeAsset({ purchasePrice: 0 });
    expect(NoAmortizationStrategy.calculateRemaining(asset, new Date())).toBe(0);
  });
});

// ─── Zero / null lifespan boundary tests ───
describe('Zero/null lifespan boundary', () => {
  test('ExpectedLifespan with null lifespan returns 0', () => {
    const asset = makeAsset({
      amortizationType: AmortizationType.EXPECTED_LIFESPAN,
      expectedLifespanMonths: null,
    });
    expect(ExpectedLifespanStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('ExpectedLifespan with 0 lifespan returns 0 (avoid divide by zero)', () => {
    const asset = makeAsset({
      amortizationType: AmortizationType.EXPECTED_LIFESPAN,
      expectedLifespanMonths: 0,
    });
    expect(ExpectedLifespanStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('ResidualValue with null lifespan returns 0', () => {
    const asset = makeAsset({
      amortizationType: AmortizationType.RESIDUAL_VALUE,
      expectedLifespanMonths: null,
      residualValue: 1000,
    });
    expect(ResidualValueStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('ResidualValue with 0 lifespan returns 0 (avoid divide by zero)', () => {
    const asset = makeAsset({
      amortizationType: AmortizationType.RESIDUAL_VALUE,
      expectedLifespanMonths: 0,
      residualValue: 1000,
    });
    expect(ResidualValueStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('ExpectedLifespan with 1 month lifespan', () => {
    const asset = makeAsset({
      purchasePrice: 12000,
      amortizationType: AmortizationType.EXPECTED_LIFESPAN,
      expectedLifespanMonths: 1,
    });
    expect(ExpectedLifespanStrategy.calculateMonthlyCost(asset, new Date('2025-01-20'))).toBe(12000);
  });
});

// ─── Negative residual value boundary ───
describe('Negative residual value boundary', () => {
  test('Negative residual is treated as additional depreciable amount', () => {
    // purchasePrice=10000, residualValue=-2000, lifespan=10
    // depreciable = 10000 - (-2000) = 12000, monthly = 1200
    const asset = makeAsset({
      purchasePrice: 10000,
      amortizationType: AmortizationType.RESIDUAL_VALUE,
      expectedLifespanMonths: 10,
      residualValue: -2000,
    });
    const cost = ResidualValueStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'));
    expect(cost).toBeCloseTo(1200, 1);
  });

  test('Residual equals purchase price: 0 monthly cost', () => {
    const asset = makeAsset({
      purchasePrice: 5000,
      amortizationType: AmortizationType.RESIDUAL_VALUE,
      expectedLifespanMonths: 24,
      residualValue: 5000,
    });
    expect(ResidualValueStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(0);
  });

  test('Residual slightly less than purchase: small monthly cost', () => {
    const asset = makeAsset({
      purchasePrice: 10000,
      amortizationType: AmortizationType.RESIDUAL_VALUE,
      expectedLifespanMonths: 60,
      residualValue: 9999,
    });
    const cost = ResidualValueStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'));
    expect(cost).toBeCloseTo(1 / 60, 4); // 1 / 60
  });
});

// ─── Leap year date calculation tests ───
describe('Leap year date calculations', () => {
  test('Feb 2024 (leap year) has 29 days', () => {
    const days = daysBetween('2024-02-01', new Date('2024-03-01'));
    expect(days).toBe(29);
  });

  test('Feb 2025 (non-leap) has 28 days', () => {
    const days = daysBetween('2025-02-01', new Date('2025-03-01'));
    expect(days).toBe(28);
  });

  test('daysBetween across leap year Feb', () => {
    // Jan 1 to Mar 1 in leap year = 31 + 29 = 60 days
    const days = daysBetween('2024-01-01', new Date('2024-03-01'));
    expect(days).toBe(60);
  });

  test('daysBetween across non-leap Feb', () => {
    // Jan 1 to Mar 1 in non-leap year = 31 + 28 = 59 days
    const days = daysBetween('2025-01-01', new Date('2025-03-01'));
    expect(days).toBe(59);
  });

  test('monthsBetween across leap year boundary', () => {
    // Dec 2023 to Mar 2024 = 4 months
    const months = monthsBetween('2023-12-15', new Date('2024-03-15'));
    expect(months).toBe(4);
  });

  test('Full year days: 2024 (leap) has 366', () => {
    const days = daysBetween('2024-01-01', new Date('2025-01-01'));
    expect(days).toBe(366);
  });

  test('Full year days: 2025 (non-leap) has 365', () => {
    const days = daysBetween('2025-01-01', new Date('2026-01-01'));
    expect(days).toBe(365);
  });
});

// ─── Cross-year date calculations ───
describe('Cross-year date calculations', () => {
  test('monthsBetween: Dec to Jan next year', () => {
    expect(monthsBetween('2025-12-15', new Date('2026-01-15'))).toBe(2);
  });

  test('monthsBetween: same date returns 1', () => {
    expect(monthsBetween('2025-06-15', new Date('2025-06-15'))).toBe(1);
  });

  test('daysBetween: same day returns 1 (minimum)', () => {
    expect(daysBetween('2025-06-15', new Date('2025-06-15'))).toBe(1);
  });

  test('SimpleLinear: same-month cost equals full price', () => {
    const asset = makeAsset({ purchasePrice: 6000, purchaseDate: '2025-06-01' });
    // monthsBetween = 1, so monthly = 6000 / 1 = 6000
    expect(SimpleLinearStrategy.calculateMonthlyCost(asset, new Date('2025-06-15'))).toBe(6000);
  });

  test('ExpectedLifespan: accumulated never exceeds purchase price', () => {
    const asset = makeAsset({
      purchasePrice: 1000,
      amortizationType: AmortizationType.EXPECTED_LIFESPAN,
      expectedLifespanMonths: 10,
    });
    // 10 years later, accumulated should cap at 1000
    const acc = ExpectedLifespanStrategy.calculateAccumulated(asset, new Date('2035-01-01'));
    expect(acc).toBe(1000);
  });

  test('ExpectedLifespan: remaining never goes below 0', () => {
    const asset = makeAsset({
      purchasePrice: 1000,
      amortizationType: AmortizationType.EXPECTED_LIFESPAN,
      expectedLifespanMonths: 10,
    });
    const remaining = ExpectedLifespanStrategy.calculateRemaining(asset, new Date('2035-01-01'));
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBe(0);
  });

  test('ResidualValue: remaining never goes below residual value', () => {
    const asset = makeAsset({
      purchasePrice: 10000,
      amortizationType: AmortizationType.RESIDUAL_VALUE,
      expectedLifespanMonths: 12,
      residualValue: 2000,
    });
    const remaining = ResidualValueStrategy.calculateRemaining(asset, new Date('2035-01-01'));
    expect(remaining).toBeGreaterThanOrEqual(2000);
  });
});

// ─── UTC date handling tests ───
describe('UTC date handling', () => {
  test('monthsBetween handles UTC correctly regardless of local timezone', () => {
    // Jan 31 to Feb 28: end day (28) < start day (31), so no extra month
    // Result should be 1 (just Feb counted, Jan is the start month)
    const result = monthsBetween('2025-01-31', new Date('2025-02-28T00:00:00Z'));
    expect(result).toBe(1);
  });

  test('daysBetween calculates correctly in UTC', () => {
    // Jan 1 to Jan 31 = 30 days in UTC
    const result = daysBetween('2025-01-01', new Date('2025-01-31T00:00:00Z'));
    expect(result).toBe(30);
  });
});
