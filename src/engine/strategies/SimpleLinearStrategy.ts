/**
 * WorthBase (家底) - Simple Linear Strategy
 * 简单线性: monthly cost = purchase_price ÷ months_held (decreases over time)
 *
 * The full purchase price is allocated across all months held.
 * The longer you hold, the less per month it costs.
 * accumulated = purchase_price (always fully allocated)
 * remaining = 0
 */

import type { AmortizationStrategy } from './AmortizationStrategy';
import { monthsBetween } from './AmortizationStrategy';
import type { Asset } from '@/types/models';

export const SimpleLinearStrategy: AmortizationStrategy = {
  calculateMonthlyCost(asset: Asset, currentDate: Date): number {
    if (asset.purchasePrice <= 0) return 0;
    const monthsHeld = monthsBetween(asset.purchaseDate, currentDate);
    return asset.purchasePrice / monthsHeld;
  },

  calculateAccumulated(asset: Asset, _currentDate: Date): number {
    return asset.purchasePrice;
  },

  calculateRemaining(_asset: Asset, _currentDate: Date): number {
    return 0;
  },
};
