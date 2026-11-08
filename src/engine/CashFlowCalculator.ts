/**
 * WorthBase (家底) - Cash Flow Calculator
 *
 * 已知现金流的唯一咽喉点：把「不依附于资产的固定收支」(cash_flows) 与
 * 「依附于资产的经常性支出」(recurring_expenses) 合并成每月净流量。
 *
 * 两表按构造互斥（一张 asset-scoped、一张 household-scoped），相加不会重复计算。
 * 金额一律经 `toMonthlyAmount` 折算为月度等价（÷1 / ÷3 / ÷12），不复制折算逻辑。
 *
 * **月数口径**：累计区间为「当前月的下一月」至「目标月」（含两端）。当前月不计入
 * ——账户最新余额快照已经反映了本月的现金流，再算一遍就是重复计算（design.md D5）。
 *
 * 所有查询都在 `loadMonthlyNet()` 里一次装完，之后逐月求值是纯内存计算——
 * 预测要往前推几十上百个月，逐月查库会变成几百次 SQL。
 */

import { CashFlowRepository } from '@/db/cash-flow-repository';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import { toMonthlyAmount } from './RecurringExpenseCalculator';
import { CashFlowKind } from '@/types/enums';
import type { CashFlow, RecurringExpense } from '@/types/models';
import { addMonths, monthsAfter } from '@/utils/months';

/** 代表性月度净流量的预测窗口（月） */
export const REPRESENTATIVE_WINDOW_MONTHS = 12;

/** 单月收支拆解 */
export interface MonthlyCashFlowBreakdown {
  month: string;
  /** 固定收入月度等价合计 */
  income: number;
  /** 家庭固定支出月度等价合计（cash_flows） */
  householdExpense: number;
  /** 资产附属经常性支出月度等价合计（recurring_expenses） */
  assetExpense: number;
  /** income − householdExpense − assetExpense */
  net: number;
}

/** 累计结果 */
export interface CashFlowAccumulation {
  /** 区间内逐月净流量之和 */
  total: number;
  /** 计入的月份数（当前月不计入，目标月 <= 当前月时为 0） */
  months: number;
  /** total ÷ months；months 为 0 时为 0 */
  monthlyAverage: number;
}

/** 预加载后的纯函数求值器 */
export interface MonthlyNetInflow {
  /** 某月的完整收支拆解 */
  breakdown(month: string): MonthlyCashFlowBreakdown;
  /** 某月的净流量（breakdown(month).net 的快捷方式） */
  net(month: string): number;
}

/** 生效区间判定：effective_from <= month <= effective_to，两端含，effective_to 为 null 表示持续 */
function isEffective(item: { effectiveFrom: string; effectiveTo: string | null }, month: string): boolean {
  return item.effectiveFrom <= month && (item.effectiveTo === null || item.effectiveTo >= month);
}

export const CashFlowCalculator = {
  /**
   * 一次性装载全部现金流与资产附属支出，返回纯内存的逐月求值器。
   * 预测与累计都基于它，避免逐月查库。
   */
  async loadMonthlyNet(): Promise<MonthlyNetInflow> {
    return this.fromCashFlows(await CashFlowRepository.getAll());
  },

  /**
   * 用**调用方已经装好的** cash_flows 构建求值器。
   *
   * 给 UI 用：store 里的数据正是用户刚编辑过的那一份，直接拿它算既省一次查库，
   * 也让「cashFlows 变了要重算」在依赖数组里是一个真实用到的依赖。
   * 资产附属支出仍从库里取——它跟着资产走，不在现金流 store 里。
   */
  async fromCashFlows(cashFlows: CashFlow[]): Promise<MonthlyNetInflow> {
    const incomes = cashFlows.filter((f) => f.kind === CashFlowKind.INCOME);
    const householdExpenses = cashFlows.filter((f) => f.kind === CashFlowKind.EXPENSE);
    // 全部资产的附属支出，正是家庭层面的现金流出；生效月由 isEffective 在内存里判定
    const assetExpenses = await RecurringExpenseRepository.getAll();

    const sumEffective = (
      list: (CashFlow | RecurringExpense)[],
      month: string
    ): number =>
      list.reduce(
        (total, item) => (isEffective(item, month) ? total + toMonthlyAmount(item) : total),
        0
      );

    // 用局部函数而非对象方法里的 `this`：这个对象字面量被返回类型上下文定型后，
    // `this` 会被推断成 CashFlowCalculator 而不是求值器自己
    const breakdown = (month: string): MonthlyCashFlowBreakdown => {
      const income = sumEffective(incomes, month);
      const householdExpense = sumEffective(householdExpenses, month);
      const assetExpense = sumEffective(assetExpenses, month);
      return { month, income, householdExpense, assetExpense, net: income - householdExpense - assetExpense };
    };

    return {
      breakdown,
      net: (month: string) => breakdown(month).net,
    };
  },

  /** 单月已知净流量。 */
  async getMonthlyNetInflow(month: string): Promise<number> {
    const evaluator = await this.loadMonthlyNet();
    return evaluator.net(month);
  },

  /** 单月收支的逐项拆解，用于 UI 解释面板。 */
  async getMonthlyBreakdown(month: string): Promise<MonthlyCashFlowBreakdown> {
    const evaluator = await this.loadMonthlyNet();
    return evaluator.breakdown(month);
  },

  /**
   * 累计从 `currentMonth` 的**下一月**到 `toMonth`（含）的净现金流。
   * `toMonth` 早于或等于 `currentMonth` 时返回 total = 0、months = 0。
   */
  async accumulate(currentMonth: string, toMonth: string): Promise<CashFlowAccumulation> {
    const evaluator = await this.loadMonthlyNet();
    return this.accumulateWith(evaluator, currentMonth, toMonth);
  },

  /** `accumulate` 的纯计算版，复用已装载的求值器。 */
  accumulateWith(evaluator: MonthlyNetInflow, currentMonth: string, toMonth: string): CashFlowAccumulation {
    const months = monthsAfter(currentMonth, toMonth);
    if (months.length === 0) {
      return { total: 0, months: 0, monthlyAverage: 0 };
    }
    let total = 0;
    for (const month of months) {
      total += evaluator.net(month);
    }
    return { total, months: months.length, monthlyAverage: total / months.length };
  },

  /**
   * 代表性月度净流量：未来 {@link REPRESENTATIVE_WINDOW_MONTHS} 个月的平均。
   *
   * 用 12 个月而不是「下个月」，是为了让季度奖、年终奖这类非月付条目摊平——
   * 否则一个只在三月发年终奖的用户，其余十一个月的「月度净流入」都会显示成负的。
   * 口径与 `accumulate` 一致（不含当前月）。
   */
  getRepresentativeMonthlyInflowWith(evaluator: MonthlyNetInflow, currentMonth: string): number {
    const horizon = addMonths(currentMonth, REPRESENTATIVE_WINDOW_MONTHS);
    return this.accumulateWith(evaluator, currentMonth, horizon).monthlyAverage;
  },

  async getRepresentativeMonthlyInflow(currentMonth: string): Promise<number> {
    const evaluator = await this.loadMonthlyNet();
    return this.getRepresentativeMonthlyInflowWith(evaluator, currentMonth);
  },
};
