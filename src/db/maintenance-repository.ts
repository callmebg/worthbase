/**
 * WorthBase (家底) - Maintenance Repository
 * CRUD + query by asset for one-time maintenance records.
 */

import { getDatabase, generateId } from './client';
import type { MaintenanceRecord } from '@/types/models';

interface MaintenanceRow {
  id: string;
  asset_id: string;
  name: string;
  amount: number;
  date: string;
  amortize: number;
  created_at: string;
}

function rowToMaintenance(row: MaintenanceRow): MaintenanceRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    name: row.name,
    amount: row.amount,
    date: row.date,
    amortize: !!row.amortize,
    createdAt: row.created_at,
  };
}

export const MaintenanceRepository = {
  async getByAsset(assetId: string): Promise<MaintenanceRecord[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<MaintenanceRow>(
      `SELECT * FROM maintenance_records WHERE asset_id = ? ORDER BY date DESC;`,
      assetId
    );
    return rows.map(rowToMaintenance);
  },

  async getByAssetAndDateRange(
    assetId: string,
    startDate: string,
    endDate: string
  ): Promise<MaintenanceRecord[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<MaintenanceRow>(
      `SELECT * FROM maintenance_records
       WHERE asset_id = ? AND date >= ? AND date <= ?
       ORDER BY date DESC;`,
      assetId, startDate, endDate
    );
    return rows.map(rowToMaintenance);
  },

  async create(record: Omit<MaintenanceRecord, 'id' | 'createdAt'>): Promise<MaintenanceRecord> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO maintenance_records (id, asset_id, name, amount, date, amortize, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      id, record.assetId, record.name, record.amount, record.date,
      record.amortize ? 1 : 0, now
    );
    return { ...record, id, createdAt: now };
  },

  async update(id: string, updates: Partial<MaintenanceRecord>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.amount !== undefined) { fields.push('amount = ?'); values.push(updates.amount); }
    if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date); }
    if (updates.amortize !== undefined) { fields.push('amortize = ?'); values.push(updates.amortize ? 1 : 0); }

    if (fields.length === 0) return;
    values.push(id);

    await db.runAsync(
      `UPDATE maintenance_records SET ${fields.join(', ')} WHERE id = ?;`,
      ...values
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM maintenance_records WHERE id = ?;', id);
  },
};
