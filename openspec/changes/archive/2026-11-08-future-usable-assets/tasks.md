## 1. Schema 与 migration v11

- [x] 1.1 `src/db/schema.ts`：`accounts` 表 DDL 增加 `maturity_date TEXT`（可空），供新装用户直接建对
- [x] 1.2 `src/db/schema.ts`：新增 `cash_flows` 表（`id/kind/name/amount/frequency/effective_from/effective_to/note/created_at`）+ 索引 `idx_cash_flow_effective (effective_from, effective_to)` 与 `idx_cash_flow_kind (kind)`
- [x] 1.3 `src/db/migrations.ts`：`CURRENT_VERSION` 10 → 11；新增 v11 migration，`accounts.maturity_date` 用 `PRAGMA table_info` 探测后再 `ALTER TABLE ADD COLUMN`（沿用 v10 写法），`cash_flows` 用 `CREATE TABLE IF NOT EXISTS`
- [x] 1.4 确认 v11 **不含任何改表重建**（design.md D4）；用一份 v10 的真实老库跑升级，验证 `getDbVersion()` 返回 11 且原有账户/资产/支出数据完好
- [x] 1.5 验证旧版代码打开 v11 库不崩溃（新增列/表对旧查询透明）

## 2. 枚举与类型

- [x] 2.1 `src/types/enums.ts`：`AccountType` 新增 `PROVIDENT_FUND = 'provident_fund'`
- [x] 2.2 `src/types/enums.ts`：`AccountTypeLabels` 增加 `'公积金'`；`AccountTypeIcons`（已 deprecated 但仍需完整）增加对应 emoji
- [x] 2.3 `src/theme/icons.ts`：`ACCOUNT_TYPE_ICONS` 增加 `PROVIDENT_FUND` 的 Lucide 图标映射（建议 `Landmark`），确认该图标已在 `ICON_REGISTRY` 中注册
- [x] 2.4 `src/types/enums.ts`：新增 `RESTRICTED_ACCOUNT_TYPES: ReadonlySet<AccountType>`，紧邻 `LIABILITY_ACCOUNT_TYPES` 声明、同构写法
- [x] 2.5 `src/types/enums.ts`：新增 `CashFlowKind`（`EXPENSE = 'expense'` / `INCOME = 'income'`）+ `CashFlowKindLabels`（'固定支出' / '固定收入'）
- [x] 2.6 `src/types/models.ts`：`Account` 新增 `maturityDate: string | null`
- [x] 2.7 `src/types/models.ts`：新增 `CashFlow` 接口（频率复用 `ExpenseFrequency`，不改名，避免动导入导出的序列化值）
- [x] 2.8 `src/types/models.ts`：`NetWorthResult` 新增 `availableLiquid` / `restrictedLiquid` / `liabilities`，`liquidAssets` 保留数值不变并标 `@deprecated`
- [x] 2.9 `npx tsc --noEmit` 通过（exit 0）——此步会暴露所有因 `Account`/`NetWorthResult` 变更而需要跟进的调用点

## 3. 仓储层

- [x] 3.1 `src/db/account-repository.ts`：`rowToAccount` 映射 `maturity_date → maturityDate`；`create`/`update` 读写该字段
- [x] 3.2 `src/db/account-repository.ts`：`getAllLatestBalances()` 保持不变（仍返回全部账户），分桶逻辑放引擎层，避免仓储层耦合业务语义
- [x] 3.3 新增 `src/db/cash-flow-repository.ts`：`create` / `update` / `delete` / `getAll` / `getByKind(kind)` / `getEffectiveForMonth(month)`（按 `effective_from <= month AND (effective_to IS NULL OR effective_to >= month)` 过滤）
- [x] 3.4 `src/db/recurring-expense-repository.ts`：**不改**。仅补一条注释说明「资产附属支出」与 `cash_flows`「家庭现金流」的领域边界
- [x] 3.5 仓储层单测（sql.js）：`cash-flow-repository` 的 CRUD + 生效月过滤，覆盖 `effective_to IS NULL`、边界月（`effective_from` 当月、`effective_to` 当月）、非法频率回落

## 4. 计算引擎

