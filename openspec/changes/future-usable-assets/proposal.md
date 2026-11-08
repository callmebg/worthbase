## Why

> 一句话定义：**选一个日期，家底告诉你那天你手上有多少钱。**

家底现在是纯「存量」模型——`NetWorthCalculator` 把所有账户的最新余额无脑求和（只过滤 `deleted_at`），`ProjectionCalculator` 拿最近 6 个历史点做线性回归、斜率 ≤ 0 就直接 `return null`。App 能回答「我现在有多少」，回答不了「我未来某天能用多少」。

酷安用户 chenyu61（2026.10.25）的三条建议指向的是同一个缺失，只是他自己没法命名：

1. **账户口径是假的**：公积金取不出来，却被算进「流动资金」。用户要一个开关，本质是在说「你这个数字在骗我」。
2. **定期存款没有到期概念**：一笔 2027-06 到期的定存，今天和明年 7 月的可用性完全不同，App 里两者是同一个数字。
3. **预测是失真的**：全代码库没有任何「收入」概念（`grep income|收入|salary` 只命中 `src/utils/fortunes.ts` 一行文案）。年终奖这种脉冲式收入会把回归斜率顶飞，目标达成日期随之摆动数年；斜率为负时 App 干脆什么都不说。

第 3 条不是功能请求，是一份措辞客气的 bug 报告：核心问题「净资产趋势如何」目前给出的答案不可信。

## What Changes

- 新增账户类型 `AccountType.PROVIDENT_FUND`（'公积金'），并新增 `RESTRICTED_ACCOUNT_TYPES` 集合（与既有 `LIABILITY_ACCOUNT_TYPES` 同构）。**类型携带语义**——受限账户不计入「流动资金」，在总览与账户页单独成栏
- 账户新增可选**到期日**（`maturityDate`）：到期日之前不计入「可用资金」，到期日当天及之后计入。本金仍由用户手动录入余额快照，App 不计算任何利息
- 新增 `cash_flows` 表，承载**不依附于资产的固定支出**（房租、宽带、人寿险）与**全部固定收入**（月薪、季度奖、年终奖），频率复用既有 `ExpenseFrequency`（按月/按季/按年），归一化为月度等价
- **不动** `recurring_expenses`：它继续只管资产附属支出（车险、依附房产的物业费），`asset_id` 保持 `NOT NULL`。两表按领域互斥，不重复计算（理由见 `design.md` D4）
- 重写目标预测：由「6 点线性回归」改为「当前净资产 + Σ已知收入 − Σ已知支出 + 历史回归残差」。已知现金流优先，回归只负责解释残差——负斜率不再等于「无法预测」
- 新增「未来可用资产」查询：选一个日期 → 给一个数字。= 该日可自由支配的活期余额 + 该日已到期的定期本金 + 该日之前累计的净现金流

**明确不做（Out of Scope）**

- ❌ 利率、利息、复利、应计利息展示、计息方式
- ❌ 账户级 `includeInNetWorth` 开关（用类型，不用开关）
- ❌ 「未来 N 个月可用资金」时间轴滑动条 UI——只做「选日期 → 给数字」
- ❌ 提前支取按活期计息、大额存单/国债/结构性存款分类、自动转存
- ❌ 分批发版：不接受「先发公积金开关、后重构现金流」的方案，一次做对

## Capabilities

### New Capabilities
- `cash-flow`: 周期性现金流录入与管理——不依附资产的固定支出 + 固定收入，频率归一化为月度等价，供预测与可用资产计算消费
- `usable-assets`: 指定日期的可用资金计算与展示——受限账户剔除、定期到期解锁、已知净现金流累计

### Modified Capabilities
- `account-management`: 账户类型新增「公积金」；账户新增可选到期日；受限账户与可用资金的口径分离
- `net-worth-trend`: 净资产构成拆分为可用/受限（总额数值不变）；目标预测由纯历史回归改为现金流感知
- `dashboard-redesign`: hero 卡新增可用/受限拆分与「未来某日可用」入口；预测计算器允许负残差斜率且不再静默失效

