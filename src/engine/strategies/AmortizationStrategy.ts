/**
 * WorthBase (家底) - Amortization Strategy Interface
 * Strategy pattern for holding cost amortization calculations.
 *
 * Each strategy implements 3 methods:
 * - calculateMonthlyCost: monthly amortization cost at a given date
 * - calculateAccumulated: total accumulated amortization up to a given date
 * - calculateRemaining: remaining unamortized purchase cost
 */

import type { Asset } from '@/types/models';

export interface AmortizationStrategy {
  /**
   * Calculate the monthly amortization cost for an asset at a given date.
   * @param asset The asset to calculate for
   * @param currentDate The date to calculate at (ISO 8601)
   * @returns Monthly amortization cost (0 or positive number)
   */
  calculateMonthlyCost(asset: Asset, currentDate: Date): number;

  /**
   * Calculate the total accumulated amortization cost up to a given date.
   * @param asset The asset to calculate for
   * @param currentDate The date to calculate at (ISO 8601)
   * @returns Total accumulated amortization (0 or positive number)
   */
  calculateAccumulated(asset: Asset, currentDate: Date): number;

  /**
   * Calculate the remaining unamortized purchase cost.
   * @param asset The asset to calculate for
   * @param currentDate The date to calculate at (ISO 8601)
   * @returns Remaining unamortized cost (0 or positive number, never negative)
   */
  calculateRemaining(asset: Asset, currentDate: Date): number;
}

/**
 * Utility: calculate the number of months between two dates (inclusive of start month).
 * E.g., Jan 15 to Jul 15 = 6 months; Jan 15 to Jan 16 = 1 month.
 */
export function monthsBetween(startDate: string, endDate: Date): number {
  const start = new Date(startDate + 'T00:00:00Z');
  const yearDiff = endDate.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = endDate.getUTCMonth() - start.getUTCMonth();
  let months = yearDiff * 12 + monthDiff;
  // Count the start month as month 1
  if (endDate.getUTCDate() >= start.getUTCDate()) {
    months += 1;
  } else {
    months += 0; // partial month still counts as a month held
  }
  // Minimum 1 month (even if purchased this month)
  return Math.max(1, months);
}

/**
 * Utility: calculate the number of days between two dates.
 */
export function daysBetween(startDate: string, endDate: Date): number {
  const start = new Date(startDate + 'T00:00:00Z');
  const diffMs = endDate.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
