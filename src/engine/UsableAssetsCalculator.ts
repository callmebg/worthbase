/**
 * WorthBase (家底) - Usable Assets Calculator
 *
 * 回答一个问题：**指定日期 D，你手上能动用多少钱？**
 *
 *   usable(D) = availableLiquid        今天就能花的活期余额
 *             + maturedDeposits        今天之后、D 之前（含 D）到期的定期本金
 *             + netCashFlow            当前月的下一月至 D 所在月的累计净现金流
 *
 * 三条铁律：
 *  1. 受限账户（公积金）**永不计入**，无论 D 有多远——等得再久它也取不出来
 *  2. 负债账户不计入
 *  3. 定期只算**本金**，不含任何利息；App 不计算、不存储、不展示利率
 *
 * 到期日判定含等于：`maturityDate <= D` 即视为已到期。
 */

import { AccountRepository } from '@/db/account-repository';
import { CashFlowCalculator } from './CashFlowCalculator';
import { bucketAccounts, depositsMaturingBy } from './accountBuckets';
import { getCurrentDate } from '@/utils/format';
import type { UsableAssetsResult } from '@/types/models';

export const UsableAssetsCalculator = {
  /**
   * @param targetDate 目标日期 'YYYY-MM-DD'
   * @param today      基准「今天」，默认取当前日期；传入以便测试
   */
  async calculate(targetDate: string, today: string = getCurrentDate()): Promise<UsableAssetsResult> {
    const [accounts, balances] = await Promise.all([
      AccountRepository.getAll(),
      AccountRepository.getAllLatestBalances(),
    ]);

    const balanceOf = (id: string) => balances.get(id) ?? 0;

    // 1. 今天就能花的：非负债、非受限类型、且（无到期日 或 已到期）
    const { available } = bucketAccounts(accounts, today);
    const availableLiquid = available.reduce((sum, account) => sum + balanceOf(account.id), 0);

    // 2. 今天之后才到期、但 D 之前（含）会解锁的定期本金
    const maturing = depositsMaturingBy(accounts, targetDate, today);
    const maturedDeposits = maturing.reduce((sum, account) => sum + balanceOf(account.id), 0);

    // 3. 累计净现金流。当前月不计入（余额快照已反映本月）；
    //    targetDate 早于今天时 monthsAfter 返回空区间，netCashFlow 自然为 0。
    const currentMonth = today.substring(0, 7);
    const targetMonth = targetDate.substring(0, 7);
    const accumulated = await CashFlowCalculator.accumulate(currentMonth, targetMonth);

    const total = availableLiquid + maturedDeposits + accumulated.total;

    return {
      targetDate,
      availableLiquid,
      maturedDeposits,
      netCashFlow: accumulated.total,
      total,
      monthsCounted: accumulated.months,
    };
  },
};
