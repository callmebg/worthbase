/**
 * WorthBase (家底) - Balance Snapshot Repository
 * Store snapshots, query by date range, get balance history.
 */

import { getDatabase, generateId } from './client';
import type { BalanceSnapshot } from '@/types/models';

interface BalanceSnapshotRow {
  id: string;
  account_id: string;
  balance: number;
  snapshot_date: string;
}

function rowToSnapshot(row: BalanceSnapshotRow): BalanceSnapshot {
  return {
    id: row.id,
    accountId: row.account_id,
    balance: row.balance,
    snapshotDate: row.snapshot_date,
  };
}

export const BalanceSnapshotRepository = {
  /**
   * Store a new balance snapshot.
   */
  async create(snapshot: Omit<BalanceSnapshot, 'id'>): Promise<BalanceSnapshot> {
    const db = getDatabase();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO balance_snapshots (id, account_id, balance, snapshot_date)
       VALUES (?, ?, ?, ?);`,
      id, snapshot.accountId, snapshot.balance, snapshot.snapshotDate
    );
    return { ...snapshot, id };
  },

  /**
   * Get snapshots for an account within a date range.
   */
  async getByDateRange(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<BalanceSnapshot[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<BalanceSnapshotRow>(
      `SELECT * FROM balance_snapshots
       WHERE account_id = ? AND snapshot_date >= ? AND snapshot_date <= ?
       ORDER BY snapshot_date ASC;`,
      accountId, startDate, endDate
    );
    return rows.map(rowToSnapshot);
  },

  /**
   * Get all snapshots for an account, ordered by date.
   */
  async getByAccount(accountId: string): Promise<BalanceSnapshot[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<BalanceSnapshotRow>(
      `SELECT * FROM balance_snapshots WHERE account_id = ? ORDER BY snapshot_date DESC;`,
      accountId
    );
    return rows.map(rowToSnapshot);
  },

  /**
   * Get the latest snapshot across all accounts for a specific date.
   * Returns a map of accountId -> balance.
   */
  async getLatestSnapshotForDate(date: string): Promise<Map<string, number>> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ account_id: string; balance: number }>(
      `SELECT bs.account_id, bs.balance
       FROM balance_snapshots bs
       INNER JOIN (
         SELECT account_id, MAX(snapshot_date) as max_date
         FROM balance_snapshots WHERE snapshot_date <= ? GROUP BY account_id
       ) latest ON bs.account_id = latest.account_id AND bs.snapshot_date = latest.max_date
       INNER JOIN accounts a ON bs.account_id = a.id AND a.deleted_at IS NULL;`,
      date
    );
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.account_id, row.balance);
    }
    return map;
  },

  /**
   * Get all unique snapshot dates (for the balance history table).
   */
  async getAllSnapshotDates(): Promise<string[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ snapshot_date: string }>(
      `SELECT DISTINCT snapshot_date FROM balance_snapshots ORDER BY snapshot_date DESC;`
    );
    return rows.map(r => r.snapshot_date);
  },

  /**
   * Get all balances for a specific date across all accounts.
   */
  async getBalancesForDate(date: string): Promise<Map<string, number>> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ account_id: string; balance: number }>(
      `SELECT account_id, balance FROM balance_snapshots
       WHERE snapshot_date = ?;`,
      date
    );
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.account_id, row.balance);
    }
    return map;
  },
};
