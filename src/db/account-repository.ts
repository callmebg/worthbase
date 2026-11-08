/**
 * WorthBase (家底) - Account Repository
 * CRUD operations + balance queries for accounts.
 * Uses soft delete: accounts are marked with deleted_at instead of being removed,
 * preserving balance history for trend charts and reporting.
 */

import { getDatabase, generateId } from './client';
import type { Account } from '@/types/models';
import { AccountType } from '@/types/enums';

interface AccountRow {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  sort_order: number;
  maturity_date: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AccountType,
    icon: row.icon,
    sortOrder: row.sort_order,
    // 老库升级前该列不存在，SELECT * 返回 undefined —— 统一归一为 null
    maturityDate: row.maturity_date ?? null,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Input shape for creating an account.
 * `maturityDate` is optional — omitting it means the account is immediately
 * available (subject to its type).
 */
export type NewAccount = Omit<
  Account,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'maturityDate'
> & { maturityDate?: string | null };

export const AccountRepository = {
  /** Get all active (non-deleted) accounts */
  async getAll(): Promise<Account[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<AccountRow>(
      'SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order, created_at;'
    );
    return rows.map(rowToAccount);
  },

  async getById(id: string): Promise<Account | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<AccountRow>(
      'SELECT * FROM accounts WHERE id = ?;',
      id
    );
    return row ? rowToAccount(row) : null;
  },

  async create(account: NewAccount): Promise<Account> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    const maturityDate = account.maturityDate ?? null;
    await db.runAsync(
      `INSERT INTO accounts (id, name, type, icon, sort_order, maturity_date, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
      id, account.name, account.type, account.icon, account.sortOrder, maturityDate, now, now
    );
    return { ...account, maturityDate, id, deletedAt: null, createdAt: now, updatedAt: now };
  },

  async update(id: string, updates: Partial<Account>): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
    if (updates.icon !== undefined) { fields.push('icon = ?'); values.push(updates.icon); }
    if (updates.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(updates.sortOrder); }
    // 显式传 null 表示清除到期日（恢复为随时可动用）
    if (updates.maturityDate !== undefined) { fields.push('maturity_date = ?'); values.push(updates.maturityDate); }

    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?;`,
      ...values
    );
  },

  /** Soft delete: mark account as deleted, preserve balance history */
  async delete(id: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?;',
      now, now, id
    );
  },

  /** Hard delete: physically remove account and its cascade data */
  async hardDelete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM accounts WHERE id = ?;', id);
  },

  /**
   * Get the latest balance for an account (from the most recent snapshot).
   */
  async getLatestBalance(accountId: string): Promise<number | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ balance: number }>(
      `SELECT balance FROM balance_snapshots
       WHERE account_id = ? ORDER BY snapshot_date DESC LIMIT 1;`,
      accountId
    );
    return result?.balance ?? null;
  },

  /**
   * Get the latest balance for all ACTIVE accounts as a map.
   * Only returns balances for non-deleted accounts.
   */
  async getAllLatestBalances(): Promise<Map<string, number>> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ account_id: string; balance: number }>(
      `SELECT bs.account_id, bs.balance
       FROM balance_snapshots bs
       INNER JOIN (
         SELECT account_id, MAX(snapshot_date) as max_date
         FROM balance_snapshots GROUP BY account_id
       ) latest ON bs.account_id = latest.account_id AND bs.snapshot_date = latest.max_date
       INNER JOIN accounts a ON bs.account_id = a.id AND a.deleted_at IS NULL;`
    );
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.account_id, row.balance);
    }
    return map;
  },
};
