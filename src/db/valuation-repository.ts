/**
 * WorthBase (家底) - Valuation Repository
 * CRUD + query history by asset for asset valuation tracking.
 */

import { getDatabase, generateId } from './client';
import type { ValuationHistory } from '@/types/models';

interface ValuationRow {
  id: string;
  asset_id: string;
  valuation: number;
  recorded_date: string;
}

function rowToValuation(row: ValuationRow): ValuationHistory {
  return {
    id: row.id,
    assetId: row.asset_id,
    valuation: row.valuation,
    recordedDate: row.recorded_date,
  };
}

export const ValuationRepository = {
  async getByAsset(assetId: string): Promise<ValuationHistory[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ValuationRow>(
      `SELECT * FROM valuation_history WHERE asset_id = ? ORDER BY recorded_date ASC;`,
      assetId
    );
    return rows.map(rowToValuation);
  },

  async getLatestByAsset(assetId: string): Promise<ValuationHistory | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<ValuationRow>(
      `SELECT * FROM valuation_history WHERE asset_id = ? ORDER BY recorded_date DESC LIMIT 1;`,
      assetId
    );
    return row ? rowToValuation(row) : null;
  },

  async create(record: Omit<ValuationHistory, 'id'>): Promise<ValuationHistory> {
    const db = getDatabase();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO valuation_history (id, asset_id, valuation, recorded_date)
       VALUES (?, ?, ?, ?);`,
      id, record.assetId, record.valuation, record.recordedDate
    );
    return { ...record, id };
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM valuation_history WHERE id = ?;', id);
  },

  /**
   * Get the latest valuation for all active assets as a map.
   */
  async getLatestForAllAssets(): Promise<Map<string, number>> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ asset_id: string; valuation: number }>(
      `SELECT vh.asset_id, vh.valuation
       FROM valuation_history vh
       INNER JOIN (
         SELECT asset_id, MAX(recorded_date) as max_date
         FROM valuation_history GROUP BY asset_id
       ) latest ON vh.asset_id = latest.asset_id AND vh.recorded_date = latest.max_date;`
    );
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.asset_id, row.valuation);
    }
    return map;
  },
};
