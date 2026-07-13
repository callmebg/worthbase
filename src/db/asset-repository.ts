/**
 * WorthBase (家底) - Asset Repository
 * CRUD + filter by status/category for physical assets.
 */

import { getDatabase, generateId } from './client';
import type { Asset } from '@/types/models';
import { AmortizationType, AssetCategory, AssetStatus } from '@/types/enums';

interface AssetRow {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  amortization_type: string;
  expected_lifespan_months: number | null;
  residual_value: number | null;
  valuation_tracking: number;
  current_valuation: number | null;
  status: string;
  sell_date: string | null;
  sell_price: number | null;
  weight_grams: number | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    category: row.category as AssetCategory,
    purchaseDate: row.purchase_date,
    purchasePrice: row.purchase_price,
    amortizationType: row.amortization_type as AmortizationType,
    expectedLifespanMonths: row.expected_lifespan_months,
    residualValue: row.residual_value,
    valuationTracking: !!row.valuation_tracking,
    currentValuation: row.current_valuation,
    status: row.status as AssetStatus,
    sellDate: row.sell_date,
    sellPrice: row.sell_price,
    weightGrams: row.weight_grams,
    imagePath: row.image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const AssetRepository = {
  async getAll(): Promise<Asset[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<AssetRow>(
      'SELECT * FROM assets ORDER BY created_at DESC;'
    );
    return rows.map(rowToAsset);
  },

  async getById(id: string): Promise<Asset | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<AssetRow>(
      'SELECT * FROM assets WHERE id = ?;', id
    );
    return row ? rowToAsset(row) : null;
  },

  async getByStatus(status: AssetStatus): Promise<Asset[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<AssetRow>(
      'SELECT * FROM assets WHERE status = ? ORDER BY created_at DESC;', status
    );
    return rows.map(rowToAsset);
  },

  async getByCategory(category: AssetCategory): Promise<Asset[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<AssetRow>(
      'SELECT * FROM assets WHERE category = ? ORDER BY created_at DESC;', category
    );
    return rows.map(rowToAsset);
  },

  async create(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO assets (
        id, name, category, purchase_date, purchase_price,
        amortization_type, expected_lifespan_months, residual_value,
        valuation_tracking, current_valuation, status,
        sell_date, sell_price, weight_grams, image_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id, asset.name, asset.category, asset.purchaseDate, asset.purchasePrice,
      asset.amortizationType, asset.expectedLifespanMonths, asset.residualValue,
      asset.valuationTracking ? 1 : 0, asset.currentValuation,
      asset.status, asset.sellDate, asset.sellPrice, asset.weightGrams, asset.imagePath, now, now
    );
    return { ...asset, id, createdAt: now, updatedAt: now };
  },

  async update(id: string, updates: Partial<Asset>): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.purchaseDate !== undefined) { fields.push('purchase_date = ?'); values.push(updates.purchaseDate); }
    if (updates.purchasePrice !== undefined) { fields.push('purchase_price = ?'); values.push(updates.purchasePrice); }
    if (updates.amortizationType !== undefined) { fields.push('amortization_type = ?'); values.push(updates.amortizationType); }
    if (updates.expectedLifespanMonths !== undefined) { fields.push('expected_lifespan_months = ?'); values.push(updates.expectedLifespanMonths); }
    if (updates.residualValue !== undefined) { fields.push('residual_value = ?'); values.push(updates.residualValue); }
    if (updates.valuationTracking !== undefined) { fields.push('valuation_tracking = ?'); values.push(updates.valuationTracking ? 1 : 0); }
    if (updates.currentValuation !== undefined) { fields.push('current_valuation = ?'); values.push(updates.currentValuation); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.sellDate !== undefined) { fields.push('sell_date = ?'); values.push(updates.sellDate); }
    if (updates.sellPrice !== undefined) { fields.push('sell_price = ?'); values.push(updates.sellPrice); }
    if (updates.weightGrams !== undefined) { fields.push('weight_grams = ?'); values.push(updates.weightGrams); }
    if (updates.imagePath !== undefined) { fields.push('image_path = ?'); values.push(updates.imagePath); }

    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE assets SET ${fields.join(', ')} WHERE id = ?;`,
      ...values
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM assets WHERE id = ?;', id);
  },

  /**
   * Mark an asset as retired (stops amortization and recurring expenses).
   */
  async markRetired(id: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE assets SET status = 'retired', updated_at = ? WHERE id = ?;`,
        now, id
      );
      // End all active recurring expenses
      const currentMonth = now.substring(0, 7);
      await db.runAsync(
        `UPDATE recurring_expenses SET effective_to = ?, ended_reason = 'retired' WHERE asset_id = ? AND effective_to IS NULL;`,
        currentMonth, id
      );
    });
  },

  /**
   * Record a sale for an asset.
   */
  async recordSale(id: string, sellDate: string, sellPrice: number): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE assets SET status = 'sold', sell_date = ?, sell_price = ?, updated_at = ? WHERE id = ?;`,
      sellDate, sellPrice, now, id
    );
    // End all active recurring expenses
    const sellMonth = sellDate.substring(0, 7);
    await db.runAsync(
      `UPDATE recurring_expenses SET effective_to = ? WHERE asset_id = ? AND effective_to IS NULL;`,
      sellMonth, id
    );
  },

  /**
   * Restore a retired asset back to active status.
   * Re-opens ended recurring expenses (sets effective_to back to NULL).
   */
  async restoreActive(id: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE assets SET status = 'active', updated_at = ? WHERE id = ?;`,
      now, id
    );
    // Re-open recurring expenses that were ended on retirement
    await db.runAsync(
      `UPDATE recurring_expenses SET effective_to = NULL, ended_reason = NULL WHERE asset_id = ? AND effective_to IS NOT NULL AND ended_reason = 'retired';`,
      id
    );
  },
};
