## ADDED Requirements

### Requirement: Initial use count field on asset
The system SHALL provide an `initialUseCount` field on each asset, representing the number of times the item was used before the user started tracking in WorthBase. The field SHALL default to 0 and MUST be a non-negative integer.

#### Scenario: Create asset with default initial use count
- **WHEN** user creates a new asset with usage tracking enabled and does not specify an initial use count
- **THEN** the system SHALL set `initialUseCount` to 0

#### Scenario: Create asset with custom initial use count
- **WHEN** user creates a new asset with usage tracking enabled and sets initial use count to 50
- **THEN** the system SHALL store `initialUseCount = 50` for that asset

#### Scenario: Edit existing asset to add initial use count
- **WHEN** user edits an existing asset and sets initial use count to 30
- **THEN** the system SHALL update `initialUseCount` to 30

#### Scenario: Initial use count field hidden when usage tracking is off
- **WHEN** user creates an asset with usage tracking disabled
- **THEN** the initial use count input SHALL NOT be visible in the form

### Requirement: Cost-per-use calculation includes initial use count
The system SHALL calculate cost-per-use as `purchasePrice ÷ (initialUseCount + usageRecordCount)`, where `usageRecordCount` is the number of records in the `usage_records` table for that asset.

#### Scenario: Cost-per-use with initial count only
- **WHEN** an asset has `purchasePrice = ¥1000`, `initialUseCount = 50`, and 0 usage records
- **THEN** the system SHALL calculate `costPerUse = 1000 ÷ 50 = ¥20.00`

#### Scenario: Cost-per-use with both initial and recorded uses
- **WHEN** an asset has `purchasePrice = ¥1000`, `initialUseCount = 50`, and 10 usage records
- **THEN** the system SHALL calculate `costPerUse = 1000 ÷ (50 + 10) = ¥16.67`

#### Scenario: Cost-per-use with zero total uses
- **WHEN** an asset has `purchasePrice = ¥1000`, `initialUseCount = 0`, and 0 usage records
- **THEN** the system SHALL return `costPerUse = Infinity` (same as current behavior)

### Requirement: Total use count display includes initial count
The system SHALL display the total use count as `initialUseCount + usageRecordCount`. When `initialUseCount > 0`, the system SHALL show the breakdown: "初始 X 次 + 记录 Y 次 = 总计 Z 次". When `initialUseCount = 0`, the system SHALL display only the total count as before.

#### Scenario: Display use count with initial count breakdown
- **WHEN** an asset has `initialUseCount = 50` and 10 usage records
- **THEN** the system SHALL display "初始 50 次 + 记录 10 次 = 总计 60 次"

#### Scenario: Display use count without initial count
- **WHEN** an asset has `initialUseCount = 0` and 10 usage records
- **THEN** the system SHALL display "10 次" (same as current behavior)

### Requirement: Use count in usage result model
The `UsageResult` computed type SHALL include `initialUseCount` and `totalUseCount` fields, where `totalUseCount = initialUseCount + useCount` (the existing `useCount` field represents record count only).

#### Scenario: UsageResult includes initial count fields
- **WHEN** `UsageCalculator.calculate()` is called for an asset with `initialUseCount = 20` and 5 usage records
- **THEN** the returned `UsageResult` SHALL have `initialUseCount = 20`, `useCount = 5` (record count), and `totalUseCount = 25`

### Requirement: Database migration for initial use count
The system SHALL add an `initial_use_count INTEGER NOT NULL DEFAULT 0` column to the `assets` table via database migration v8.

#### Scenario: Migration on existing database
- **WHEN** a user with an existing database (version 7) opens the app after upgrade
- **THEN** the system SHALL run migration v8, adding `initial_use_count` column with default value 0 to all existing assets