- [x] 4.1 `src/engine/NetWorthCalculator.ts`：按 `LIABILITY_ACCOUNT_TYPES` / `RESTRICTED_ACCOUNT_TYPES` 三路分桶，填充 `availableLiquid` / `restrictedLiquid` / `liabilities`；`liquidAssets` 输出三者之和（数值与改动前一致）；`netWorth` 公式不变
- [x] 4.2 新增分桶辅助函数（建议 `src/engine/accountBuckets.ts`）：未识别的 `AccountType` 回落 available 而非抛错
- [x] 4.3 `src/engine/NetWorthCalculator.ts`：抽出 `buildTrendSeries(...)`，把 `app/index.tsx:180-230` 的「按日期聚合余额快照 + 估值」内联逻辑收进引擎层（design.md D7）。**只抽聚合，不重构整个趋势链路**
- [x] 4.4 新增 `src/engine/CashFlowCalculator.ts`：`getMonthlyNetInflow(month)` = Σ收入月度等价 − Σ`cash_flows` 支出月度等价 − Σ`recurring_expenses` 月度等价；复用 `toMonthlyAmount`，不复制折算逻辑
- [x] 4.5 `CashFlowCalculator.accumulate(fromMonth, toMonth)`：逐月求和，**区间为「当前月的下一月」至「目标月」（含两端）**，当前月不计入（design.md D5 月数口径）
- [x] 4.6 新增 `src/engine/UsableAssetsCalculator.ts`：`calculate(targetDate)` 返回 `{ availableLiquid, maturedDeposits, netCashFlow, total, breakdown }`；受限账户与负债账户永不计入，无论 `targetDate` 多远；到期日判定为 `maturityDate <= targetDate`（含等于）
- [x] 4.7 `src/engine/ProjectionCalculator.ts`：`estimateProjectionDetail` 重写为 `netWorth(today) + 逐月已知净流入 + residualSlope × 月数`；**删除 `slope <= 0 → return null` 短路**；`residualSlope` 允许为负
- [x] 4.8 `ProjectionCalculator`：保留 `ProjectionDetail` 现有全部字段，新增 `knownMonthlyInflow` / `residualMonthlyGrowth`；三态返回（可达 / 不可达 / 数据不足），不可达时 `achievementDate` 为 null 但 `gap` 与 `knownMonthlyInflow` 有值
- [x] 4.9 `estimateAchievementDate` 复用同一内部实现，避免两份公式并存
- [x] 4.10 引擎单测：分桶（公积金/银行卡/信用卡/未知类型）、到期日门控（未到期/到期当天/已到期）、`usable(D)` 全场景（对齐 `specs/usable-assets/spec.md` 的每条 Scenario，含「当前月不计入」「受限永不解锁」）
- [x] 4.11 引擎单测：现金流归一化（月薪 / 季度奖 ÷3 / 年终奖 ÷12 / 收支相抵为 0 / 非法频率回落）、生效区间跨越
- [x] 4.12 引擎单测：预测——无现金流时与改动前结果一致（回归兼容）、历史持平但现金流为正时给出日期、残差为负 + 现金流为正、总 run-rate ≤ 0 时返回不可达而非 null、数据不足三态
- [x] 4.13 `npm test` 全绿，且 `NetWorthResult.liquidAssets` 相关的既有断言未被削弱（数值不变是硬约束）

## 5. UI —— 账户

- [x] 5.1 账户编辑 Bottom Sheet：类型 Chip 网格增加「公积金」
- [x] 5.2 账户编辑 Bottom Sheet：新增到期日选择器（可选、可清除），文案说明「定期存款到期日前不计入可用资金」；**不加任何「计入净资产」开关**
- [x] 5.3 `app/accounts.tsx`：按 可用 / 受限 / 负债 分组渲染，每组一个小计；未到期账户显示「定期 · 未到期」badge + 到期日
- [x] 5.4 `app/accounts.tsx`：hero 卡总额仍为全部账户之和，保持与余额历史一致（对齐 `account-management` spec 的 "Balance history total still spans all sections"）
- [x] 5.5 深色模式下三组分节与 badge 的配色走 theme token，不硬编码

## 6. UI —— 现金流

