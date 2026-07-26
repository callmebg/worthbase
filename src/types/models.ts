/**
 * WorthBase (家底) - TypeScript Type Models
 * Core data models matching the SQLite database schema.
 */

import type {
  AccountType,
  AmortizationType,
  AssetCategory,
  AssetStatus,
} from './enums';

/** 账户 - represents a financial account (WeChat, Alipay, bank, etc.) */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  icon: string | null;
  sortOrder: number;
  /** Soft delete timestamp — null means active */
  deletedAt: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** 余额快照 - a point-in-time record of an account's balance */
export interface BalanceSnapshot {
  id: string;
  accountId: string;
  balance: number;
  snapshotDate: string; // ISO 8601 date (YYYY-MM-DD)
}

/** 实物资产 - a physical asset (car, phone, house, etc.) */
export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  purchaseDate: string; // ISO 8601 date
  purchasePrice: number;
  /** Amortization method selected by the user */
  amortizationType: AmortizationType;
  /** Expected lifespan in months (required for EXPECTED_LIFESPAN and RESIDUAL_VALUE) */
  expectedLifespanMonths: number | null;
  /** Estimated residual value (required for RESIDUAL_VALUE) */
  residualValue: number | null;
  /** Whether valuation tracking is enabled */
  valuationTracking: boolean;
  /** Current estimated valuation */
  currentValuation: number | null;
  /** Whether cost-per-use tracking is enabled */
  usageTracking: boolean;
  /** Asset lifecycle status */
  status: AssetStatus;
  /** Sell date (set when status becomes SOLD) */
  sellDate: string | null; // ISO 8601 date
  /** Sell price (set when status becomes SOLD) */
  sellPrice: number | null;
  /** Weight in grams (used for precious metals) */
  weightGrams: number | null;
  /** Path to asset image file (local file system) */
  imagePath: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** 经常性支出 - recurring expense attached to an asset (phone bill, insurance, etc.) */
export interface RecurringExpense {
  id: string;
  assetId: string;
  name: string;
  amount: number;
  /** Date from which this expense is effective (YYYY-MM) */
  effectiveFrom: string;
  /** Date until which this expense is effective (YYYY-MM), null = ongoing */
  effectiveTo: string | null;
  /** Reason the expense was ended: manual, retired, sold, or null if ongoing */
  endedReason: 'manual' | 'retired' | 'sold' | null;
  createdAt: string; // ISO 8601
}

/** 一次性维护 - one-time maintenance record (repair, battery replacement, etc.) */
export interface MaintenanceRecord {
  id: string;
  assetId: string;
  name: string;
  amount: number;
  date: string; // ISO 8601 date
  /** If true, cost is spread over remaining holding months; if false, recorded only */
  amortize: boolean;
  createdAt: string; // ISO 8601
}

/** 估值历史 - historical valuation record for an asset */
export interface ValuationHistory {
  id: string;
  assetId: string;
  valuation: number;
  recordedDate: string; // ISO 8601 date
}

/** 使用记录 - a single usage event for cost-per-use tracking */
export interface UsageRecord {
  id: string;
  assetId: string;
  usedAt: string; // ISO 8601 date (YYYY-MM-DD)
  note: string | null;
  createdAt: string; // ISO 8601
}

/** 应用设置 - key-value settings store */
export interface Settings {
  id: string;
  key: string;
  /** JSON-encoded value */
  value: string;
}

// ──────────────────────────────────────────────
// Computed Types (not stored in DB, calculated at runtime)
// ──────────────────────────────────────────────

/** 持有成本计算结果 - the result of holding cost calculation for an asset */
export interface HoldingCostResult {
  /** Monthly amortization cost */
  monthlyAmortization: number;
  /** Monthly recurring expenses total */
  monthlyRecurring: number;
  /** Monthly amortized maintenance cost */
  monthlyMaintenance: number;
  /** Total monthly holding cost (amortization + recurring + maintenance) */
  monthlyTotal: number;
  /** Daily average holding cost (monthlyTotal ÷ 30) */
  dailyAverage: number;
  /** Accumulated cost since purchase */
  accumulatedTotal: number;
  /** Remaining unamortized purchase cost */
  remainingUnamortized: number;
}

/** 卖出结算 - settlement result when an asset is sold */
export interface SettlementResult {
  purchasePrice: number;
  sellPrice: number;
  /** Depreciation = purchasePrice - sellPrice (can be negative if appreciated) */
  depreciation: number;
  /** Total accumulated recurring expenses */
  accumulatedRecurring: number;
  /** Total accumulated maintenance costs */
  accumulatedMaintenance: number;
  /** Total accumulated amortization cost */
  accumulatedAmortization: number;
  /** Total holding cost = recurring + maintenance + amortization */
  totalHoldingCost: number;
  /** True net expenditure = purchasePrice + totalHoldingCost - sellPrice */
  netExpenditure: number;
  /** Days of ownership */
  ownershipDays: number;
  /** Daily average cost = netExpenditure ÷ ownershipDays */
  dailyAverageCost: number;
}

/** 净资产计算结果 - net worth breakdown */
export interface NetWorthResult {
  /** Total liquid assets (sum of all account balances) */
  liquidAssets: number;
  /** Total asset valuations (sum of all active assets' current valuations) */
  assetValuations: number;
  /** Total unamortized purchase cost (internal use only, not shown to users) */
  unamortizedCost: number;
  /** Net worth = liquidAssets + assetValuations */
  netWorth: number;
}

/** 净资产趋势数据点 - a single data point in the net worth trend chart */
export interface NetWorthTrendPoint {
  date: string; // ISO 8601 date
  liquidAssets: number;
  assetValuations: number;
  netWorth: number;
}

/** 次均成本计算结果 */
export interface UsageResult {
  /** Total number of uses recorded */
  useCount: number;
  /** costPerUse = purchasePrice / useCount (Infinity if useCount=0) */
  costPerUse: number;
  /** Date of last use, null if never used */
  lastUsedAt: string | null;
  /** Days since last use (or days since purchase if never used) */
  daysSinceLastUse: number;
  /** True if unused for 90+ days (or never used and owned 90+ days) */
  isNeglected: boolean;
  /** Usage count in last 30 days */
  recentUseCount: number;
}

/** 闲置提醒条目 */
export interface UsageNeglect {
  assetId: string;
  assetName: string;
  category: string;
  daysSinceLastUse: number;
  costPerUse: number;
}

// ──────────────────────────────────────────────
// App Settings Types
// ──────────────────────────────────────────────

/** 应用配置 - structured representation of app settings */
export interface AppSettings {
  /** Whether app lock (PIN + biometric) is enabled */
  appLockEnabled: boolean;
  /** PIN hash (stored securely via expo-secure-store) */
  pinHash: string | null;
  /** Whether biometric authentication is enabled */
  biometricEnabled: boolean;
  /** Theme color key */
  themeColor: string;
  /** 'system' | 'light' | 'dark' */
  darkMode: 'system' | 'light' | 'dark';
  /** Currency symbol */
  currencySymbol: string;
  /** Net worth target amount */
  netWorthGoal: number | null;
}

/** Default app settings */
export const DEFAULT_SETTINGS: AppSettings = {
  appLockEnabled: false,
  pinHash: null,
  biometricEnabled: false,
  themeColor: '#6C5CE7',
  darkMode: 'system',
  currencySymbol: '¥',
  netWorthGoal: null,
};
