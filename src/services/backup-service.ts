/**
 * WorthBase (家底) - Backup Service
 * AppState background event → copy db file to backup directory → keep latest 3 copies.
 */

import * as FileSystem from 'expo-file-system/legacy';
const documentDirectory = (FileSystem as any).documentDirectory as string;
const getInfoAsync = FileSystem.getInfoAsync as any;
const makeDirectoryAsync = FileSystem.makeDirectoryAsync as any;
const copyAsync = FileSystem.copyAsync as any;
const readDirectoryAsync = FileSystem.readDirectoryAsync as any;
const deleteAsync = FileSystem.deleteAsync as any;
import { getDatabase } from '@/db/client';

const BACKUP_DIR = `${documentDirectory}backups/`;
const MAX_BACKUPS = 3;

export const BackupService = {
  /**
   * Create a backup copy of the database file.
   * Called when the app goes to background.
   */
  createBackup: async (): Promise<void> => {
    try {
      // Ensure backup directory exists
      const dirInfo = await getInfoAsync(BACKUP_DIR);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
      }

      // Get the database file path
      const db = getDatabase();
      const dbPath = db.databasePath || `${documentDirectory}SQLite/worthbase.db`;
      const dbInfo = await getInfoAsync(dbPath);
      if (!dbInfo.exists) return;

      // Create timestamped backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${BACKUP_DIR}worthbase_${timestamp}.db`;
      await copyAsync({ from: dbPath, to: backupPath });

      // Clean old backups
      await BackupService.cleanOldBackups();
    } catch (err) {
      console.warn('Backup failed:', err);
    }
  },

  /**
   * Remove old backups, keeping only the most recent MAX_BACKUPS.
   */
  cleanOldBackups: async (): Promise<void> => {
    try {
      const files = await readDirectoryAsync(BACKUP_DIR);
      const backups = files
        .filter((f: string) => f.startsWith('worthbase_') && f.endsWith('.db'))
        .sort()
        .reverse();

      for (let i = MAX_BACKUPS; i < backups.length; i++) {
        await deleteAsync(`${BACKUP_DIR}${backups[i]}`, { idempotent: true });
      }
    } catch (err) {
      console.warn('Cleanup failed:', err);
    }
  },

  /**
   * List available backups.
   */
  listBackups: async (): Promise<string[]> => {
    try {
      const dirInfo = await getInfoAsync(BACKUP_DIR);
      if (!dirInfo.exists) return [];
      const files = await readDirectoryAsync(BACKUP_DIR);
      return files.filter((f: string) => f.startsWith('worthbase_') && f.endsWith('.db')).sort().reverse();
    } catch {
      return [];
    }
  },

  /**
   * Restore from a backup file.
   */
  restoreFromBackup: async (backupFileName: string): Promise<void> => {
    const backupPath = `${BACKUP_DIR}${backupFileName}`;
    const dbPath = `${documentDirectory}SQLite/worthbase.db`;
    await copyAsync({ from: backupPath, to: dbPath });
  },
};