- [x] 6.1 新增现金流管理页（`app/cash-flow.tsx`）：固定支出 / 固定收入两组列表，各自显示月度等价小计与净月度流入
- [x] 6.2 新增现金流编辑 Bottom Sheet：名称、金额、类型（支出/收入）、频率 Chip（复用 `ExpenseFrequency` 的按月/按季/按年）、生效起止（`YYYY-MM`）
- [x] 6.3 页顶只读汇总行「另有 N 笔资产附属支出 ¥X/月 →」，点击跳转对应资产；金额不可在此页编辑
- [x] 6.4 空状态文案区分「家庭现金流」与「资产附属经常性支出」，说明房租/宽带/人寿险记这里、车险/物业费记资产详情
- [x] 6.5 入口挂在**账户页概览卡内**，两个半透明胶囊并排（固定收支 / 可用资金）。~~设置页~~ → ~~账户页 ListHeaderComponent 两行列表~~ → 收进概览卡：单独两行列表太占地方，也和账户列表的视觉语言打架

## 7. UI —— 总览与可用资产

- [x] 7.1 `app/index.tsx`：hero 卡 stat row 改为 可用 / 受限 / 资产估值；无受限账户时不渲染「受限」项并回落到原布局
- [x] 7.2 ~~`app/index.tsx`：hero 卡新增「今日可用 ¥XXX」可点击行~~ **已推翻**（design.md OQ1）：入口改到账户页顶部，hero 卡不放
- [x] 7.3 新增可用资产视图：日期选择器 + 单一金额 + 三行拆解（可用活期 / 已到期定期（本金） / 累计净现金流）。**不做滑动条、不做时间轴曲线、不做多日期对比**
- [x] 7.4 拆解行的定期金额标注「本金」，任何位置不出现利息/利率/收益字样
- [x] 7.5 `GoalProjectionExplainer`：把预测拆成「已知月度净流入」与「历史残差」两行，相加等于展示用的月增长
- [x] 7.6 预测三态 UI：可达（给日期）/ 按当前速度不可达（给缺口 + 月度净流入）/ 数据不足；**不允许静默空白**
- [x] 7.7 `app/index.tsx` 改用 `NetWorthCalculator.buildTrendSeries`，删除内联聚合，确认历史趋势点数值与改动前逐点相同

## 8. 导入导出

- [x] 8.1 `src/services/import-service.ts`：导出携带 `accounts.maturityDate` 与完整 `cash_flows`
- [x] 8.2 导入：旧备份无 `maturityDate` → 回落 null；无 `cash_flows` 段 → 回落空集；`kind` 非法值 → 跳过该条并计入导入警告
- [x] 8.3 导入导出往返测试：v10 备份导入 → 导出 → 再导入，账户到期日与现金流条目无损

## 9. 验证与发布

- [x] 9.1 `npx tsc --noEmit` exit 0；`npm test` 全绿；`npm run lint` 无新增告警（项目已归零，别破）
- [x] 9.2 真机（大陆网络内）走完整链路：老库升级 → 建公积金账户 → 给银行卡设到期日 → 录月薪 + 房租 → 查 2027-06-30 可用资金 → 看预测达成日期
- [x] 9.3 手工验证 migration 回滚路径：升级前导出备份，升级后确认可用备份恢复
- [x] 9.4 `./scripts/bump-version.sh <version>` 升版本，`npm run check:version` 三处一致
- [x] 9.5 `CHANGELOG.md` 按 Keep a Changelog 格式补中文条目（新增 / 变更 / 修复分节）
- [x] 9.6 `openspec validate future-usable-assets` 通过；实现完成后走 `/opsx:archive`

## 10. 明确不做（防止实施期范围膨胀）

- 10.1 不实现利息/利率/复利/应计利息展示
- 10.2 不实现账户级 `includeInNetWorth` 开关或任何等价设置项
- 10.3 不实现时间轴滑动条 / 多日期对比曲线
- 10.4 不实现提前支取、自动转存、理财产品分类
- 10.5 不把 `recurring_expenses.asset_id` 改为可空（design.md D4 已否决）
- 10.6 不分批发版——本 change 一次性交付
