# WorthBase (家底) — Project Memory

## Version Bumping

Always use the bump script — do NOT manually edit version numbers:

```bash
./scripts/bump-version.sh <version>          # versionCode auto +1
./scripts/bump-version.sh <version> <code>   # manual versionCode
./scripts/bump-version.sh <version> --dry    # preview only
```

Updates 3 files: `package.json`, `app.json`, `android/app/build.gradle`.

## Architecture

- React Native / Expo (SDK 55) with SQLite database
- Expo Router for navigation (file-based: `app/` directory)
- Zustand for state management
- `@gorhom/bottom-sheet` for modal sheets
- Lucide React Native for icons (~305 icons in registry)
- OpenSpec workflow for feature planning (`openspec/` directory)

## Key Directories

- `app/` — Screens (Expo Router)
- `src/components/` — Shared components
- `src/components/ui/` — Design system primitives (Icon, Button, Card, Chip, etc.)
- `src/db/` — SQLite repositories and migrations
- `src/engine/` — Business logic calculators (HoldingCost, Usage, Projection)
- `src/stores/` — Zustand stores
- `src/theme/` — Design tokens, icon mappings, theme config
- `src/types/` — TypeScript models and enums
- `scripts/` — Utility scripts (bump-version, etc.)

## Database Migrations

- Current version: v9 (see `src/db/migrations.ts`)
- Migrations must be idempotent
- Bump `CURRENT_VERSION` constant when adding new migration

## Known Pre-existing TS Errors (ignore these)

- `BottomSheet.tsx` — `BottomSheetDefaultBackdropProps` and `enableKeyboardHandling` type issues
- `app/index.tsx` — `currentValuation` not on `HoldingCostResult`

## Language

- UI text and comments are in Chinese (Simplified)
- Code identifiers in English
