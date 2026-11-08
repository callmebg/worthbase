# Tasks — fix-settlement-cost-and-held-duration

## 1. 结算口径修正（净支出 / 日均成本）

- [x] 1.1 `src/engine/SettlementCalculator.ts`：`totalHoldingCost = accumulatedRecurring + accumulatedMaintenance`（剔除 `accumulatedAmortization`）；同步更新文件头部口径注释（净支出 = 购入价 + 现金性持有成本 − 卖价；折旧系购入价分摊、已由「贬值」体现，不计入）
- [x] 1.2 `src/types/models.ts`：更新 `SettlementResult.totalHoldingCost / netExpenditure` 的 JSDoc 为新口径；`accumulatedAmortization` 字段保留，注释标注"仅供参考，不计入 totalHoldingCost"

## 2. 「已持有」截止卖出日

- [x] 2.1 `src/utils/format.ts`：`getMonthsHeld(purchaseDate: string, endDate?: string | null)`，endDate 缺省为今天；整月语义（含起始月、最小 1 个月）不变
- [x] 2.2 `src/components/AssetDetailModal.tsx:403`：「已持有」改为 `getMonthsHeld(asset.purchaseDate, asset.sellDate)`
- [x] 2.3 `app/assets.tsx:323`：列表卡片 `months` 改为 `getMonthsHeld(asset.purchaseDate, asset.sellDate)`

## 3. 测试

- [x] 3.1 `__tests__/engine.test.ts`「Settlement calculation logic」组：`total holding cost = recurring + maintenance`（删去 amortization 项），净支出/日均用例数字随新口径修正
- [x] 3.2 `engine.test.ts` 新增纯计算回归（用户报告实例）：购入 6,999、卖出 2,400、持有 1,477 天、已折满且无现金成本 → 净支出 = 4,599 = 贬值额、日均 ≈ 3.11/天；并断言恒等式「贬值 + 累计持有成本 = 真实净支出」
- [x] 3.3 `getMonthsHeld` 新增单测（新建 `__tests__/format.test.ts`）：传 endDate 截止于卖出日、sellDate 为 null 回退今天、在用资产（不传 endDate）行为不变、跨月边界与"最小 1 个月"保持；顺带覆盖 formatDuration
- [x] 3.4 集成回归：`initMockDatabase()`（sql.js harness，接线于 `repository.test.ts`）真实调用 `SettlementCalculator.calculate()`，已折满资产断言 `netExpenditure === 4599`、`dailyAverageCost ≈ 3.12`（1475 天）；另加"现金成本叠加贬值"口径用例

## 4. 验证与收尾

- [x] 4.1 `npm test` 全绿（258/258：既有 249 + 新增 9）
- [x] 4.2 `npx tsc --noEmit` 退出码 0；lint 零告警
- [x] 4.3 `CHANGELOG.md` 增加 `[Unreleased]` Fixed 条目（中文，含旧口径实例说明：净支出曾重复计入购入价致日均成本虚高）
- [x] 4.4 真机/模拟器抽查：已售资产详情页结算卡片数字自洽（贬值 + 持有成本 = 净支出、净支出 ÷ 天数 = 日均）；「已持有」截止卖出日；资产列表「已售」筛选下卡片月数与详情页一致；卖出预览弹窗同口径 —— 用户真机验证通过（2026-11-08）
