## Purpose

数据完全本地、不做云端同步，因此导出与备份是用户对自己数据的唯一保障。覆盖 JSON 导出、切后台自动备份与文件系统操作。

## Requirements

### Requirement: File system operations
The export service, import service, and backup service SHALL use the `expo-file-system/legacy` import path to access file system operations (`documentDirectory`, `writeAsStringAsync`, `readAsStringAsync`, `copyAsync`, `deleteAsync`, `getInfoAsync`, `makeDirectoryAsync`, `readDirectoryAsync`, `EncodingType`). This ensures compatibility with Expo SDK 57 where the main `expo-file-system` entry point has migrated to a class-based API.

### Requirement: JSON export functionality
The system SHALL export all app data (accounts, assets, balance snapshots, recurring expenses, maintenance records, valuation history, settings) as a JSON file. The exported file SHALL be written to the app's document directory and shared via the system share dialog. The export operation SHALL use `FileSystem.documentDirectory` and `FileSystem.writeAsStringAsync` from the legacy API.

### Requirement: Automatic backup
The system SHALL automatically create database backups when the app enters the background. Backups SHALL be stored in a `backups/` subdirectory of the document directory. The system SHALL retain the 3 most recent backups. All file operations SHALL use the `expo-file-system/legacy` API.
