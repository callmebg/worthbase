# WorthBase (家底) — Project Memory

## Version Bumping

Always use the bump script — do NOT manually edit version numbers:

```bash
./scripts/bump-version.sh <version>          # versionCode auto +1
./scripts/bump-version.sh <version> <code>   # manual versionCode
./scripts/bump-version.sh <version> --dry    # preview only
```

Updates 3 files: `package.json`, `app.json`, `android/app/build.gradle`.

Note: `/android` is **gitignored** (Expo CNG — `npx expo prebuild` regenerates it from
`app.json`), so the `build.gradle` change is local-only and never committed. CI produces
the native project itself, then re-checks all three with `npm run check:version -- --strict`.

Verify after bumping:

```bash
npm run check:version    # package.json / app.json / build.gradle must agree
```

Also update `CHANGELOG.md` (Keep a Changelog format, entries in Chinese).

## Releasing

`CHANGELOG.md` 是给开发者看的（全、技术细节）。**GitHub Release 的说明另写一份**，
放在 `docs/release-notes/<version>.md`，面向用户：讲能做什么了、升级须知、
以及「刻意没做」什么。

推 tag 即自动发布，不需要手动建 Release：

```bash
git tag 1.8.0 && git push && git push --tags
```

`ci.yml` 在 `tags: ['*.*.*']` 上触发（仓库历史的 tag **没有 `v` 前缀**），
gates 全绿 → 构建 APK → 用 runner 预装的 `gh` 发 Release，附件就是本 job
刚构建出来的那个 APK（发布物与 CI 验证物是同一个文件，不另起 workflow 重建）。
有 `docs/release-notes/<version>.md` 就用它当正文，没有则退回 `--generate-notes`。

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

- Current version: v11 (see `src/db/migrations.ts`)
- Migrations must be idempotent
- Bump `CURRENT_VERSION` constant when adding new migration
- **改不了列约束**：`client.ts` 开了 `PRAGMA foreign_keys = ON`，而 `runMigrations` 把每个
  migration 包在 `BEGIN/COMMIT` 里 —— SQLite 中该 pragma 在事务内是 no-op，所以标准的
  「先关外键 → 建新表 → 迁数据 → 改名」流程走不通。要改已有表的结构，优先**加新表**
  而不是重建旧表（v11 的 `cash_flows` 就是这么来的，见 `openspec/changes/future-usable-assets/design.md` D4）
- 安全的 migration 只有两种：`ALTER TABLE ... ADD COLUMN`（用 `PRAGMA table_info` 探测幂等）
  和 `CREATE TABLE IF NOT EXISTS`
- Migration 测试仅有 v11 一例（`__tests__/usable-assets.test.ts`，用 sql.js 造 v10 老库跑升级）；
  v1–v10 仍无覆盖 —— 见 `docs/test-plan.md` (gap G5 / task T9)

## Type Checking

`npx tsc --noEmit` must be **clean (exit 0)**. There is no "ignore these errors" list any more:
the two long-standing errors (`BottomSheet.tsx` backdrop/keyboard props, `app/index.tsx`
`currentValuation`) were fixed and CI now gates on typecheck. Do not add `@ts-ignore`
or re-introduce a tolerated-error list — fix the type instead.

## Testing

- `npm test` — 317 unit/integration tests (jest + ts-jest, sql.js for real-SQLite repository tests)
- `./scripts/adb-ui-test.sh` — on-device E2E harness (see `docs/test-plan.md` §4)
- Network features must be verified on a real device inside the mainland-China network:
  a `curl` that works from the dev machine does not prove the phone can reach the host
  (DNS poisoning / Cloudflare flakiness). See `docs/test-plan.md` §7 rule 8.

## Language

- UI text and comments are in Chinese (Simplified)
- Code identifiers in English
