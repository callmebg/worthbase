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

- Current version: v10 (see `src/db/migrations.ts`)
- Migrations must be idempotent
- Bump `CURRENT_VERSION` constant when adding new migration
- No migration tests yet — see `docs/test-plan.md` (gap G5 / task T9)

## Type Checking

`npx tsc --noEmit` must be **clean (exit 0)**. There is no "ignore these errors" list any more:
the two long-standing errors (`BottomSheet.tsx` backdrop/keyboard props, `app/index.tsx`
`currentValuation`) were fixed and CI now gates on typecheck. Do not add `@ts-ignore`
or re-introduce a tolerated-error list — fix the type instead.

## Testing

- `npm test` — 249 unit/integration tests (jest + ts-jest, sql.js for real-SQLite repository tests)
- `./scripts/adb-ui-test.sh` — on-device E2E harness (see `docs/test-plan.md` §4)
- Network features must be verified on a real device inside the mainland-China network:
  a `curl` that works from the dev machine does not prove the phone can reach the host
  (DNS poisoning / Cloudflare flakiness). See `docs/test-plan.md` §7 rule 8.

## Language

- UI text and comments are in Chinese (Simplified)
- Code identifiers in English
