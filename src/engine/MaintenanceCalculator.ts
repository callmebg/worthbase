/**
 * WorthBase (家底) - Maintenance Calculator
 * Handles one-time maintenance records: amortized vs non-amortized.
 */

import { MaintenanceRepository } from '@/db/maintenance-repository';
import { monthsBetween } from './strategies/AmortizationStrategy';
import type { Asset } from '@/types/models';

export const MaintenanceCalculator = {
  /**
   * Get the monthly amortized maintenance cost for an asset.
   * Amortized maintenance records are spread over the remaining holding months
   * from the maintenance date until the expected lifespan end (or indefinitely
   * if no expected lifespan).
   *
   * @param asset The asset
   * @param currentDate The current date
   * @returns Monthly amortized maintenance cost
   */
  async getAmortizedMonthly(asset: Asset, currentDate: Date): Promise<number> {
    const records = await MaintenanceRepository.getByAsset(asset.id);
    const amortizedRecords = records.filter(r => r.amortize);

    if (amortizedRecords.length === 0) return 0;

    let totalMonthly = 0;

    for (const record of amortizedRecords) {
      // Calculate remaining months from the maintenance date to current date
      // The maintenance cost is spread over the remaining holding period
      // "Remaining holding months" = months from maintenance date to now (at minimum 1)
      // But if we have expected lifespan, we should use that as the denominator
      const maintenanceDate = new Date(record.date);
      const monthsSinceMaintenance = monthsBetween(record.date, currentDate);

      // If the asset has expected lifespan, calculate remaining months at the time of maintenance
      let remainingMonths: number;
      if (asset.expectedLifespanMonths && asset.expectedLifespanMonths > 0) {
        const monthsBeforeMaintenance = monthsBetween(asset.purchaseDate, maintenanceDate);
        remainingMonths = Math.max(1, asset.expectedLifespanMonths - monthsBeforeMaintenance);
      } else {
        // No expected lifespan: spread over months held since maintenance
        remainingMonths = Math.max(1, monthsSinceMaintenance);
      }

      totalMonthly += record.amount / remainingMonths;
    }

    return totalMonthly;
  },

  /**
   * Get the total non-amortized maintenance cost for an asset.
   * These are recorded but not included in monthly cost.
   *
   * @param assetId The asset ID
   * @returns Total non-amortized maintenance cost
   */
  async getNonAmortizedTotal(assetId: string): Promise<number> {
    const records = await MaintenanceRepository.getByAsset(assetId);
    const nonAmortized = records.filter(r => !r.amortize);
    return nonAmortized.reduce((sum, r) => sum + r.amount, 0);
  },

  /**
   * Get all maintenance records for an asset (both amortized and non-amortized).
   */
  async getAllRecords(assetId: string) {
    return MaintenanceRepository.getByAsset(assetId);
  },

  /**
   * Calculate the total accumulated maintenance cost for an asset.
   * This includes both amortized and non-amortized records.
   */
  async getAccumulatedTotal(assetId: string): Promise<number> {
    const records = await MaintenanceRepository.getByAsset(assetId);
    return records.reduce((sum, r) => sum + r.amount, 0);
  },

  /**
   * Calculate the accumulated amortized maintenance cost for an asset up to current date.
   * This is the sum of (monthly_amortized * months_active) for each amortized record.
   */
  async getAccumulatedAmortized(asset: Asset, currentDate: Date): Promise<number> {
    const records = await MaintenanceRepository.getByAsset(asset.id);
    const amortizedRecords = records.filter(r => r.amortize);

    let total = 0;
    for (const record of amortizedRecords) {
      const maintenanceDate = new Date(record.date);
      const monthsSinceMaintenance = monthsBetween(record.date, currentDate);

      let remainingMonths: number;
      if (asset.expectedLifespanMonths && asset.expectedLifespanMonths > 0) {
        const monthsBeforeMaintenance = monthsBetween(asset.purchaseDate, maintenanceDate);
        remainingMonths = Math.max(1, asset.expectedLifespanMonths - monthsBeforeMaintenance);
      } else {
        remainingMonths = Math.max(1, monthsSinceMaintenance);
      }

      const monthlyCost = record.amount / remainingMonths;
      total += monthlyCost * monthsSinceMaintenance;
    }

    return total;
  },
};
