/**
 * WorthBase (家底) - Type Enumerations
 * Core enums for account types, asset categories, amortization methods, and asset lifecycle status.
 */

/** Account types supported by the app */
export enum AccountType {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BANK_CARD = 'bank_card',
  CASH = 'cash',
  FUND = 'fund',
  OTHER = 'other',
}

/** Human-readable labels for AccountType */
export const AccountTypeLabels: Record<AccountType, string> = {
  [AccountType.WECHAT]: '微信',
  [AccountType.ALIPAY]: '支付宝',
  [AccountType.BANK_CARD]: '银行卡',
  [AccountType.CASH]: '现金',
  [AccountType.FUND]: '基金',
  [AccountType.OTHER]: '其他',
};

/**
 * Icons (emoji) for AccountType
 * @deprecated Use ACCOUNT_TYPE_ICONS from '@/theme/icons' instead.
 */
export const AccountTypeIcons: Record<AccountType, string> = {
  [AccountType.WECHAT]: '💬',
  [AccountType.ALIPAY]: '💰',
  [AccountType.BANK_CARD]: '🏦',
  [AccountType.CASH]: '💵',
  [AccountType.FUND]: '📈',
  [AccountType.OTHER]: '💳',
};

/** Physical asset categories */
export enum AssetCategory {
  VEHICLE = 'vehicle',
  REAL_ESTATE = 'real_estate',
  ELECTRONICS = 'electronics',
  DIGITAL = 'digital',
  FURNITURE = 'furniture',
  APPLIANCE = 'appliance',
  LUXURY = 'luxury',
  PRECIOUS_METAL = 'precious_metal',
  OTHER = 'other',
}

/** Human-readable labels for AssetCategory */
export const AssetCategoryLabels: Record<AssetCategory, string> = {
  [AssetCategory.VEHICLE]: '车辆',
  [AssetCategory.REAL_ESTATE]: '房产',
  [AssetCategory.ELECTRONICS]: '电子产品',
  [AssetCategory.DIGITAL]: '数码产品',
  [AssetCategory.FURNITURE]: '家具',
  [AssetCategory.APPLIANCE]: '家电',
  [AssetCategory.LUXURY]: '奢侈品',
  [AssetCategory.PRECIOUS_METAL]: '贵金属',
  [AssetCategory.OTHER]: '其他',
};

/**
 * Icons (emoji) for AssetCategory
 * @deprecated Use ASSET_CATEGORY_ICONS from '@/theme/icons' instead.
 */
export const AssetCategoryIcons: Record<AssetCategory, string> = {
  [AssetCategory.VEHICLE]: '🚗',
  [AssetCategory.REAL_ESTATE]: '🏠',
  [AssetCategory.ELECTRONICS]: '📱',
  [AssetCategory.DIGITAL]: '💻',
  [AssetCategory.FURNITURE]: '🪑',
  [AssetCategory.APPLIANCE]: '🔌',
  [AssetCategory.LUXURY]: '⌚',
  [AssetCategory.PRECIOUS_METAL]: '💎',
  [AssetCategory.OTHER]: '📦',
};

/**
 * Amortization methods for holding cost calculation.
 * Users select one per asset at creation time, changeable at any time.
 */
export enum AmortizationType {
  /** 简单线性: purchase_price ÷ months_held (decreases over time) */
  SIMPLE_LINEAR = 'simple_linear',
  /** 预期寿命: purchase_price ÷ expected_lifespan_months (fixed) */
  EXPECTED_LIFESPAN = 'expected_lifespan',
  /** 残值分摊: (purchase_price - residual_value) ÷ expected_lifespan_months (fixed, accounts for residual) */
  RESIDUAL_VALUE = 'residual_value',
  /** 不分摊: monthly cost = 0 (only recurring expenses and maintenance count) */
  NO_AMORTIZATION = 'no_amortization',
}

/** Human-readable labels for AmortizationType */
export const AmortizationTypeLabels: Record<AmortizationType, string> = {
  [AmortizationType.SIMPLE_LINEAR]: '简单线性分摊',
  [AmortizationType.EXPECTED_LIFESPAN]: '预期寿命分摊',
  [AmortizationType.RESIDUAL_VALUE]: '残值分摊',
  [AmortizationType.NO_AMORTIZATION]: '不分摊',
};

/** Human-readable descriptions for AmortizationType */
export const AmortizationTypeDescriptions: Record<AmortizationType, string> = {
  [AmortizationType.SIMPLE_LINEAR]: '购入价 ÷ 已持有月数（随时间递减）',
  [AmortizationType.EXPECTED_LIFESPAN]: '购入价 ÷ 预期使用月数（每月固定）',
  [AmortizationType.RESIDUAL_VALUE]: '(购入价 - 预估残值) ÷ 预期使用月数（每月固定，考虑残值）',
  [AmortizationType.NO_AMORTIZATION]: '不计分摊，仅计算经常性支出和维护费用',
};

/**
 * Asset lifecycle status.
 * Transitions: active → retired, active → sold, retired → active, retired → sold.
 */
export enum AssetStatus {
  /** 使用中 */
  ACTIVE = 'active',
  /** 退役（不再使用，但未出售） */
  RETIRED = 'retired',
  /** 已售 */
  SOLD = 'sold',
}

/** Human-readable labels for AssetStatus */
export const AssetStatusLabels: Record<AssetStatus, string> = {
  [AssetStatus.ACTIVE]: '使用中',
  [AssetStatus.RETIRED]: '退役',
  [AssetStatus.SOLD]: '已售',
};

/** Colors for AssetStatus badges */
export const AssetStatusColors: Record<AssetStatus, string> = {
  [AssetStatus.ACTIVE]: '#4CAF50',
  [AssetStatus.RETIRED]: '#FF9800',
  [AssetStatus.SOLD]: '#9E9E9E',
};
