## Purpose

数据完全本地、不做云端同步，因此导出与备份是用户对自己数据的唯一保障。覆盖 JSON 导出、切后台自动备份与文件系统操作。

## Requirements

### Requirement: File system operations
The export service, import service, and backup service SHALL use the `expo-file-system/legacy` import path to access file system operations (`documentDirectory`, `writeAsStringAsync`, `readAsStringAsync`, `copyAsync`, `deleteAsync`, `getInfoAsync`, `makeDirectoryAsync`, `readDirectoryAsync`, `EncodingType`). This ensures compatibility with Expo SDK 57 where the main `expo-file-system` entry point has migrated to a class-based API.

#### Scenario: All three services import from the legacy path
- **WHEN** the export, import and backup services are bundled
- **THEN** each SHALL import its file system API from `expo-file-system/legacy`, not from the `expo-file-system` entry point

#### Scenario: Required API surface is available
- **WHEN** any of the three services performs file I/O
- **THEN** it SHALL only use members exposed by the legacy API (`documentDirectory`, `writeAsStringAsync`, `readAsStringAsync`, `copyAsync`, `deleteAsync`, `getInfoAsync`, `makeDirectoryAsync`, `readDirectoryAsync`, `EncodingType`)

### Requirement: JSON export functionality
The system SHALL export all app data (accounts, assets, balance snapshots, recurring expenses, maintenance records, valuation history, settings) as a JSON file. The exported file SHALL be written to the app's document directory and shared via the system share dialog. The export operation SHALL use `FileSystem.documentDirectory` and `FileSystem.writeAsStringAsync` from the legacy API.

#### Scenario: Export contains every data domain
- **WHEN** user exports a JSON backup
- **THEN** the file SHALL contain accounts (including `maturityDate`), balance snapshots, assets, asset-attached recurring expenses, household cash flows (`cashFlows`), maintenance records, valuation history and settings

#### Scenario: Export is written then shared
- **WHEN** the export completes
- **THEN** the file SHALL have been written under `FileSystem.documentDirectory` and handed to the system share dialog

#### Scenario: Old backups still import
- **WHEN** user imports a backup produced before household cash flows existed
- **THEN** the import SHALL succeed, with missing `maturityDate` falling back to null and a missing `cashFlows` section falling back to empty

### Requirement: Automatic backup
The system SHALL automatically create database backups when the app enters the background. Backups SHALL be stored in a `backups/` subdirectory of the document directory. The system SHALL retain the 3 most recent backups. All file operations SHALL use the `expo-file-system/legacy` API.

#### Scenario: Backup on background
- **WHEN** the app transitions to the background
- **THEN** a database backup SHALL be created automatically

#### Scenario: Backups live in their own subdirectory
- **WHEN** a backup is created
- **THEN** it SHALL be stored under a `backups/` subdirectory of the document directory

#### Scenario: Only the 3 most recent are kept
- **WHEN** a 4th backup is created
- **THEN** the oldest SHALL be deleted so that exactly 3 remain

