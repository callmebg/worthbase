/**
 * WorthBase (家底) - Month Arithmetic
 *
 * 'YYYY-MM' 字符串的纯整数运算。**刻意不经过 Date 对象**——Date 会引入本地时区
 * 与 UTC 的歧义，而月份区间判定必须完全确定（effective_from / effective_to 的
 * 边界包含性直接影响金额，差一个月就是差一笔月薪）。
 */

/** Parse a 'YYYY-MM' string into its parts. Returns null for malformed input. */
export function parseMonth(month: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const m = Number(match[2]);
  if (m < 1 || m > 12) return null;
  return { year, month: m };
}

/** Format year/month parts back to 'YYYY-MM'. */
export function formatMonth(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

// 刻意不提供 Date → 'YYYY-MM' 的转换：项目里 `getCurrentMonth()` / `getCurrentDate()`
// （utils/format.ts）走的是 UTC（toISOString），再放一个本地时区版本进来，
// 早晚会有人在东八区的凌晨把两者混用，算出差一个月的现金流。

/** Shift a 'YYYY-MM' string by `delta` months (delta may be negative). Malformed input returns it unchanged. */
export function addMonths(month: string, delta: number): string {
  const parsed = parseMonth(month);
  if (!parsed) return month;
  const total = parsed.year * 12 + (parsed.month - 1) + delta;
  // 用 floor + 减法而非 `%`：JS 的 `%` 对负数返回负值，会算出 "-1-00" 这种月份
  const year = Math.floor(total / 12);
  return formatMonth(year, total - year * 12 + 1);
}

/**
 * Signed month distance from `fromMonth` to `toMonth` (toMonth − fromMonth). 0 when malformed.
 *
 * 命名刻意区别于 `AmortizationStrategy.monthsBetween(startDate, endDate: Date)`——
 * 那个按日期算持有月数，这个按 'YYYY-MM' 算月份差，语义不同。
 */
export function monthDiff(fromMonth: string, toMonth: string): number {
  const from = parseMonth(fromMonth);
  const to = parseMonth(toMonth);
  if (!from || !to) return 0;
  return to.year * 12 + (to.month - 1) - (from.year * 12 + (from.month - 1));
}

/**
 * Inclusive list of months from `startMonth` to `endMonth`.
 * Returns [] when endMonth < startMonth or either side is malformed.
 */
export function monthRange(startMonth: string, endMonth: string): string[] {
  const span = monthDiff(startMonth, endMonth);
  if (span < 0 || parseMonth(startMonth) === null) return [];
  const result: string[] = [];
  for (let i = 0; i <= span; i++) {
    result.push(addMonths(startMonth, i));
  }
  return result;
}

/**
 * Months **strictly after** `startMonth`, through `endMonth` inclusive.
 *
 * 这是「已知现金流累计」的口径：当前月不计入，因为账户最新余额快照已经反映了
 * 本月的现金流，再算一遍就是重复计算（design.md D5）。
 */
export function monthsAfter(startMonth: string, endMonth: string): string[] {
  return monthRange(addMonths(startMonth, 1), endMonth);
}
