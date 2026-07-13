/**
 * WorthBase (家底) - Net Worth Calculator
 * Calculates net worth = liquid assets + asset valuations - unamortized purchase costs.
 */

import { AccountRepository } from '@/db/account-repository';
import { AssetRepository } from '@/db/asset-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { getStrategy } from './strategies';
import type { NetWorthResult } from '@/types/models';
import { AssetStatus } from '@/types/enums';

export const NetWorthCalculator = {
  /**
   * Calculate the current net worth.
   */
  async calculate(currentDate: Date = new Date()): Promise<NetWorthResult> {
    // 1. Liquid assets = sum of all account balances
    const balances = await AccountRepository.getAllLatestBalances();
    let liquidAssets = 0;
    for (const balance of balances.values()) {
      liquidAssets += balance;
    }

    // 2. Asset valuations = sum of all active assets' current valuations
    const assets = await AssetRepository.getByStatus(AssetStatus.ACTIVE);
    const valuations = await ValuationRepository.getLatestForAllAssets();

    let assetValuations = 0;
    let unamortizedCost = 0;

    for (const asset of assets) {
      // Add current valuation
      if (asset.valuationTracking) {
        const valuation = valuations.get(asset.id) ?? asset.currentValuation ?? 0;
        assetValuations += valuation;
      }

      // Subtract unamortized purchase cost
      const strategy = getStrategy(asset);
      const remaining = strategy.calculateRemaining(asset, currentDate);
      unamortizedCost += remaining;
    }

    const netWorth = liquidAssets + assetValuations - unamortizedCost;

    return {
      liquidAssets,
      assetValuations,
      unamortizedCost,
      netWorth,
    };
  },

  /**
   * Calculate net worth progress toward a goal.
   */
  calculateProgress(currentNetWorth: number, goal: number | null): {
    percentage: number;
    isOnTrack: boolean;
  } {
    if (!goal || goal <= 0) {
      return { percentage: 0, isOnTrack: false };
    }
    const percentage = (currentNetWorth / goal) * 100;
    return { percentage, isOnTrack: percentage >= 100 };
  },
};
