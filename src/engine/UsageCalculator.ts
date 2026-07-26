/**
 * WorthBase (家底) - Usage Calculator
 * Tracks cost-per-use: purchase price ÷ usage count.
 *
 * 次均成本 = 购买价格 ÷ 使用次数
 * 闲置判定 = 90 天以上未使用（或从未使用且持有 90 天以上）
 */

import { UsageRepository } from '@/db/usage-repository';
import { daysBetween } from './strategies/AmortizationStrategy';
import type { Asset, UsageResult, UsageNeglect } from '@/types/models';

const NEGLECT_THRESHOLD_DAYS = 90;

export const UsageCalculator = {
  /**
   * Calculate cost-per-use and usage stats for a single asset.
   */
  async calculate(asset: Asset): Promise<UsageResult> {
    const useCount = await UsageRepository.getCount(asset.id);
    const costPerUse = useCount > 0 ? asset.purchasePrice / useCount : Infinity;
    const lastUsedAt = await UsageRepository.getLastUsed(asset.id);

    const referenceDate = lastUsedAt ?? asset.purchaseDate;
    const daysSinceLastUse = daysBetween(referenceDate, new Date());
    const isNeglected = daysSinceLastUse >= NEGLECT_THRESHOLD_DAYS;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);
    const recentUseCount = await UsageRepository.getRecentCount(asset.id, sinceDate.toISOString().substring(0, 10));

    return { useCount, costPerUse, lastUsedAt, daysSinceLastUse, isNeglected, recentUseCount };
  },

  /**
   * Calculate cost-per-use for all assets.
   * Returns a map of assetId -> UsageResult.
   */
  async calculateAll(assets: Asset[]): Promise<Map<string, UsageResult>> {
    const results = new Map<string, UsageResult>();
    for (const asset of assets) {
      results.set(asset.id, await this.calculate(asset));
    }
    return results;
  },

  /**
   * Find neglected items (unused for threshold days or more),
   * sorted by costPerUse descending.
   */
  async getNeglected(assets: Asset[], days = NEGLECT_THRESHOLD_DAYS): Promise<UsageNeglect[]> {
    const allResults = await this.calculateAll(assets);
    const neglected: UsageNeglect[] = [];
    for (const asset of assets) {
      const result = allResults.get(asset.id);
      if (result && result.daysSinceLastUse >= days) {
        neglected.push({
          assetId: asset.id,
          assetName: asset.name,
          category: asset.category,
          daysSinceLastUse: result.daysSinceLastUse,
          costPerUse: result.costPerUse,
        });
      }
    }
    return neglected.sort((a, b) => b.costPerUse - a.costPerUse);
  },
};
