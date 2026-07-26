/**
 * WorthBase (家底) - Usage Repository
 * CRUD + query by asset for cost-per-use tracking records.
 */

import { getDatabase, generateId } from './client';
import type { UsageRecord } from '@/types/models';

interface UsageRow {
  id: string;
  asset_id: string;
  used_at: string;
  note: string | null;
  created_at: string;
}

function rowToUsage(row: UsageRow): UsageRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    usedAt: row.used_at,
    note: row.note,
    createdAt: row.created_at,
  };
}

export const UsageRepository = {
  async getByAsset(assetId: string): Promise<UsageRecord[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<UsageRow>(
      'SELECT * FROM usage_records WHERE asset_id = ? ORDER BY used_at DESC;',
      assetId
    );
    return rows.map(rowToUsage);
  },

  async getByAssetRecent(assetId: string, limit = 20): Promise<UsageRecord[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<UsageRow>(
      'SELECT * FROM usage_records WHERE asset_id = ? ORDER BY used_at DESC LIMIT ?;',
      assetId, limit
    );
    return rows.map(rowToUsage);
  },

  async getCount(assetId: string): Promise<number> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM usage_records WHERE asset_id = ?;',
      assetId
    );
    return result?.cnt ?? 0;
  },

  async getLastUsed(assetId: string): Promise<string | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ used_at: string }>(
      'SELECT used_at FROM usage_records WHERE asset_id = ? ORDER BY used_at DESC LIMIT 1;',
      assetId
    );
    return row?.used_at ?? null;
  },

  async getRecentCount(assetId: string, sinceDate: string): Promise<number> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM usage_records WHERE asset_id = ? AND used_at >= ?;',
      assetId, sinceDate
    );
    return result?.cnt ?? 0;
  },

  async create(record: Omit<UsageRecord, 'id' | 'createdAt'>): Promise<UsageRecord> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO usage_records (id, asset_id, used_at, note, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      id, record.assetId, record.usedAt, record.note, now
    );
    return { ...record, id, createdAt: now };
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM usage_records WHERE id = ?;', id);
  },
};
