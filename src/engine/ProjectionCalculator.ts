/**
 * WorthBase (家底) - Projection Calculator
 *
 * 估算达成净资产目标的日期。
 *
 * **公式（design.md D5）**
 *
 *   projected(month_i) = currentValue
 *                      + Σ_{k=1..i} 已知净流入(month_k)     ← 主项：用户亲手录入的收支
 *                      + residualSlope × i                  ← 残差：历史回归里我没建模的部分
 *
 * 已知现金流优先，线性回归退化为残差项。这样年终奖之类的脉冲式收入不再扭曲斜率，
 * 且**斜率为负不再等于「无法预测」**——历史在跌、但每月有确定净流入时，仍然给得出日期。
 *
 * **月数口径**：从锚点（最后一个历史数据点）的**下一月**开始逐月推进，锚点当月不计入
 * ——账户最新余额快照已经反映了当月现金流，再算一遍就是重复计算。
 *
 * 核心 `estimateProjectionDetail` 是**纯同步函数**：现金流由调用方以 `MonthlyNetInflow`
 * 注入，因此不碰数据库、可单测。`withCashFlows` 是薄薄的异步外壳，负责装载真实数据。
 */

import { CashFlowCalculator } from './CashFlowCalculator';
import type { MonthlyNetInflow } from './CashFlowCalculator';
import { addMonths } from '@/utils/months';

/** 预测结论的四种状态——UI 必须显式区分，不允许静默空白 */
export type ProjectionState =
  /** 当前净资产已达到或超过目标 */
  | 'achieved'
  /** 可以达成，给出了日期 */
  | 'achievable'
  /** 按当前速度达不成（月度净增长 ≤ 0） */
  | 'unreachable'
  /** 没有任何历史数据点，无法锚定当前值 */
  | 'insufficient-data';

export interface ProjectionDetail {
  /** 预计达成日期 'YYYY-MM-DD'；非 achievable 状态下为 null */
  achievementDate: string | null;
  /** 月均增长 = knownMonthlyInflow + residualMonthlyGrowth（展示用） */
  monthlyGrowth: number;
  /** 参与回归的历史数据点数 */
  dataPointsUsed: number;
  /** 距离目标还差多少（已达成时为 0） */
  gap: number;
  /** 预计还需几个月（可含小数）；非 achievable 状态下为 null */
  monthsNeeded: number | null;
  /** 锚定的当前净资产（最后一个历史数据点的值） */
  currentValue: number;
  /** 预测结论 */
  state: ProjectionState;
  /** 已知现金流的代表性月度净流入（未来 12 个月均值） */
  knownMonthlyInflow: number;
  /** 历史回归的月度残差斜率，可为负 */
  residualMonthlyGrowth: number;
}

/** 逐月推进的上限（600 个月 = 50 年），防止达不成时无限循环 */
const MAX_HORIZON_MONTHS = 600;

/** 一天的毫秒数按平均月长 30.44 天折算，与改动前的口径一致 */
const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

/** 参与回归的最大历史点数 */
const REGRESSION_WINDOW = 6;

/**
 * 对最近 REGRESSION_WINDOW 个点做线性回归，返回月度斜率。
 * 与改动前唯一的区别：**不再对 slope <= 0 短路**——负斜率是有效信息，不是「算不出来」。
 */
export function computeResidualSlope(
  historicalPoints: { date: string; value: number }[]
): { slope: number; used: number } {
  const points = historicalPoints.slice(-REGRESSION_WINDOW);
  const n = points.length;
  if (n < 2) return { slope: 0, used: n };

  const firstDate = new Date(points[0].date + 'T00:00:00Z');
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(points[i].date + 'T00:00:00Z');
    const x = (d.getTime() - firstDate.getTime()) / MS_PER_MONTH;
    const y = points[i].value;
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, used: n };

  return { slope: (n * sumXY - sumX * sumY) / denominator, used: n };
}

