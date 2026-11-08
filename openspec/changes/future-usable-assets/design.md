## Context

家底当前的数据模型只有「存量」：账户余额快照 + 资产估值。三个核心问题里，「我有多少钱」和「我的东西值多少」有完整实现，「净资产趋势如何」是**用历史点回归出来的**，没有任何前瞻性输入。

现状代码事实（均已核实）：

| 位置 | 现状 | 问题 |
|---|---|---|
| `src/db/account-repository.ts:122-138` | `getAllLatestBalances()` 只过滤 `deleted_at IS NULL` | 公积金、定期存款与活期余额同等对待 |
| `src/engine/NetWorthCalculator.ts:20-24` | `liquidAssets` = 所有账户余额无脑求和 | 变量名叫「流动」，实际含不可动用资金 |
| `src/engine/ProjectionCalculator.ts:20-60` | 最近 6 点线性回归，`slope <= 0 → return null` | 脉冲式收入扭曲斜率；负增长时静默失效 |
| `src/db/schema.ts:56,64` | `recurring_expenses.asset_id NOT NULL` + FK `ON DELETE CASCADE` | 房租/宽带/人寿险无处录入 |
| 全库 | `grep income\|收入\|salary` 仅命中 `src/utils/fortunes.ts` 一行文案 | **没有任何收入概念** |
| `src/db/client.ts:28` | `PRAGMA foreign_keys = ON` | 约束是真的在强制执行，改表要小心 |
| `src/db/migrations.ts:187-208` | 每个 migration 被包在 `BEGIN/COMMIT` 里 | 事务内 `PRAGMA foreign_keys=OFF` 是 no-op |
| `app/index.tsx:180-230` | 趋势与预测的数据点在 **UI 层**内联聚合，绕过 `NetWorthCalculator` | 口径变更需要同时改 UI 层聚合逻辑 |

约束：数据库 migration 必须幂等；`npx tsc --noEmit` 必须 exit 0；UI 文案中文、标识符英文；不引入任何网络依赖。

## Goals / Non-Goals

**Goals:**

- 回答一个新问题：**指定日期 D，用户手上能动用多少钱**
- 净资产总额**数值不变**，只把构成拆成「可用 / 受限 / 负债 / 资产估值」——不让老用户觉得自己的钱变少了
- 预测从「纯历史回归」变为「已知现金流 + 历史残差」，且**负增长不再等于无预测**
- 不依附于资产的固定支出、以及全部固定收入，有地方录入
- 一次做对，不分批发版

**Non-Goals:**

- 利息、利率、复利、应计利息——定期存款只认本金和到期日
- 账户级「是否计入净资产」开关
- 时间轴滑动条 / 多日期对比曲线——只做「选一个日期 → 给一个数字」
- 提前支取按活期计息、大额存单/国债/结构性存款分类、自动转存
- 流水记账、预算、消费分类饼图
- 一个账户内多笔定存的建模（见 Risks R2）

## Decisions

### D1：用**账户类型**表达「受限」，不用开关

新增 `AccountType.PROVIDENT_FUND = 'provident_fund'`（'公积金'），并新增：

```ts
/** Account types whose balance is not freely spendable (still part of net worth) */
export const RESTRICTED_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set([
  AccountType.PROVIDENT_FUND,
]);
```

与既有 `LIABILITY_ACCOUNT_TYPES`（`enums.ts:19-22`）完全同构——**类型携带语义**，App 早已有此先例（信用卡/贷款天然按负债处理）。

- **否决方案 A：`accounts` 表加 `include_in_net_worth` 布尔列。** 用户从做 1 个决定变成做 8 个决定；且「计入净资产」这个措辞本身就是错的——公积金**就是**净资产的一部分，用户真正想说的是「它现在花不出去」。开关会诱导用户把公积金排除在净资产外，得到一个偏小的假数字。
- **否决方案 B：设置页里勾选排除哪些账户。** 把决定搬到另一屏不等于减少决定。
- **扩展路径**：日后保单现金价值、锁定股权等只需往集合里加类型，不动 schema、不动 UI。

### D2：`netWorth` 数值不变，只拆构成

```
netWorth = availableLiquid + restrictedLiquid + liabilities + assetValuations
```

