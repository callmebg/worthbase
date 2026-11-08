/**
 * WorthBase (家底) - Cash Flow Repository
 * CRUD + query by effective interval for household-level cash flows.
 *
 * 领域边界（见 design.md D4）：本表只管**不依附于资产**的固定支出（房租、宽带、
 * 人寿险）与**全部**固定收入（月薪、季度奖、年终奖）。依附于资产的支出仍在
 * `recurring_expenses` 里，喂持有成本计算。两者按构造互斥，相加不会重复计算。
 */

import { getDatabase, generateId } from './client';
import type { CashFlow } from '@/types/models';
import { CashFlowKind, normalizeCashFlowKind, normalizeExpenseFrequency } from '@/types/enums';

interface CashFlowRow {
  id: string;
  kind: string | null;
  name: string;
  amount: number;
  frequency: string | null;
  effective_from: string;
  effective_to: string | null;
  note: string | null;
  created_at: string;
}

function rowToCashFlow(row: CashFlowRow): CashFlow {
  return {
    id: row.id,
    kind: normalizeCashFlowKind(row.kind),
    name: row.name,
    amount: row.amount,
    frequency: normalizeExpenseFrequency(row.frequency),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    note: row.note,
    createdAt: row.created_at,
  };
}

export type NewCashFlow = Omit<CashFlow, 'id' | 'createdAt'>;

export const CashFlowRepository = {
  /** All cash flows, expenses first then income, each ordered by effective_from. */
  async getAll(): Promise<CashFlow[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<CashFlowRow>(
      `SELECT * FROM cash_flows ORDER BY kind, effective_from, created_at;`
    );
    return rows.map(rowToCashFlow);
  },

  async getById(id: string): Promise<CashFlow | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<CashFlowRow>(
      `SELECT * FROM cash_flows WHERE id = ?;`,
      id
    );
    return row ? rowToCashFlow(row) : null;
  },

  /** All cash flows of one direction. */
  async getByKind(kind: CashFlowKind): Promise<CashFlow[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<CashFlowRow>(
      `SELECT * FROM cash_flows WHERE kind = ? ORDER BY effective_from, created_at;`,
      kind
    );
    return rows.map(rowToCashFlow);
  },

  /**
   * Get cash flows effective for a specific month (YYYY-MM).
   * Effective means: effective_from <= month AND (effective_to IS NULL OR effective_to >= month).
   * Both bounds are inclusive — a flow ending in 2026-06 still counts for 2026-06.
   */
  async getEffectiveForMonth(month: string, kind?: CashFlowKind): Promise<CashFlow[]> {
    const db = getDatabase();
    let query = `SELECT * FROM cash_flows
      WHERE effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)`;
    const params: string[] = [month, month];
    if (kind) {
      query += ` AND kind = ?`;
      params.push(kind);
    }
    query += ` ORDER BY effective_from, created_at;`;
    const rows = await db.getAllAsync<CashFlowRow>(query, ...params);
    return rows.map(rowToCashFlow);
  },

  async create(cashFlow: NewCashFlow): Promise<CashFlow> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();
    const kind = normalizeCashFlowKind(cashFlow.kind);
    const frequency = normalizeExpenseFrequency(cashFlow.frequency);
    await db.runAsync(
      `INSERT INTO cash_flows (id, kind, name, amount, frequency, effective_from, effective_to, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id, kind, cashFlow.name, cashFlow.amount, frequency,
      cashFlow.effectiveFrom, cashFlow.effectiveTo ?? null, cashFlow.note ?? null, now
    );
    return {
      ...cashFlow,
      kind,
      frequency,
      effectiveTo: cashFlow.effectiveTo ?? null,
      note: cashFlow.note ?? null,
      id,
      createdAt: now,
    };
  },

  async update(id: string, updates: Partial<CashFlow>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.kind !== undefined) { fields.push('kind = ?'); values.push(normalizeCashFlowKind(updates.kind)); }
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.amount !== undefined) { fields.push('amount = ?'); values.push(updates.amount); }
    if (updates.frequency !== undefined) { fields.push('frequency = ?'); values.push(normalizeExpenseFrequency(updates.frequency)); }
    if (updates.effectiveFrom !== undefined) { fields.push('effective_from = ?'); values.push(updates.effectiveFrom); }
    // 显式传 null 表示「持续中」（清除结束月）
    if (updates.effectiveTo !== undefined) { fields.push('effective_to = ?'); values.push(updates.effectiveTo); }
    if (updates.note !== undefined) { fields.push('note = ?'); values.push(updates.note); }

    if (fields.length === 0) return;
    values.push(id);

    await db.runAsync(
      `UPDATE cash_flows SET ${fields.join(', ')} WHERE id = ?;`,
      ...values
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM cash_flows WHERE id = ?;', id);
  },

  /**
   * End a cash flow by setting effective_to (inclusive last month).
   */
  async endCashFlow(id: string, effectiveTo: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE cash_flows SET effective_to = ? WHERE id = ?;`,
      effectiveTo, id
    );
  },
};
