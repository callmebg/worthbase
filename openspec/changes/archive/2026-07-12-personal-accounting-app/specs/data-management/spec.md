## ADDED Requirements

### Requirement: Local database storage
The system SHALL store all data locally using SQLite on the device. No data SHALL be transmitted to any remote server.

#### Scenario: Offline operation
- **WHEN** the device has no internet connection
- **THEN** all app functions (add account, update balance, add asset, view charts) work normally without any network dependency

### Requirement: Automatic backup
The system SHALL automatically create a backup copy of the local database file each time the app is closed or backgrounded.

#### Scenario: Auto backup on exit
- **WHEN** user exits or backgrounds the app
- **THEN** system copies the current database file to a backup location, retaining the last 3 backup copies

### Requirement: Export data
The system SHALL allow users to export all data in two formats: JSON (complete backup for restore) and CSV (human-readable for analysis).

#### Scenario: Export as JSON
- **WHEN** user selects "Export" → "JSON Backup"
- **THEN** system generates a .json file containing all accounts, balance snapshots, assets, recurring expenses, maintenance records, valuation history, and settings, and saves it to the device's shared storage

#### Scenario: Export as CSV
- **WHEN** user selects "Export" → "CSV"
- **THEN** system generates CSV files for accounts, balance history, and assets, saved to the device's shared storage

### Requirement: Import data
The system SHALL allow users to import data from a previously exported JSON file, replacing or merging with existing data.

#### Scenario: Import from JSON
- **WHEN** user selects "Import" and chooses a previously exported JSON file
- **THEN** system displays a preview of the data to be imported, asks whether to replace or merge, and imports the data accordingly

### Requirement: Backup restore
The system SHALL allow users to view a list of automatic backups and restore from any backup file.

#### Scenario: View backup list
- **WHEN** user navigates to Settings → Data → Backup List
- **THEN** system displays a list of backup files with timestamps, showing up to 3 most recent backups

#### Scenario: Restore from backup
- **WHEN** user selects a backup file and confirms restore
- **THEN** system replaces the current database with the selected backup file and reloads all app data