`NetWorthResult` 新增 `availableLiquid` / `restrictedLiquid`；`liquidAssets` **保留**为三者之和（数值与今天完全一致），标记 `@deprecated` 引导调用方迁移。

- **理由**：历史趋势线由 `app/index.tsx` 内联聚合的余额快照构成。如果改变 `netWorth` 的口径，用户的历史曲线会整体平移——那是「App 改了我的钱」，是最伤信任的一类 bug。拆构成不移动任何历史数字。
- **否决方案：净资产直接剔除受限账户。** 撒谎。公积金是真金白银。

### D3：到期日是**账户**的字段，不建新表

`accounts` 新增 `maturity_date TEXT`（可空，`YYYY-MM-DD`）。语义：

| 时点 | 计入净资产 | 计入可用资金 |
|---|---|---|
| `D < maturityDate` | ✅ | ❌ |
| `D >= maturityDate` | ✅ | ✅ |
| `maturityDate IS NULL` | ✅ | ✅ |

`ALTER TABLE accounts ADD COLUMN maturity_date TEXT` 幂等实现沿用 v10 的 `PRAGMA table_info` 探测模式（`migrations.ts:152-165`）。

- **理由**：一个账户 = 一条余额快照序列 = 一个数字。这与 App 既有心智一致，也让「本金手动录入」这条铁律不破。
- **否决方案：新建 `fixed_deposits` 表支持一账户多笔定存。** 那是理财产品管理器的起点，见 Non-Goals。

### D4：**新建 `cash_flows` 表**，不把 `recurring_expenses.asset_id` 改可空

这是本次最重要的架构决定，与 proposal 初稿相反——初稿写的是「`asset_id` 改可空，BREAKING」，核实代码后否决。

```sql
CREATE TABLE IF NOT EXISTS cash_flows (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,               -- 'expense' | 'income'
  name TEXT NOT NULL,
  amount REAL NOT NULL,             -- 每个计费周期的金额
  frequency TEXT NOT NULL DEFAULT 'monthly',
  effective_from TEXT NOT NULL,     -- YYYY-MM
  effective_to TEXT,                -- YYYY-MM，NULL = 持续
  note TEXT,
  created_at TEXT NOT NULL
);
```

两个表的领域划分：

| 表 | 领域 | 消费方 |
|---|---|---|
| `recurring_expenses` | 资产持有成本的一部分（车险、依附于房产的物业费） | `HoldingCostCalculator` / `SettlementCalculator` |
| `cash_flows` | 家庭层面的现金流（房租、宽带、人寿险、月薪、季度奖、年终奖） | `ProjectionCalculator` / `UsableAssetsCalculator` |

**否决「`asset_id` 改可空」的三条理由：**

1. **技术上危险**：`client.ts:28` 开了 `PRAGMA foreign_keys = ON`，而 `runMigrations` 把每个 migration 包在 `BEGIN/COMMIT` 里（`migrations.ts:190`）。SQLite 中 `PRAGMA foreign_keys` **在事务内是 no-op**，所以标准的 12 步改表流程里「先关外键」这一步做不到。表重建不是不可能，但在本项目的 migration 框架下是在没有安全网的情况下走钢丝。
2. **收益为零**：`asset_id` 可空并不会让任何新场景变得可能——新表同样能表达「不依附资产的支出」。
3. **污染已稳定的代码**：改可空后，`getForMonth(month)`（`recurring-expense-repository.ts:50-58`，`assetId` 是可选过滤条件）在不传 `assetId` 时会把家庭支出混进资产持有成本口径。现有 3 个调用点都传了 `asset.id`，但这是一个留给未来的地雷。

**不会重复计算**：两表按构造互斥（一个 asset-scoped，一个 household-scoped）。预测时的月度现金流出 = Σ(`recurring_expenses` 月度等价) + Σ(`cash_flows` 中 `kind='expense'` 的月度等价)。

**频率枚举复用**：`ExpenseFrequency`（按月 ÷1 / 按季 ÷3 / 按年 ÷12）与 `toMonthlyAmount()`（`RecurringExpenseCalculator.ts:14-17`，唯一折算咽喉点）直接复用于收入。序列化值是 `'monthly'|'quarterly'|'yearly'`，不含枚举名，导入导出兼容性不受影响。`toMonthlyAmount` 的参数类型放宽为 `Pick<..., 'amount'|'frequency'>`——它已经是了，无需改动。

