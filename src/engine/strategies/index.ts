/**
 * WorthBase (家底) - Amortization Strategy Factory
 * Returns the appropriate strategy instance based on the asset's amortization_type.
 */

import type { AmortizationStrategy } from './AmortizationStrategy';
import { SimpleLinearStrategy } from './SimpleLinearStrategy';
import { ExpectedLifespanStrategy } from './ExpectedLifespanStrategy';
import { ResidualValueStrategy } from './ResidualValueStrategy';
import { NoAmortizationStrategy } from './NoAmortizationStrategy';
import { AmortizationType } from '@/types/enums';
import type { Asset } from '@/types/models';

const strategyMap: Record<AmortizationType, AmortizationStrategy> = {
  [AmortizationType.SIMPLE_LINEAR]: SimpleLinearStrategy,
  [AmortizationType.EXPECTED_LIFESPAN]: ExpectedLifespanStrategy,
  [AmortizationType.RESIDUAL_VALUE]: ResidualValueStrategy,
  [AmortizationType.NO_AMORTIZATION]: NoAmortizationStrategy,
};

/**
 * Get the amortization strategy for a given asset.
 */
export function getStrategy(asset: Asset): AmortizationStrategy {
  const strategy = strategyMap[asset.amortizationType];
  if (!strategy) {
    // Fallback to no amortization if type is unknown
    return NoAmortizationStrategy;
  }
  return strategy;
}

/**
 * Get a strategy by amortization type.
 */
export function getStrategyByType(type: AmortizationType): AmortizationStrategy {
  return strategyMap[type] ?? NoAmortizationStrategy;
}
