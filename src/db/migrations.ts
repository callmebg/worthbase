/**
 * WorthBase (家底) - Database Migrations
 * Version-based migration system. Each migration is a function that upgrades the DB
 * from version N to N+1. The db_version table tracks the current schema version.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

const CURRENT_VERSION = 5;

interface Migration {
  version: number;
  description: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

/**
 * List of all migrations. Add new migrations here when schema changes.
 * Each migration should be idempotent (safe to run even if already applied).
 */
const migrations: Migration[] = [
  // Version 1: Initial schema (tables and indexes already created by schema.ts)
  {
    version: 1,
    description: 'Initial schema',
    up: async (_db: SQLiteDatabase) => {},
  },
  // Version 2: Add soft-delete support to accounts
  {
    version: 2,
    description: 'Add deleted_at column to accounts for soft delete',
    up: async (db: SQLiteDatabase) => {
      const columns: Array<{ name: string }> = await db.getAllAsync('PRAGMA table_info(accounts);');
      const hasDeletedAt = columns.some((column) => column.name === 'deleted_at');

      if (!hasDeletedAt) {
        await db.execAsync(`
          ALTER TABLE accounts ADD COLUMN deleted_at TEXT;
        `);
      }
    },
  },
  // Version 3: Add ended_reason to recurring_expenses and index on accounts.deleted_at
  {
    version: 3,
    description: 'Add ended_reason column and deleted_at index',
    up: async (db: SQLiteDatabase) => {
      const columns: Array<{ name: string }> = await db.getAllAsync('PRAGMA table_info(recurring_expenses);');
      const hasEndedReason = columns.some((column) => column.name === 'ended_reason');

      if (!hasEndedReason) {
        await db.execAsync(`
          ALTER TABLE recurring_expenses ADD COLUMN ended_reason TEXT;
        `);
      }

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON accounts(deleted_at);
      `);
    },
  },
  // Version 4: Add weight_grams to assets (for precious metals)
  {
    version: 4,
    description: 'Add weight_grams column to assets for precious metals',
    up: async (db: SQLiteDatabase) => {
      const columns: Array<{ name: string }> = await db.getAllAsync('PRAGMA table_info(assets);');
      const hasWeightGrams = columns.some((column) => column.name === 'weight_grams');

      if (!hasWeightGrams) {
        await db.execAsync(`
          ALTER TABLE assets ADD COLUMN weight_grams REAL;
        `);
      }
    },
  },
  // Version 5: Merge FURNITURE + APPLIANCE categories into HOME
  {
    version: 5,
    description: 'Merge furniture and appliance categories into home',
    up: async (db: SQLiteDatabase) => {
      await db.execAsync(`
        UPDATE assets SET category = 'home' WHERE category IN ('furniture', 'appliance');
      `);
    },
  },
];

/**
 * Run all pending migrations. Creates the db_version table if it doesn't exist.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Create migration tracking table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS db_version (
      version INTEGER PRIMARY KEY NOT NULL,
      description TEXT,
      applied_at TEXT NOT NULL
    );
  `);

  // Get current version
  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM db_version;'
  );
  const currentVersion = result?.version ?? 0;

  if (currentVersion >= CURRENT_VERSION) return;

  // Run pending migrations in order
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await db.execAsync('BEGIN TRANSACTION;');
      try {
        await migration.up(db);
        await db.runAsync(
          'INSERT INTO db_version (version, description, applied_at) VALUES (?, ?, ?);',
          migration.version,
          migration.description,
          new Date().toISOString()
        );
        await db.execAsync('COMMIT;');
      } catch (error) {
        await db.execAsync('ROLLBACK;');
        throw error;
      }
    }
  }
}

/**
 * Get the current database schema version.
 */
export async function getDbVersion(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM db_version;'
  );
  return result?.version ?? 0;
}
