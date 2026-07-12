/**
 * WorthBase (家底) - Recurring Expense Calculator
 * Queries recurring expenses effective for a given month and sums them.
 */

import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import type { RecurringExpense } from '@/types/models';

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
   * Sum the monthly amount of all recurring expenses effective for a given month.
   * @param month Year-month string like "2025-07"
   * @param assetId Optional asset ID to filter by
   */
  async getMonthlyTotal(month: string, assetId?: string): Promise<number> {
    const expenses = await this.getForMonth(month, assetId);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
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
        total += expense.amount * monthsActive;
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
