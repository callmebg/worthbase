/**
 * WorthBase (家底) - Net Worth Calculator
 * Calculates net worth = account balances + asset valuations.
 */

import { AccountRepository } from '@/db/account-repository';
import { AssetRepository } from '@/db/asset-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { getStrategy } from './strategies';
import { bucketAccounts } from './accountBuckets';
import type {
  Account,
  Asset,
  NetWorthResult,
  NetWorthTrendPoint,
  ValuationHistory,
} from '@/types/models';
import { AssetStatus } from '@/types/enums';

/**
 * 趋势聚合需要的余额快照字段。
 * 刻意用最小结构而非 `BalanceSnapshot`——仓储的批量查询返回的是投影，
 * 强行要求完整类型会逼调用方去凑用不到的 id/createdAt。
 */
export interface TrendSnapshot {
  accountId: string;
  balance: number;
  snapshotDate: string;
}

/** 构建趋势序列所需的、已预取好的输入 */
export interface TrendSeriesInput {
  /** 活跃账户（用于过滤已软删除账户的历史快照） */
  accounts: Account[];
  /** 开启估值追踪的活跃资产 */
  trackedAssets: Asset[];
  /** 每个资产的估值历史，按 recorded_date 升序 */
  valuationHistories: Map<string, ValuationHistory[]>;
  /** 全部快照日期，按时间升序 */
  dates: string[];
  /** 全部余额快照，按时间升序 */
  snapshots: TrendSnapshot[];
}

export const NetWorthCalculator = {
  /**
   * Calculate the current net worth.
   *
   * 账户余额按流动性分成三桶（可用 / 受限 / 负债，见 accountBuckets.ts）。
   * **净资产总额与分桶之前完全一致** —— 拆的只是构成，不动任何历史数字。
   */
  async calculate(currentDate: Date = new Date()): Promise<NetWorthResult> {
    // 1. Liquid assets = sum of all account balances, split by liquidity bucket
    const balances = await AccountRepository.getAllLatestBalances();
    const accounts = await AccountRepository.getAll();
    const { availableLiquid, restrictedLiquid, liabilities, liquidAssets } =
      this.sumByBucket(accounts, balances, currentDate);

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

    const netWorth = liquidAssets + assetValuations;

    return {
      liquidAssets,
      availableLiquid,
      restrictedLiquid,
      liabilities,
      assetValuations,
      unamortizedCost,
      netWorth,
    };
  },

  /**
   * Sum the latest balance of each account into its liquidity bucket.
   * Accounts without any balance snapshot contribute 0.
   * `liquidAssets` is the three buckets added together — numerically identical
   * to the pre-bucketing total, kept for backwards compatibility.
   */
  sumByBucket(
    accounts: Account[],
    balances: Map<string, number>,
    currentDate: Date = new Date()
  ): {
    availableLiquid: number;
    restrictedLiquid: number;
    liabilities: number;
    liquidAssets: number;
  } {
    // 分桶以「今天」为准；toISOString 是 UTC，与项目其余日期口径保持一致
    const asOfDate = currentDate.toISOString().substring(0, 10);
    const buckets = bucketAccounts(accounts, asOfDate);

    const sum = (list: Account[]) =>
      list.reduce((total, account) => total + (balances.get(account.id) ?? 0), 0);

    const availableLiquid = sum(buckets.available);
    const restrictedLiquid = sum(buckets.restricted);
    const liabilities = sum(buckets.liability);

    return {
      availableLiquid,
      restrictedLiquid,
      liabilities,
      liquidAssets: availableLiquid + restrictedLiquid + liabilities,
    };
  },

  /**
   * 按日期构建净资产趋势序列。
   *
   * 原本这段聚合内联在 `app/index.tsx` 的 loadData 里；「可用/受限」拆分需要同样的
   * 按日期聚合逻辑，两处并行维护必然走偏，所以收回引擎层（design.md D7）。
   * **算法与数值与搬迁前逐点一致**——只是换了住址。
   *
   * 两个关键口径（都是既有行为的保留）：
   *  - 余额按「结转」而非「当天有快照才算」：某账户当天没更新，沿用它最近一次的余额
   *  - 估值取该日期之前最近一条记录，没有记录时回落到购入价
   *
   * @returns date → NetWorthTrendPoint 的映射
   */
  buildTrendSeries({
    accounts,
    trackedAssets,
    valuationHistories,
    dates,
    snapshots,
  }: TrendSeriesInput): Map<string, NetWorthTrendPoint> {
    const activeAccountIds = new Set(accounts.map((a) => a.id));
    const series = new Map<string, NetWorthTrendPoint>();

    const runningBalances = new Map<string, number>();
    let snapIdx = 0;

    for (const date of dates) {
      // 1. 结转余额：把该日期（含）之前的所有快照吃进 runningBalances
      while (snapIdx < snapshots.length && snapshots[snapIdx].snapshotDate <= date) {
        runningBalances.set(snapshots[snapIdx].accountId, snapshots[snapIdx].balance);
        snapIdx++;
      }
      let liquidAssets = 0;
      for (const [accountId, balance] of runningBalances.entries()) {
        if (activeAccountIds.has(accountId)) liquidAssets += balance;
      }

      // 2. 估值：反向扫描找 <= date 的最近一条，找不到就用购入价兜底
      let assetValuations = 0;
      for (const asset of trackedAssets) {
        const history = valuationHistories.get(asset.id) ?? [];
        let latestVal: number | null = null;
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].recordedDate <= date) {
            latestVal = history[i].valuation;
            break;
          }
        }
        assetValuations += latestVal ?? asset.purchasePrice;
      }

      series.set(date, {
        date,
        liquidAssets,
        assetValuations,
        netWorth: liquidAssets + assetValuations,
      });
    }

    return series;
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
