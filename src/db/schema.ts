/**
 * WorthBase (家底) - Database Schema
 * SQLite CREATE TABLE statements and indexes.
 */

/** All CREATE TABLE statements, executed on first run */
export const CREATE_TABLES_SQL = `
-- 账户表
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 余额快照表
CREATE TABLE IF NOT EXISTS balance_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  balance REAL NOT NULL,
  snapshot_date TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 实物资产表
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  purchase_price REAL NOT NULL,
  amortization_type TEXT NOT NULL,
  expected_lifespan_months INTEGER,
  residual_value REAL,
  valuation_tracking INTEGER NOT NULL DEFAULT 0,
  current_valuation REAL,
  status TEXT NOT NULL DEFAULT 'active',
  sell_date TEXT,
  sell_price REAL,
  image_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 经常性支出表
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  ended_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- 一次性维护表
CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  amortize INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- 估值历史表
CREATE TABLE IF NOT EXISTS valuation_history (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL,
  valuation REAL NOT NULL,
  recorded_date TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- 应用设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

/** Performance indexes */
export const CREATE_INDEXES_SQL = `
-- 余额快照：按账户和日期查询
CREATE INDEX IF NOT EXISTS idx_snapshots_account_date ON balance_snapshots(account_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON balance_snapshots(snapshot_date);

-- 经常性支出：按资产和生效区间查询
CREATE INDEX IF NOT EXISTS idx_recurring_asset ON recurring_expenses(asset_id);
CREATE INDEX IF NOT EXISTS idx_recurring_effective ON recurring_expenses(effective_from, effective_to);

-- 一次性维护：按资产查询
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_records(date);

-- 估值历史：按资产和日期查询
CREATE INDEX IF NOT EXISTS idx_valuation_asset_date ON valuation_history(asset_id, recorded_date);

-- 资产：按状态和分类查询
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
`;
