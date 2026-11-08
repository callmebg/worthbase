/**
 * WorthBase (家底) - Account Liquidity Buckets
 *
 * Single source of truth for "can this account's money be spent right now?".
 *
 * 分类规则（互斥且穷尽）：
 *   liability  —— 类型属于 LIABILITY_ACCOUNT_TYPES（信用卡、贷款）
 *   restricted —— 类型属于 RESTRICTED_ACCOUNT_TYPES（公积金），**或** 有到期日且尚未到期
 *   available  —— 其余（含已到期的定期存款）
 *
 * 「受限」是**按今天能不能花**判定的，不是按类型判定的：公积金是永久受限，
 * 定期存款是临时受限，两者对用户意味着同一件事——这笔钱现在动不了。
 * 这样账户页的分组小计、总览页 hero 卡的「可用」、可用资金页的「可用活期」
 * 三处永远是同一个口径，不会出现两个看起来一样、含义却不同的数字。
 *
 * 未识别的类型一律回落 available，不抛错。
 */

import type { Account } from '@/types/models';
import { AccountType, LIABILITY_ACCOUNT_TYPES, RESTRICTED_ACCOUNT_TYPES } from '@/types/enums';
import { getCurrentDate } from '@/utils/format';

export type LiquidityBucket = 'available' | 'restricted' | 'liability';

/**
 * Classify one account as of a given date.
 * @param account The account to classify
 * @param asOfDate 'YYYY-MM-DD'; defaults to today
 */
export function classifyAccount(account: Account, asOfDate: string = getCurrentDate()): LiquidityBucket {
  if (LIABILITY_ACCOUNT_TYPES.has(account.type)) return 'liability';
  if (RESTRICTED_ACCOUNT_TYPES.has(account.type)) return 'restricted';
  // 定期存款：到期日之前受限，到期日当天及之后可用（含等于）
  if (account.maturityDate && account.maturityDate > asOfDate) return 'restricted';
  return 'available';
}

export interface AccountBuckets {
  available: Account[];
  restricted: Account[];
  liability: Account[];
}

/** Split a list of accounts into the three liquidity buckets as of a given date. */
export function bucketAccounts(
  accounts: Account[],
  asOfDate: string = getCurrentDate()
): AccountBuckets {
  const buckets: AccountBuckets = { available: [], restricted: [], liability: [] };
  for (const account of accounts) {
    buckets[classifyAccount(account, asOfDate)].push(account);
  }
  return buckets;
}

/**
 * Accounts that are restricted **only** because of a maturity date (i.e. would
 * become available on or before `targetDate`). Type-restricted accounts such as
 * 公积金 are excluded — they never unlock, no matter how far out the date is.
 */
export function depositsMaturingBy(accounts: Account[], targetDate: string, asOfDate: string = getCurrentDate()): Account[] {
  return accounts.filter(
    (a) =>
      !LIABILITY_ACCOUNT_TYPES.has(a.type) &&
      !RESTRICTED_ACCOUNT_TYPES.has(a.type) &&
      a.maturityDate !== null &&
      a.maturityDate > asOfDate &&
      a.maturityDate <= targetDate
  );
}

/** Type guard kept explicit so an unmapped AccountType can never silently mis-bucket. */
export function isKnownAccountType(type: string): type is AccountType {
  return Object.values(AccountType).includes(type as AccountType);
}
