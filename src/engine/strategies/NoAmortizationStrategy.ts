/**
 * WorthBase (家底) - No Amortization Strategy
 * 不分摊: monthly cost = 0 (only recurring expenses and maintenance count)
 */

import type { AmortizationStrategy } from './AmortizationStrategy';
import type { Asset } from '@/types/models';

export const NoAmortizationStrategy: AmortizationStrategy = {
  calculateMonthlyCost(_asset: Asset, _currentDate: Date): number {
    return 0;
  },

  calculateAccumulated(_asset: Asset, _currentDate: Date): number {
    return 0;
  },

  calculateRemaining(asset: Asset, _currentDate: Date): number {
    return asset.purchasePrice;
  },
};
