/**
 * WorthBase (家底) - Expected Lifespan Strategy
 * 预期寿命: monthly cost = purchase_price ÷ expected_lifespan_months (fixed)
 *
 * The purchase price is spread evenly over the expected lifespan.
 * Monthly cost is fixed. Accumulated grows linearly until full lifespan is reached.
 */

import type { AmortizationStrategy } from './AmortizationStrategy';
import { monthsBetween } from './AmortizationStrategy';
import type { Asset } from '@/types/models';

export const ExpectedLifespanStrategy: AmortizationStrategy = {
  calculateMonthlyCost(asset: Asset, _currentDate: Date): number {
    if (asset.purchasePrice <= 0) return 0;
    if (!asset.expectedLifespanMonths || asset.expectedLifespanMonths <= 0) return 0;
    return asset.purchasePrice / asset.expectedLifespanMonths;
  },

  calculateAccumulated(asset: Asset, currentDate: Date): number {
    if (asset.purchasePrice <= 0) return 0;
    if (!asset.expectedLifespanMonths || asset.expectedLifespanMonths <= 0) return 0;
    const monthsHeld = monthsBetween(asset.purchaseDate, currentDate);
    const monthlyCost = asset.purchasePrice / asset.expectedLifespanMonths;
    const accumulated = monthlyCost * Math.min(monthsHeld, asset.expectedLifespanMonths);
    return Math.min(accumulated, asset.purchasePrice);
  },

  calculateRemaining(asset: Asset, currentDate: Date): number {
    if (asset.purchasePrice <= 0) return 0;
    if (!asset.expectedLifespanMonths || asset.expectedLifespanMonths <= 0) return asset.purchasePrice;
    const accumulated = this.calculateAccumulated(asset, currentDate);
    return Math.max(0, asset.purchasePrice - accumulated);
  },
};
