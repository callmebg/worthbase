## 1. Database Migration

- [x] 1.1 Add migration v8 in `src/db/migrations.ts`: `ALTER TABLE assets ADD COLUMN initial_use_count INTEGER NOT NULL DEFAULT 0`
- [x] 1.2 Update `CURRENT_VERSION` to 8 in `src/db/migrations.ts`
- [x] 1.3 Update `src/db/schema.ts` `CREATE_TABLES_SQL` to include `initial_use_count INTEGER NOT NULL DEFAULT 0` in the `assets` table definition

## 2. Data Model & Repository

- [x] 2.1 Add `initialUseCount: number` field to the `Asset` interface in `src/types/models.ts`
- [x] 2.2 Add `initialUseCount` and `totalUseCount` fields to the `UsageResult` interface in `src/types/models.ts`
- [x] 2.3 Update `src/db/asset-repository.ts` to read and write the `initial_use_count` column (row-to-model mapping and INSERT/UPDATE statements)

## 3. Calculation Engine

- [x] 3.1 Update `UsageCalculator.calculate()` in `src/engine/UsageCalculator.ts`: read `asset.initialUseCount`, compute `totalUseCount = initialUseCount + recordCount`, use `totalUseCount` for `costPerUse` calculation
- [x] 3.2 Update the returned `UsageResult` to include `initialUseCount` and `totalUseCount` fields

## 4. UI — Add/Edit Asset Form

- [x] 4.1 Add `initialUseCount` state variable in `src/components/AddAssetModal.tsx` (default 0)
- [x] 4.2 In step 2 of the form, when `usageTracking` is `true`, add a numeric input for "初始使用次数" with placeholder "已经用了多少次？"
- [x] 4.3 Pass `initialUseCount` to the asset data on save
- [x] 4.4 Populate `initialUseCount` from `editAsset` when editing an existing asset

## 5. UI — Asset Detail Display

- [x] 5.1 Update `src/components/AssetDetailModal.tsx` usage stats section: when `initialUseCount > 0`, display "初始 X 次 + 记录 Y 次 = 总计 Z 次"; otherwise display "X 次" as before
- [x] 5.2 Update the cost-per-use milestone toast logic to use `totalUseCount` instead of `useCount`

## 6. UI — Asset List & Dashboard

- [x] 6.1 Update `app/assets.tsx` `AssetCardItem` to use `totalUseCount` for display and milestone toast logic
- [x] 6.2 Update `app/index.tsx` dashboard "次均成本洞察" card to use `totalUseCount` for sorting and display

## 7. Import/Export Compatibility

- [x] 7.1 Update `src/services/export-service.ts` to include `initial_use_count` in asset export
- [x] 7.2 Update `src/services/import-service.ts` to handle `initial_use_count` field (with fallback to 0 for older export files)

## 8. Tests

- [x] 8.1 Add engine test: `UsageCalculator.calculate()` with non-zero `initialUseCount` and zero records
- [x] 8.2 Add engine test: `UsageCalculator.calculate()` with both `initialUseCount` and usage records
- [x] 8.3 Add engine test: `UsageCalculator.calculate()` with `initialUseCount = 0` and zero records (backward compatibility)
- [x] 8.4 Add repository test: create/update asset with `initialUseCount` round-trips through SQLite correctly
