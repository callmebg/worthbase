/**
 * WorthBase (家底) - Recurring Expense Calculator
 * Queries recurring expenses effective for a given month and sums them.
 * Amounts are normalized to a monthly equivalent based on billing frequency
 * (monthly ÷1, quarterly ÷3, yearly ÷12) — this is the single choke point,
 * so all downstream consumers (holding cost, settlement) see monthly values.
 */

import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import type { RecurringExpense } from '@/types/models';
import { EXPENSE_FREQUENCY_MONTHS, ExpenseFrequency } from '@/types/enums';

/** Monthly-equivalent amount of an expense (amount ÷ months covered by its billing period) */
export function toMonthlyAmount(expense: Pick<RecurringExpense, 'amount' | 'frequency'>): number {
  const months = EXPENSE_FREQUENCY_MONTHS[expense.frequency] ?? EXPENSE_FREQUENCY_MONTHS[ExpenseFrequency.MONTHLY];
  return expense.amount / months;
}

export const RecurringExpenseCalculator = {
  /**
   * Get all recurring expenses effective for a specific month (YYYY-MM).
   * @param month Year-month string like "2025-07"
   * @param assetId Optional asset ID to filter by
   */
  async getForMonth(month: string, assetId?: string): Promise<RecurringExpense[]> {
    return RecurringExpenseRepository.getForMonth(month, assetId);
  },

  /**
   * Sum the monthly-equivalent amount of all recurring expenses effective for a given month.
   * Yearly expenses contribute amount÷12, quarterly amount÷3.
   * @param month Year-month string like "2025-07"
   * @param assetId Optional asset ID to filter by
   */
  async getMonthlyTotal(month: string, assetId?: string): Promise<number> {
    const expenses = await this.getForMonth(month, assetId);
    return expenses.reduce((sum, e) => sum + toMonthlyAmount(e), 0);
  },

  /**
   * Calculate the total accumulated recurring expenses for an asset
   * from purchase month to the current month (inclusive).
   * @param assetId The asset ID
   * @param purchaseDate The asset's purchase date (ISO 8601)
   * @param currentMonth The current month (YYYY-MM)
   */
  async getAccumulatedTotal(
    assetId: string,
    purchaseDate: string,
    currentMonth: string
  ): Promise<number> {
    // Get all expenses for this asset
    const expenses = await RecurringExpenseRepository.getByAsset(assetId);

    // For each expense, calculate how many months it was effective
    // from purchase month to current month
    const startMonth = purchaseDate.substring(0, 7); // YYYY-MM
    let total = 0;

    for (const expense of expenses) {
      const effectiveFrom = expense.effectiveFrom;
      const effectiveTo = expense.effectiveTo ?? currentMonth;

      // Calculate the overlap between [effectiveFrom, effectiveTo] and [startMonth, currentMonth]
      const fromMonth = effectiveFrom > startMonth ? effectiveFrom : startMonth;
      const toMonth = effectiveTo < currentMonth ? effectiveTo : currentMonth;

      if (fromMonth <= toMonth) {
        const monthsActive = monthDiff(fromMonth, toMonth) + 1;
        // Partial billing periods are prorated by month (consistent with monthly display)
        total += toMonthlyAmount(expense) * monthsActive;
      }
    }

    return total;
  },
};

/**
 * Calculate the number of months between two YYYY-MM strings.
 */
function monthDiff(fromMonth: string, toMonth: string): number {
  const [fromYear, fromMonthNum] = fromMonth.split('-').map(Number);
  const [toYear, toMonthNum] = toMonth.split('-').map(Number);
  return (toYear - fromYear) * 12 + (toMonthNum - fromMonthNum);
}
