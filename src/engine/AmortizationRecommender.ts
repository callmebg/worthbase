/**
 * WorthBase (家底) - Amortization Recommendation Engine
 * Pure function, table-driven design.
 * Recommends an amortization method based on asset category.
 */

import { AssetCategory, AmortizationType } from '@/types/enums';

export interface AmortizationRecommendation {
  type: AmortizationType;
  defaultLifespanMonths?: number;
  hint: string;
}

/** Table-driven mapping: AssetCategory → recommendation */
const RECOMMENDATION_TABLE: Record<AssetCategory, AmortizationRecommendation> = {
  [AssetCategory.ELECTRONICS]: {
    type: AmortizationType.SIMPLE_LINEAR,
    hint: '电子产品贬值快，按已持有时间递减',
  },
  [AssetCategory.DIGITAL]: {
    type: AmortizationType.SIMPLE_LINEAR,
    hint: '数码产品同上',
  },
  [AssetCategory.REAL_ESTATE]: {
    type: AmortizationType.EXPECTED_LIFESPAN,
    defaultLifespanMonths: 360,
    hint: '房产保值期长，按预期使用年限分摊',
  },
  [AssetCategory.VEHICLE]: {
    type: AmortizationType.RESIDUAL_VALUE,
    defaultLifespanMonths: 60,
    hint: '车辆有残值，建议考虑残值后分摊',
  },
  [AssetCategory.HOME]: {
    type: AmortizationType.EXPECTED_LIFESPAN,
    defaultLifespanMonths: 108,
    hint: '家居用品耐用，按预期寿命均摊',
  },
  [AssetCategory.LUXURY]: {
    type: AmortizationType.NO_AMORTIZATION,
    hint: '奢侈品可能增值，建议不分摊',
  },
  [AssetCategory.PRECIOUS_METAL]: {
    type: AmortizationType.NO_AMORTIZATION,
    hint: '贵金属不折旧，建议不分摊',
  },
  [AssetCategory.OTHER]: {
    type: AmortizationType.SIMPLE_LINEAR,
    hint: '默认简单线性',
  },
};

/**
 * Recommend an amortization method based on asset category.
 * Pure function — no side effects, deterministic output.
 */
export function recommendAmortization(category: AssetCategory): AmortizationRecommendation {
  return RECOMMENDATION_TABLE[category];
}