`holding-cost-calc` **不受影响**——`recurring_expenses` 表、模型与计算链路保持不变（见 `design.md` D4）。

## Impact

- **数据库**: migration **v11**（`CURRENT_VERSION` 10 → 11，幂等）。`accounts` 新增 `maturity_date TEXT`（沿用 v10 的 `PRAGMA table_info` 探测）；新增 `cash_flows` 表 + 索引。**刻意不含任何改表重建**——`PRAGMA foreign_keys = ON`（`client.ts:28`）遇上 migration 外层事务（`migrations.ts:190`）会让「先关外键」失效，见 `design.md` D4
- **数据模型**: `Account` 新增 `maturityDate: string | null`；新增 `CashFlow` 接口与 `CashFlowKind` 枚举（'expense' | 'income'）；`NetWorthResult` 新增 `availableLiquid` / `restrictedLiquid`，`liquidAssets` 数值不变、标 `@deprecated`（语义收窄，内部调用方逐个迁移）；`ProjectionDetail` 新增 `knownMonthlyInflow` / `residualMonthlyGrowth`，现有字段全部保留
- **枚举**: `AccountType` 新增 `PROVIDENT_FUND`，配套 `AccountTypeLabels`（'公积金'）与 `ACCOUNT_TYPE_ICONS` 图标映射；新增 `RESTRICTED_ACCOUNT_TYPES`
- **仓储**: 新增 `src/db/cash-flow-repository.ts`（CRUD + `getEffectiveForMonth(month)`）；`account-repository` 增加到期日读写与按类型分桶查询
- **计算引擎**: `NetWorthCalculator` 按类型分桶（可用/受限/负债）并抽出 `buildTrendSeries` 供 UI 复用（当前该聚合内联在 `app/index.tsx:180-230`）；新增 `UsableAssetsCalculator`（日期 → 金额）；`ProjectionCalculator` 重写为现金流感知，保留 `ProjectionDetail` 现有字段以免调用点连锁改动；`toMonthlyAmount` 直接复用于收入——其参数已是结构类型 `Pick<..., 'amount'|'frequency'>`，`CashFlow` 天然兼容
- **UI**: `app/index.tsx` hero 卡拆分可用/受限（**不放**可用资金入口，见 `design.md` OQ1）；`app/accounts.tsx` 按可用/受限/负债分组 + 到期日标记；账户新增/编辑 Sheet 增加「公积金」类型项，到期日选择器紧跟在类型 Chip 网格下方（默认 snap point 下不滚动即可见）；新增 `app/cash-flow.tsx`（固定收支，含「另有 N 笔资产附属支出」只读汇总行）与 `app/usable-assets.tsx`（可用资金），两个入口挂在**账户页顶部**（`SectionList` 的 `ListHeaderComponent`）
- **导入/导出**: `src/services/import-service.ts` 导出携带 `accounts.maturityDate` 与 `cash_flows`；导入对旧备份（无这些字段）回落 null / 空集
- **测试**: 新增 `UsableAssetsCalculator`、现金流归一化、现金流感知预测（含负残差斜率、生效区间跨越、可达/不可达/数据不足三态）的单测；migration v11 为纯 `ADD COLUMN` + `CREATE TABLE IF NOT EXISTS`，无改表重建路径。项目仍无 migration 测试（`docs/test-plan.md` gap G5 / task T9），本次不解决该 gap，但需真机用真实老库验证升级 + 旧版 APK 打开 v11 库不崩溃
- **定位边界**: 见 `design.md` ——本功能讲「你未来有多少」（真相），不是「别花那么多」（预算），与 `docs/product-positioning.md` 的「不做预算管理工具」不冲突；且只录周期性、计划性金额，不录流水