function formatDateUTC(time: number): string {
  const d = new Date(time);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const ProjectionCalculator = {
  /**
   * 纯同步预测。
   *
   * @param historicalPoints 历史净资产数据点（按时间升序）
   * @param goal 目标净资产
   * @param cashFlow 预加载的月度净流量求值器；省略时视为「没有录入任何现金流」
   */
  estimateProjectionDetail(
    historicalPoints: { date: string; value: number }[],
    goal: number,
    cashFlow?: MonthlyNetInflow | null
  ): ProjectionDetail {
    const { slope: residualMonthlyGrowth, used: dataPointsUsed } =
      computeResidualSlope(historicalPoints);

    // 没有任何历史点 → 连当前值都锚不住，不猜
    if (historicalPoints.length === 0) {
      return {
        achievementDate: null,
        monthlyGrowth: residualMonthlyGrowth,
        dataPointsUsed: 0,
        gap: Math.max(0, goal),
        monthsNeeded: null,
        currentValue: 0,
        state: 'insufficient-data',
        knownMonthlyInflow: 0,
        residualMonthlyGrowth,
      };
    }

    const anchor = historicalPoints[historicalPoints.length - 1];
    const currentValue = anchor.value;
    const anchorMonth = anchor.date.substring(0, 7);

    // 代表性月度净流入：未来 12 个月均值，摊平季度奖/年终奖
    const knownMonthlyInflow = cashFlow
      ? CashFlowCalculator.getRepresentativeMonthlyInflowWith(cashFlow, anchorMonth)
      : 0;

    const base = {
      dataPointsUsed,
      currentValue,
      knownMonthlyInflow,
      residualMonthlyGrowth,
      monthlyGrowth: knownMonthlyInflow + residualMonthlyGrowth,
    };

    // 已达成
    if (currentValue >= goal) {
      return { ...base, achievementDate: null, monthsNeeded: null, gap: 0, state: 'achieved' };
    }

    const gap = goal - currentValue;

    // 逐月推进：现金流按每个月的实际生效条目求值，不做「月额 × 月数」的简单乘法
    let value = currentValue;
    for (let i = 1; i <= MAX_HORIZON_MONTHS; i++) {
      const month = addMonths(anchorMonth, i);
      const inflow = cashFlow ? cashFlow.net(month) : 0;
      const delta = inflow + residualMonthlyGrowth;
      const previous = value;
      value += delta;

      if (value >= goal) {
        // 在本月内线性插值，得到一个具体日期而不是粗暴的月末
        const fraction = delta > 0 ? Math.min(1, Math.max(0, (goal - previous) / delta)) : 1;
        const monthsNeeded = i - 1 + fraction;
        const anchorTime = new Date(anchor.date + 'T00:00:00Z').getTime();
        return {
          ...base,
          achievementDate: formatDateUTC(anchorTime + monthsNeeded * MS_PER_MONTH),
          monthsNeeded,
          gap,
          state: 'achievable',
        };
      }

      // 本月没有任何增量，后面也不会再有——提前收工，别空转 600 次
      if (delta === 0) break;
    }

    return { ...base, achievementDate: null, monthsNeeded: null, gap, state: 'unreachable' };
  },

  /**
   * 异步外壳：装载真实现金流后调用纯函数版本。UI 用这个。
   */
  async withCashFlows(
    historicalPoints: { date: string; value: number }[],
    goal: number
  ): Promise<ProjectionDetail> {
    const cashFlow = await CashFlowCalculator.loadMonthlyNet();
    return this.estimateProjectionDetail(historicalPoints, goal, cashFlow);
  },

  /**
   * 基于历史净资产数据点估算达成目标的日期。
   * @returns 预计达成日期 'YYYY-MM-DD'，无法达成/数据不足/已达成时为 null
   */
  estimateAchievementDate(
    historicalPoints: { date: string; value: number }[],
    goal: number,
    cashFlow?: MonthlyNetInflow | null
  ): string | null {
    return this.estimateProjectionDetail(historicalPoints, goal, cashFlow).achievementDate;
  },

  /** `estimateAchievementDate` 的现金流感知版本。 */
  async estimateAchievementDateWithCashFlows(
    historicalPoints: { date: string; value: number }[],
    goal: number
  ): Promise<string | null> {
    return (await this.withCashFlows(historicalPoints, goal)).achievementDate;
  },
};
