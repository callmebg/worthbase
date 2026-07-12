/**
 * WorthBase (家底) - Holding Cost Calculator
 * Combines amortization + recurring expenses + maintenance into a complete holding cost result.
 *
 * 持有成本 = 分摊策略结果 + 经常性支出(当月生效项之和) + 一次性维护(如选纳入分摊则÷剩余月数)
 * 日均持有成本 = 月持有成本 ÷ 30
 */

import { getStrategy } from './strategies';
import { RecurringExpenseCalculator } from './RecurringExpenseCalculator';
import { MaintenanceCalculator } from './MaintenanceCalculator';
import type { Asset, HoldingCostResult } from '@/types/models';
import { AssetStatus } from '@/types/enums';

export const HoldingCostCalculator = {
  /**
   * Calculate the complete holding cost for an asset at a given date.
   */
  async calculate(asset: Asset, currentDate: Date = new Date()): Promise<HoldingCostResult> {
    // If asset is retired or sold, holding cost is 0
    if (asset.status !== AssetStatus.ACTIVE) {
      return {
        monthlyAmortization: 0,
        monthlyRecurring: 0,
        monthlyMaintenance: 0,
        monthlyTotal: 0,
        dailyAverage: 0,
        accumulatedTotal: 0,
        remainingUnamortized: 0,
      };
    }

    const currentMonth = currentDate.toISOString().substring(0, 7); // YYYY-MM

    // 1. Amortization cost
    const strategy = getStrategy(asset);
    const monthlyAmortization = strategy.calculateMonthlyCost(asset, currentDate);
    const accumulatedAmortization = strategy.calculateAccumulated(asset, currentDate);
    const remainingUnamortized = strategy.calculateRemaining(asset, currentDate);

    // 2. Recurring expenses for the current month
    const monthlyRecurring = await RecurringExpenseCalculator.getMonthlyTotal(currentMonth, asset.id);

    // 3. Amortized maintenance monthly cost
    const monthlyMaintenance = await MaintenanceCalculator.getAmortizedMonthly(asset, currentDate);

    // 4. Calculate totals
    const monthlyTotal = monthlyAmortization + monthlyRecurring + monthlyMaintenance;
    const dailyAverage = monthlyTotal / 30;

    // 5. Accumulated total = amortization accumulated + recurring accumulated + maintenance accumulated
    const accumulatedRecurring = await RecurringExpenseCalculator.getAccumulatedTotal(
      asset.id, asset.purchaseDate, currentMonth
    );
    const accumulatedMaintenance = await MaintenanceCalculator.getAccumulatedAmortized(asset, currentDate);
    const nonAmortizedMaintenance = await MaintenanceCalculator.getNonAmortizedTotal(asset.id);
    const accumulatedTotal = accumulatedAmortization + accumulatedRecurring + accumulatedMaintenance + nonAmortizedMaintenance;

    return {
      monthlyAmortization,
      monthlyRecurring,
      monthlyMaintenance,
      monthlyTotal,
      dailyAverage,
      accumulatedTotal,
      remainingUnamortized,
    };
  },

  /**
   * Calculate holding cost for all active assets.
   * Returns a map of assetId -> HoldingCostResult.
   */
  async calculateAll(assets: Asset[], currentDate: Date = new Date()): Promise<Map<string, HoldingCostResult>> {
    const results = new Map<string, HoldingCostResult>();
    for (const asset of assets) {
      const result = await this.calculate(asset, currentDate);
      results.set(asset.id, result);
    }
    return results;
  },

  /**
   * Get the total monthly holding cost across all active assets.
   */
  async getTotalMonthly(assets: Asset[], currentDate: Date = new Date()): Promise<number> {
    let total = 0;
    for (const asset of assets) {
      if (asset.status === AssetStatus.ACTIVE) {
        const result = await this.calculate(asset, currentDate);
        total += result.monthlyTotal;
      }
    }
    return total;
  },
};