### D5：预测公式——已知现金流优先，回归只解释残差

```
projected(D) = netWorth(today)
             + Σ 月度净流入 × 月数(today → D)
             + residualSlope × 月数(today → D)
```

其中：
- **月度净流入** = (Σ收入月度等价 − Σ支出月度等价 − Σ资产附属经常性支出月度等价)，按 `effective_from` / `effective_to` **逐月判定**，跨越生效边界的月份按该月实际生效的条目求和，不做「月度净额 × 月数」的简单乘法
- **月数口径**：累计区间为「当前月的**下一月**」至「D 所在月」（含两端）。当前月不计入——账户最新余额快照已经反映了本月的现金流，再算一遍就是重复计算。例：today = 2026-11-08、D = 2027-02-28 → 计 3 个月（2026-12、2027-01、2027-02）
- **residualSlope** = 现有 6 点线性回归的斜率，但**允许为负**，且** clamp 到 `[-|monthlyNetInflow|, +X]` 之外不做处理**——它代表「历史里我没建模的那部分」（消费波动、估值涨跌）

关键行为变更：
- `slope <= 0 → return null` 的短路**删除**。已知现金流为正、历史残差为负时，仍然可以给出达成日期
- 只有当 `projected(D)` 对所有 D 都到不了 goal（即月度净流入 + residualSlope ≤ 0）时才返回 `null`，此时 UI 给出明确文案而非静默消失
- `ProjectionDetail` 的对外形状**保留全部现有字段**，新增 `knownMonthlyInflow` / `residualMonthlyGrowth` 两个字段用于 UI 拆解展示。避免 `app/index.tsx` 及测试的连锁改动

**否决方案：只用现金流，丢掉回归。** 那样估值涨跌（房产、贵金属）就完全退出预测了，反而更不准。回归是残差项，不是主项——这是本次重写的核心。

### D6：`UsableAssetsCalculator` —— 新增引擎，日期 → 金额

```ts
UsableAssetsCalculator.calculate(targetDate: string): Promise<UsableAssetsResult>
// UsableAssetsResult = { availableLiquid, maturedDeposits, netCashFlow, total, breakdown }
```

- `availableLiquid`：无到期日、非受限、非负债账户的最新余额
- `maturedDeposits`：`maturityDate <= targetDate` 的账户最新余额（本金，不含利息）
- `netCashFlow`：today → targetDate 的累计净流入（与 D5 同一函数，抽出共用）
- **受限账户永不计入**，无论目标日期多远——公积金不会因为等得够久就变得可动用
- 负债账户不计入

### D7：把趋势/预测的聚合从 UI 层收回引擎层

`app/index.tsx:180-230` 目前在 UI 里内联做「按日期聚合余额快照 + 估值」。可用/受限拆分需要同一套聚合逻辑，两处并行维护必然走偏。

决定：抽出 `NetWorthCalculator.buildTrendSeries(dates, accounts, assets, snapshots, valuations)`，UI 只负责渲染。**本次不做整个趋势链路的搬迁**——只抽出「按账户类型分桶」这一小步，避免把 change 撑成一个重构项目。

### D8：定位边界——这不是预算管理

`docs/product-positioning.md` 明确写了「❌ 预算管理工具（不告诉你"别花那么多"）」。本设计不越界：

| 预算管理（不做） | 本功能（做） |
|---|---|
| 「你这个月餐饮超支了」 | 「2027-06 你手上有 48 万」 |
| 管行为、给评判 | 讲真相、给数字 |
| 录每一笔流水 | 只录周期性、计划性金额 |
| 颗粒度：单笔消费 | 颗粒度：与既有 `RecurringExpense` 完全一致 |

用户录的是「房租 4500/月」，不是「今天午饭 32 块」。这是**财务报表**的输入，不是**流水账**的输入。

## Risks / Trade-offs

**R1：`cash_flows` 与 `recurring_expenses` 的录入位置会让用户困惑**（物业费该记哪？）
→ 缓解：现金流页顶部固定一行只读汇总「另有 N 笔资产附属支出 ¥X/月 →」，可跳转；录入表单的说明文案明确分工（依附资产的支出请在资产详情里加）。**不做**跨表移动功能——那会让两个领域重新耦合。

