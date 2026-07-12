/**
 * WorthBase (家底) - Settlement Calculator
 * Calculates the settlement when an asset is sold.
 *
 * 卖出结算：
 * - 净支出 = 购入价 + 累计持有成本 - 卖价
 * - 日均成本 = 净支出 ÷ 持有天数
 */

import { RecurringExpenseCalculator } from './RecurringExpenseCalculator';
import { MaintenanceCalculator } from './MaintenanceCalculator';
import { getStrategy } from './strategies';
import { daysBetween } from './strategies/AmortizationStrategy';
import type { Asset, SettlementResult } from '@/types/models';
import { AssetStatus } from '@/types/enums';

export const SettlementCalculator = {
  /**
   * Calculate the full settlement for a sold asset.
   *
   * @param asset The sold asset (must have status 'sold', sellDate, and sellPrice)
   * @returns SettlementResult with all financial metrics
   */
  async calculate(asset: Asset): Promise<SettlementResult> {
    const sellDate = asset.sellDate ?? new Date().toISOString();
    const sellPrice = asset.sellPrice ?? 0;
    const sellDateObj = new Date(sellDate);

    // 1. Amortization accumulated
    const strategy = getStrategy(asset);
    const accumulatedAmortization = strategy.calculateAccumulated(asset, sellDateObj);

    // 2. Recurring expenses accumulated (from purchase to sell month)
    const sellMonth = sellDate.substring(0, 7);
    const accumulatedRecurring = await RecurringExpenseCalculator.getAccumulatedTotal(
      asset.id, asset.purchaseDate, sellMonth
    );

    // 3. Maintenance accumulated (both amortized and non-amortized)
    const accumulatedMaintenanceAmortized = await MaintenanceCalculator.getAccumulatedAmortized(asset, sellDateObj);
    const accumulatedMaintenanceNonAmortized = await MaintenanceCalculator.getNonAmortizedTotal(asset.id);
    const accumulatedMaintenance = accumulatedMaintenanceAmortized + accumulatedMaintenanceNonAmortized;

    // 4. Total holding cost = recurring + maintenance + amortization
    const totalHoldingCost = accumulatedRecurring + accumulatedMaintenance + accumulatedAmortization;

    // 5. Depreciation = purchase price - sell price (negative if appreciated)
    const depreciation = asset.purchasePrice - sellPrice;

    // 6. True net expenditure = purchase price + total holding cost - sell price
    const netExpenditure = asset.purchasePrice + totalHoldingCost - sellPrice;

    // 7. Ownership days
    const ownershipDays = daysBetween(asset.purchaseDate, sellDateObj);

    // 8. Daily average cost
    const dailyAverageCost = netExpenditure / ownershipDays;

    return {
      purchasePrice: asset.purchasePrice,
      sellPrice,
      depreciation,
      accumulatedRecurring,
      accumulatedMaintenance,
      accumulatedAmortization,
      totalHoldingCost,
      netExpenditure,
      ownershipDays,
      dailyAverageCost,
    };
  },

  /**
   * Preview settlement for an asset that hasn't been sold yet.
   * Uses the current date as the hypothetical sell date.
   */
  async preview(asset: Asset, hypotheticalSellPrice: number): Promise<SettlementResult> {
    const previewAsset: Asset = {
      ...asset,
      status: AssetStatus.SOLD,
      sellDate: new Date().toISOString(),
      sellPrice: hypotheticalSellPrice,
    };
    return this.calculate(previewAsset);
  },
};
