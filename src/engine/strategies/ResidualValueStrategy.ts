/**
 * WorthBase (家底) - Residual Value Strategy
 * 残值分摊: monthly cost = (purchase_price - residual_value) ÷ expected_lifespan_months (fixed, accounts for residual)
 *
 * The depreciable amount (purchase price minus estimated residual value)
 * is spread evenly over the expected lifespan.
 */

import type { AmortizationStrategy } from './AmortizationStrategy';
import { monthsBetween } from './AmortizationStrategy';
import type { Asset } from '@/types/models';

export const ResidualValueStrategy: AmortizationStrategy = {
  calculateMonthlyCost(asset: Asset, _currentDate: Date): number {
    if (asset.purchasePrice <= 0) return 0;
    if (!asset.expectedLifespanMonths || asset.expectedLifespanMonths <= 0) return 0;
    const residual = asset.residualValue ?? 0;
    const depreciableAmount = asset.purchasePrice - residual;
    if (depreciableAmount <= 0) return 0;
    return depreciableAmount / asset.expectedLifespanMonths;
  },

  calculateAccumulated(asset: Asset, currentDate: Date): number {
    if (asset.purchasePrice <= 0) return 0;
    if (!asset.expectedLifespanMonths || asset.expectedLifespanMonths <= 0) return 0;
    const residual = asset.residualValue ?? 0;
    const depreciableAmount = asset.purchasePrice - residual;
    if (depreciableAmount <= 0) return 0;
    const monthsHeld = monthsBetween(asset.purchaseDate, currentDate);
    const monthlyCost = depreciableAmount / asset.expectedLifespanMonths;
    const accumulated = monthlyCost * Math.min(monthsHeld, asset.expectedLifespanMonths);
    return Math.min(accumulated, depreciableAmount);
  },

  calculateRemaining(asset: Asset, currentDate: Date): number {
    if (asset.purchasePrice <= 0) return 0;
    if (!asset.expectedLifespanMonths || asset.expectedLifespanMonths <= 0) {
      return asset.purchasePrice;
    }
    const residual = asset.residualValue ?? 0;
    const depreciableAmount = asset.purchasePrice - residual;
    const accumulated = this.calculateAccumulated(asset, currentDate);
    // Remaining = depreciable amount - accumulated + residual
    // But for net worth, we want the unamortized portion of the purchase price
    return Math.max(0, asset.purchasePrice - accumulated);
  },
};