**R2：一个银行卡里有多笔不同到期日的定存，本设计表达不了**
→ 缓解：用户可以建多个账户（这本来就是 App 的用法，每个账户一条余额序列）。文案上引导「一笔定期 = 一个账户」。
→ 权衡：这是刻意的。支持多笔定存会引出「部分支取」「自动转存」「按笔计息」，一路滑向理财产品管理器。

**R3：不计利息会让长期定存的「可用资金」偏低**
→ 缓解：明确标注为「本金」，UI 文案写「不含利息」。3 年期定存的利息相对本金是几个百分点，且方向确定（低估），不会误导决策。
→ 权衡：换来的是「App 显示每个数字都是你亲手输入的」这条铁律不破。

**R4：`residualSlope` 允许为负后，预测可能出现「永远达不成」**
→ 缓解：这正是真相，但必须**说出来**而不是静默 `null`。UI 文案区分三种状态：可达（给日期）/ 按当前趋势不可达（给缺口和月度净流入）/ 数据不足（少于 2 个历史点且无现金流）。

**R5：migration v11 是 `ADD COLUMN` + `CREATE TABLE`，均为幂等安全操作**
→ 缓解：沿用 v10 的 `PRAGMA table_info` 探测；`CREATE TABLE IF NOT EXISTS`。**本次刻意不含任何改表重建**（见 D4）。
→ 遗留：项目至今无 migration 测试（`docs/test-plan.md` gap G5 / task T9）。本次不解决该 gap，但要在真机上用一份真实老库验证升级路径 + 导出备份可回滚。

**R6：`liquidAssets` 语义收窄是内部 BREAKING**
→ 缓解：保留字段、数值不变、标 `@deprecated`，新增字段并行存在。调用方逐个迁移，不做一次性大改。

## Migration Plan

1. `src/db/schema.ts`：新增 `cash_flows` 表 + 索引；`accounts` 加 `maturity_date`（新装用户直接建对）
2. `src/db/migrations.ts`：`CURRENT_VERSION` 10 → 11，新增 v11 migration（`ADD COLUMN` 幂等探测 + `CREATE TABLE IF NOT EXISTS`），老库升级
3. 顺序：enums/types → repository → engine（`NetWorthCalculator` 分桶、`UsableAssetsCalculator`、`ProjectionCalculator` 重写）→ UI → 导入导出 → 测试
4. **回滚策略**：v11 只加不改，回滚 = 降级 APK + 恢复导出备份。`db_version` 表会残留 version=11 记录，但 `runMigrations` 的 `currentVersion >= CURRENT_VERSION` 短路意味着旧版 App 不会尝试执行不存在的 migration——需真机验证旧版 APK 打开 v11 库不崩溃（新增列/表对旧代码是透明的）
5. 验证：`npx tsc --noEmit` 干净；`npm test` 全绿；真机走一遍老库升级

## Open Questions

- **OQ1（已决）**：「未来可用资产」的入口放哪？~~倾向总览页 hero 卡下方一行「今日可用 ¥XXX →」~~ → **实施后推翻**：hero 卡上同时出现「净资产 / 可用 / 受限 / 资产估值 / 今日可用 / 目标进度」六件事，太挤，而且「可用」与「今日可用」两个词长得像、含义不同，是在给自己造歧义。入口先改到 设置 → 记录，**再次推翻**后落到 **账户页顶部**：设置页管的是 App 本身（安全/外观/数据），把钱的事塞进去是分类错误；账户页才是「钱」的语境，且与账户分组共用同一套可用/受限口径。hero 卡只回答「我现在值多少」，不回答「某天我能花多少」
- **OQ2**：`cash_flows` 是否需要「一次性」类型（如已确定的年底大额支出）？当前设计只做周期性，一次性支出可通过 `effective_from` = `effective_to` 的单月条目表达，但语义别扭。倾向先不做，看用户反馈
- **OQ3**：受限账户类型集合是否要在设置页允许用户扩展（例如把某个「其他」账户标为受限）？当前答案是**不**——那等于把 D1 否决掉的开关从后门放回来。若日后确有需求，正确做法是加类型，不是加开关
