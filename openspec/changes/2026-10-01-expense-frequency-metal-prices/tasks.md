## 1. Database Migration (支出周期)

- [x] 1.1 Add migration v10 in `src/db/migrations.ts`: `ALTER TABLE recurring_expenses ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly'` (PRAGMA 检查，幂等)
- [x] 1.2 Update `CURRENT_VERSION` to 10 in `src/db/migrations.ts`
- [x] 1.3 Update `src/db/schema.ts` `recurring_expenses` DDL to include `frequency TEXT NOT NULL DEFAULT 'monthly'`

## 2. Data Model & Repository

- [x] 2.1 Add `ExpenseFrequency` enum + `ExpenseFrequencyLabels` / `ExpenseFrequencySuffixes` / `EXPENSE_FREQUENCY_MONTHS` in `src/types/enums.ts`
- [x] 2.2 Add `frequency: ExpenseFrequency` to `RecurringExpense` in `src/types/models.ts`
- [x] 2.3 Update `src/db/recurring-expense-repository.ts`: row type, `rowToRecurringExpense` (null → monthly), `create` INSERT, `update` field whitelist

## 3. Calculation Engine

- [x] 3.1 Add exported `toMonthlyAmount()` (amount ÷ 周期月数, unknown frequency falls back to monthly) in `src/engine/RecurringExpenseCalculator.ts`
- [x] 3.2 `getMonthlyTotal` sums monthly-equivalent amounts
- [x] 3.3 `getAccumulatedTotal` uses monthly-equivalent × monthsActive (不足整周期按月折算)
- [x] 3.4 下游 `HoldingCostCalculator` / `SettlementCalculator` / `HoldingCostBreakdown` 零改动（验证通过）

## 4. UI — AddAssetModal

- [x] 4.1 Step 3 添加表单增加 按月/按季/按年 `AppChip` 选择（默认按月，添加后重置）
- [x] 4.2 草稿行金额后缀按 frequency 显示 `/月 /季 /年`
- [x] 4.3 所有 `DraftRecurring` 字面量（添加、保存自动补录、编辑预填）与保存路径（diff-update、create）携带 frequency

## 5. UI — AssetDetailModal

- [x] 5.1 经常性支出列表金额后缀按 frequency 显示
- [x] 5.2 内联添加表单增加周期 Chip；`handleAddRecurring` 传入 frequency 并在成功后重置

## 6. Import / Export

- [x] 6.1 `import-service.ts`: `frequency` 缺失或非法时回落 `monthly`（兼容旧备份）
- [x] 6.2 `export-service.ts` 按模型原样导出，自动携带 frequency（无需改动，测试验证）

## 7. Metal Price Service (贵金属实时参考价)

- [x] 7.1 New `src/services/metal-price-service.ts`: `toCnyPerGram` 纯函数 + `MetalPriceService.getCached()/getPrices()`
- [x] 7.2 并行请求 XAU/XAG (api.gold-api.com) + USD→CNY (api.frankfurter.dev)，8s 超时 (AbortController)
- [x] 7.3 `SettingsRepository.setJSON('metal_price_cache', …)` 缓存 10 分钟；网络失败回落过期缓存 (stale=true)，无缓存返回 null
- [x] 7.4 AssetDetailModal: 贵金属资产（category=PRECIOUS_METAL 且有克数）打开时先展示缓存、后台刷新；"实时参考价"区块显示金/银价（元/克）、按金价/银价市值、更新时间与来源说明
- [x] 7.5 "更新估值"弹窗：有克数且有价格时显示"按金价填入 / 按银价填入"按钮，填入 价格×克数（四舍五入到元），可手改后保存（走现有 `updateValuation`）

## 8. 顺带修复（既有 bug）

- [x] 8.1 `ICON_REGISTRY` 补充 `BarChart3: ChartBar` 别名（lucide 新版更名导致 OnboardingView/ValuationChart 在测试中崩溃）
- [x] 8.2 `jest.setup.ts` 定义 `__DEV__ = true` 全局（Icon 缺失告警分支引用未定义变量导致 ReferenceError）

## 9. Tests

- [x] 9.1 `engine.test.ts`: `toMonthlyAmount` 月/季/年折算 + 未知周期回落（4 用例）
- [x] 9.2 `repository.test.ts`: frequency 存取 round-trip、update 变更周期、legacy 行默认 monthly（3 用例）
- [x] 9.3 `service.test.ts`: 导出含 frequency（默认 monthly）；旧备份导入回落 monthly、显式 yearly 保留、非法值回落（2 处）
- [x] 9.4 New `metal-price.test.ts`: `toCnyPerGram` 换算 + 缓存新鲜直返/过期刷新/失败回落/无缓存返回 null/HTTP 错误/畸形响应（9 用例）
- [x] 9.5 全量 `npm test` 237/237 通过；`npx tsc --noEmit` 仅剩 CLAUDE.md 列明的 2 处既有可忽略错误
