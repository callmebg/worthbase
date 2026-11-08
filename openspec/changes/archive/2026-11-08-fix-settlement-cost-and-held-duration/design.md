# Design — fix-settlement-cost-and-held-duration

## Context

两个用户报告的 bug，均已在代码中定位根因：

1. **结算净支出重复计入购入价**：`src/engine/SettlementCalculator.ts` 中
   `totalHoldingCost = accumulatedRecurring + accumulatedMaintenance + accumulatedAmortization`，
   `netExpenditure = purchasePrice + totalHoldingCost − sellPrice`。
   而累计折旧（各 AmortizationStrategy 的 `calculateAccumulated`）本身就是购入价的分摊，上限即购入价。
   对已折满资产：`netExpenditure = 6,999 + 6,999 − 2,400 = 11,598`，`日均 = 11,598 ÷ 1,477 = 7.85/天`
   —— 与用户截图数字完全吻合（用户误以为是"全部资产总支出"，实为本资产购入价被计了两次）。
   `SettlementCalculator.calculate()` 是唯一咽喉点：详情页结算卡片与卖出预览弹窗（`preview()` 复用 `calculate()`）都走这里；
   `netExpenditure / totalHoldingCost` 的消费方仅这两个组件，结果即时计算、不落库。
2. **已持有算到今天**：`src/utils/format.ts` 的 `getMonthsHeld(purchaseDate)` 硬编码 `new Date()`。
   调用方两处：`AssetDetailModal.tsx:403`（详情页「已持有」）、`app/assets.tsx:323`（列表卡片——已售资产无
   holdingCost，卡片走 `{months}个月` 分支，同样受影响）。

约束：typecheck 必须零错误；既有 249 个测试必须通过（其中 `engine.test.ts` 有用例固化了旧口径，需同步修正）；
UI 文案中文；无数据库迁移。

## Goals / Non-Goals

**Goals:**

- 结算卡片三行数字自洽：`贬值 + 累计持有成本 = 真实净支出`、`真实净支出 ÷ 持有天数 = 日均成本`，且只含本资产数据
- 已售资产「已持有」在详情页与列表卡片一致截止于卖出日
- 回归测试锁定用户报告实例（6,999 / 2,400 / 1,477 天 → 净支出 4,599、日均 ≈ 3.11/天）

**Non-Goals:**

- 不改在用资产的持有成本口径（`HoldingCostCalculator` 的月度/日均本就正确：月折旧 + 月经常性 + 月维护，÷30）
- 不改 UI 标签文案（「已持有」「累计持有成本」等措辞不动，只修数值语义）
- 不删除 `SettlementResult.accumulatedAmortization` 字段
- 不做数据库迁移 / 导入导出变更；不在本 change 内 bump 版本（CHANGELOG 记 Fixed，版本随发布统一处理）

## Decisions

### D1: 修 `totalHoldingCost` 口径（剔除折旧），而非只改 `netExpenditure` 公式

- **方案 A（采用）**：`totalHoldingCost = accumulatedRecurring + accumulatedMaintenance`；
  `netExpenditure = purchasePrice + totalHoldingCost − sellPrice` 公式字符串不变，随口径自然修正。
- 方案 B（否决）：保留 totalHoldingCost 含折旧，单独改 `netExpenditure = depreciation + recurring + maintenance`。
- 理由：方案 B 会让画面自相矛盾——「累计持有成本 ¥6,999」大于「真实净支出 ¥4,599」，且
  `购入价 + 持有成本 − 卖价 = 净支出` 的可见恒等式被打破，用户需要额外解释；方案 A 让卡片三行直接互相印证。
  语义上折旧是购入价的会计分摊而非现金支出，「贬值」行已单独体现，剔除后「累计持有成本」回归其现金成本本义。

### D2: `accumulatedAmortization` 字段保留、仍计算仍返回

零类型字段变更（只改 JSDoc 口径注释），不影响任何消费方；未来若需在结算卡片展示"其中折旧 ¥X"也有数据可用。
删除字段会波及类型、计算器和测试，无收益。

### D3: `getMonthsHeld(purchaseDate, endDate?)` 可选参数，默认今天

函数体内 `new Date()` 替换为 `endDate ? new Date(endDate) : new Date()`，整月语义（含起始月、最小 1）不变。
两处调用点改为 `getMonthsHeld(asset.purchaseDate, asset.sellDate ?? undefined)`。
`sellDate` 类型为 `string | null`（ISO 日期）：正常卖出流程必填，null 时回退今天（防御性，行为等同现状）。
备选（否决）：新增独立函数 `getMonthsHeldUntil` —— 与现函数 95% 重复。

### D4: 测试三层布局

1. **修正既有口径用例**（`engine.test.ts` "Settlement calculation logic"）：
   `total holding cost = recurring + maintenance`（删去 amortization 项）；净支出/日均用例数字随口径更新。
2. **纯函数回归**（新增）：用户报告实例按新公式断言 `netExpenditure === depreciation`（无现金成本时）、
   `dailyAverage ≈ 3.11`；`getMonthsHeld` 的 endDate 截止、null 回退、跨月边界。
3. **集成回归**（新增）：借助 `__tests__/helpers/mock-database.ts` 的 `initMockDatabase()`（sql.js，
   repository 测试同款接线），真实调用 `SettlementCalculator.calculate()`——已折满资产断言
   `netExpenditure == 4599`、`dailyAverageCost ≈ 3.11`，端到端锁死"折旧不计入持有成本"。

## Risks / Trade-offs

- [用户对旧数字有记忆，修正后日均成本变小可能被质疑] → 结算卡片满足可见恒等式（贬值 + 持有成本 = 净支出），
  数字自解释；CHANGELOG 以实例说明旧口径错在何处。
- [「累计持有成本」剔除折旧后，纯折旧资产显示 ¥0，观感突兀] → 这正是事实（未发生现金持有成本），
  且与「贬值」行分开呈现，不构成误导；Non-Goal 已明确不改文案。
- [集成测试涉及 DB 接线，若 mock harness 与计算器仓储层不兼容会拖长实现] → 降级预案：仅保留第 1、2 层
  纯计算测试（口径修正点单一、逻辑可被纯公式完全覆盖），集成层不阻塞发布。
- [卖出预览弹窗数字随之变化] → 预期行为：预览与结算同口径本就是 `preview()` 复用 `calculate()` 的设计意图。

## Migration Plan

纯前端计算修正，结算结果不落库：升级后即对所有历史已售资产生效，无数据迁移、无回滚脚本。
回滚 = revert 提交。

## Open Questions

（无——口径、字段去留、参数形态均已定案）
