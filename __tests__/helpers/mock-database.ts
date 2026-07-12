/// <reference types="jest" />

/**
 * WorthBase (家底) - Mock SQLite Database for Repository Integration Tests
 * Uses sql.js (pure JS SQLite compiled via Emscripten) to simulate expo-sqlite.
 * Implements the same async interface as SQLiteDatabase.
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from '@/db/schema';

let sqlJsModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let dbInstance: SqlJsDatabase | null = null;

/** A row in the mock database — all values are primitives */
type DBRow = Record<string, string | number | null | Uint8Array>;

/**
 * Convert sql.js column values to JS types.
 * sql.js returns Uint8Array for some types; convert to string/number.
 */
function normalizeValue(val: unknown): string | number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Uint8Array) {
    // Decode as UTF-8 string
    return new TextDecoder().decode(val);
  }
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  return String(val);
}

/**
 * The mock database object that mimics expo-sqlite's SQLiteDatabase interface.
 */
function createMockDb(db: SqlJsDatabase) {
  return {
    async execAsync(sql: string): Promise<void> {
      db.run(sql);
    },

    async runAsync(sql: string, ...params: (string | number | null)[]): Promise<void> {
      // sql.js uses ? for placeholders, same as SQLite
      db.run(sql, params as never);
    },

    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null> {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params as never);
        if (stmt.step()) {
          const row = stmt.getAsObject() as DBRow;
          const normalized: Record<string, string | number | null> = {};
          for (const [k, v] of Object.entries(row)) {
            normalized[k] = normalizeValue(v);
          }
          return normalized as unknown as T;
        }
        return null;
      } finally {
        stmt.free();
      }
    },

    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]> {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params as never);
        const results: T[] = [];
        while (stmt.step()) {
          const row = stmt.getAsObject() as DBRow;
          const normalized: Record<string, string | number | null> = {};
          for (const [k, v] of Object.entries(row)) {
            normalized[k] = normalizeValue(v);
          }
          results.push(normalized as unknown as T);
        }
        return results;
      } finally {
        stmt.free();
      }
    },

    async closeAsync(): Promise<void> {
      db.close();
    },

    async withTransactionAsync<T>(fn: () => Promise<T>): Promise<T> {
      db.run('BEGIN TRANSACTION;');
      try {
        const result = await fn();
        db.run('COMMIT;');
        return result;
      } catch (error) {
        db.run('ROLLBACK;');
        throw error;
      }
    },
  };
}

/**
 * Initialize the mock database with schema.
 * Call this in beforeAll() of integration test files.
 */
export async function initMockDatabase() {
  if (!sqlJsModule) {
    sqlJsModule = await initSqlJs();
  }
  dbInstance = new sqlJsModule.Database();
  // Enable foreign keys for cascade deletes (must be before table creation)
  dbInstance.run('PRAGMA foreign_keys = ON;');
  // Create tables and indexes
  dbInstance.run(CREATE_TABLES_SQL);
  dbInstance.run(CREATE_INDEXES_SQL);
  return createMockDb(dbInstance);
}

/**
 * Close and reset the mock database.
 * Call this in afterAll() or afterEach().
 */
export async function resetMockDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Get the mock database instance (for direct queries in tests).
 */
export function getMockDb() {
  if (!dbInstance) throw new Error('Mock database not initialized. Call initMockDatabase() first.');
  return createMockDb(dbInstance);
}
