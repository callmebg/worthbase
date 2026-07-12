/**
 * WorthBase (家底) - SQLite Client
 * Singleton wrapper around expo-sqlite for database initialization and access.
 */

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from './schema';
import { runMigrations } from './migrations';

const DB_NAME = 'worthbase.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Initialize the database. Creates tables and indexes if they don't exist,
 * then runs any pending migrations.
 * Safe to call multiple times — returns the same promise.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // Enable foreign keys for cascade deletes
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create tables
    await db.execAsync(CREATE_TABLES_SQL);

    // Create indexes
    await db.execAsync(CREATE_INDEXES_SQL);

    // Run migrations (version-based)
    await runMigrations(db);

    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

/**
 * Get the database instance. Must call initDatabase() first.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

/**
 * Close the database connection. Used for testing or cleanup.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    initPromise = null;
  }
}

/**
 * Generate a UUID-like unique ID for database records.
 * Uses timestamp + random to avoid external dependencies.
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
