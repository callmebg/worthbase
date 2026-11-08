/**
 * WorthBase (家底) - Recurring Expense Repository
 * CRUD + query by effective interval for recurring expenses.
 *
 * 领域边界（见 design.md D4）：本表只管**依附于资产**的经常性支出（车险、依附于
 * 房产的物业费），`asset_id` 保持 NOT NULL，喂持有成本 / 结算计算。
 * 房租、宽带、人寿险这类不依附于资产的支出，以及全部固定收入，走
 * `cash_flows` 表（见 cash-flow-repository.ts）。两表按构造互斥，相加不会重复计算。
 */

import { getDatabase, generateId } from './client';
import type { RecurringExpense } from '@/types/models';
import { ExpenseFrequency } from '@/types/enums';

interface RecurringExpenseRow {
  id: string;
  asset_id: string;
  name: string;
  amount: number;
  frequency: string | null;
  effective_from: string;
  effective_to: string | null;
  ended_reason: string | null;
  created_at: string;
}

function rowToRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    assetId: row.asset_id,
    name: row.name,
    amount: row.amount,
    frequency: (row.frequency as ExpenseFrequency) ?? ExpenseFrequency.MONTHLY,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    endedReason: row.ended_reason as RecurringExpense['endedReason'],
    createdAt: row.created_at,
  };
}

export const RecurringExpenseRepository = {
  /**
   * All asset-attached recurring expenses across every asset, including ended ones.
   * Used by the cash flow layer, which filters by effective month in memory.
   */
  async getAll(): Promise<RecurringExpense[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RecurringExpenseRow>(
      `SELECT * FROM recurring_expenses ORDER BY effective_from;`
    );
    return rows.map(rowToRecurringExpense);
  },

  async getByAsset(assetId: string): Promise<RecurringExpense[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RecurringExpenseRow>(
      `SELECT * FROM recurring_expenses WHERE asset_id = ? ORDER BY effective_from;`,
      assetId
    );
    return rows.map(rowToRecurringExpense);
  },

  /**
   * Get expenses effective for a specific month (YYYY-MM).
   * An expense is effective if effective_from <= month AND (effective_to IS NULL OR effective_to >= month).
   */
  async getForMonth(month: string, assetId?: string): Promise<RecurringExpense[]> {
    const db = getDatabase();
    let query = `SELECT * FROM recurring_expenses
      WHERE effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)`;
    const params: (string)[] = [month, month];
    if (assetId) {
      query += ` AND asset_id = ?`;
      params.push(assetId);
    }
    query += ` ORDER BY effective_from;`;
    const rows = await db.getAllAsync<RecurringExpenseRow>(query, ...params);
    return rows.map(rowToRecurringExpense);
  },

  /**
   * Get expenses effective within a month range [startMonth, endMonth].
   * Used for accumulated cost calculation.
   */
  async getForRange(
    assetId: string,
    startMonth: string,
    endMonth: string
  ): Promise<RecurringExpense[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RecurringExpenseRow>(
      `SELECT * FROM recurring_expenses
       WHERE asset_id = ?
         AND effective_from <= ?
         AND (effective_to IS NULL OR effective_to >= ?)
       ORDER BY effective_from;`,
      assetId, endMonth, startMonth
    );
    return rows.map(rowToRecurringExpense);
  },

  async create(expense: Omit<RecurringExpense, 'id' | 'createdAt' | 'endedReason'>): Promise<RecurringExpense> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO recurring_expenses (id, asset_id, name, amount, frequency, effective_from, effective_to, ended_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id, expense.assetId, expense.name, expense.amount, expense.frequency ?? ExpenseFrequency.MONTHLY, expense.effectiveFrom, expense.effectiveTo, null, now
    );
    return { ...expense, frequency: expense.frequency ?? ExpenseFrequency.MONTHLY, id, endedReason: null, createdAt: now };
  },

  async update(id: string, updates: Partial<RecurringExpense>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.amount !== undefined) { fields.push('amount = ?'); values.push(updates.amount); }
    if (updates.frequency !== undefined) { fields.push('frequency = ?'); values.push(updates.frequency); }
    if (updates.effectiveFrom !== undefined) { fields.push('effective_from = ?'); values.push(updates.effectiveFrom); }
    if (updates.effectiveTo !== undefined) { fields.push('effective_to = ?'); values.push(updates.effectiveTo); }
    if (updates.endedReason !== undefined) { fields.push('ended_reason = ?'); values.push(updates.endedReason); }

    if (fields.length === 0) return;
    values.push(id);

    await db.runAsync(
      `UPDATE recurring_expenses SET ${fields.join(', ')} WHERE id = ?;`,
      ...values
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM recurring_expenses WHERE id = ?;', id);
  },

  /**
   * End a recurring expense by setting effective_to.
   */
  async endExpense(id: string, effectiveTo: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE recurring_expenses SET effective_to = ? WHERE id = ?;`,
      effectiveTo, id
    );
  },

  /**
   * End a recurring expense with a reason.
   */
  async endExpenseWithReason(id: string, effectiveTo: string, reason: 'manual' | 'retired' | 'sold'): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE recurring_expenses SET effective_to = ?, ended_reason = ? WHERE id = ?;`,
      effectiveTo, reason, id
    );
  },
};
