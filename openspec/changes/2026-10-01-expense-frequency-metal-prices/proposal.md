## Why

1. **经常性支出只支持按月扣费**：车险、年费会员、物业费季缴等按年/按季扣费的支出无法准确录入，用户只能手工除以 12 折算成月付，既麻烦又容易失真。
2. **贵金属资产估值靠手填**：金条/金饰等资产已有克数字段（weightGrams），但用户想更新估值时需要自己上网查金价再手工计算输入。App 目前完全离线，没有任何实时行情能力。

## What Changes

- 经常性支出新增**扣费周期**字段（按月/按季/按年），月度持有成本中按 ÷1 / ÷3 / ÷12 折算为月度等价金额；累计成本按月度等价 × 生效月数计算（不足整周期按月折算）
- 贵金属资产详情页新增**实时参考价**区块：展示国际现货折算的黄金/白银价格（元/克）及按金价/银价计算的参考市值
- "更新估值"弹窗为有克数的资产提供**按金价填入 / 按银价填入**一键填入按钮（填入后仍可手动修改再保存）
- 不新增金属类型字段、不改资产表——参考价为纯展示 + 快捷填入，估值写入仍走现有 `updateValuation` 通道
- 数据源（免费、无需 key）：api.gold-api.com 现货 XAU/XAG（美元/盎司）× api.frankfurter.dev USD→CNY 汇率 ÷ 31.1035 = 元/克；结果缓存 10 分钟，离线回落缓存，静默降级

## Capabilities

### New Capabilities
- `metal-price-reference`: 贵金属资产实时参考价展示与一键估值填入

### Modified Capabilities
- `holding-cost-calc`: 经常性支出增加扣费周期（按月/按季/按年），月度与累计成本按周期折算

## Impact

- **数据库**: `recurring_expenses` 表新增 `frequency TEXT NOT NULL DEFAULT 'monthly'` 列，migration v10（幂等）；`CURRENT_VERSION` 9 → 10
- **数据模型**: `RecurringExpense` 接口新增 `frequency: ExpenseFrequency`；`enums.ts` 新增 `ExpenseFrequency` 枚举 + 标签/后缀/月数换算表
- **计算引擎**: `RecurringExpenseCalculator` 为唯一折算咽喉点（`toMonthlyAmount`），`HoldingCostCalculator` / `SettlementCalculator` / `HoldingCostBreakdown` 及各页面零逻辑改动
- **UI 组件**: `AddAssetModal`（Step 3 周期 Chip + 草稿行后缀）、`AssetDetailModal`（列表后缀、添加表单周期 Chip、实时参考价区块、估值弹窗一键填入）
- **新服务**: `src/services/metal-price-service.ts`（App 首个网络功能，RN 内置 fetch，无新依赖；Expo 默认含网络权限，app.json 不变）
- **导入/导出**: 导出自动携带 frequency；导入对旧备份（无 frequency 字段）回落 monthly，非法值同样回落
- **顺带修复（既有 bug）**: `ICON_REGISTRY` 补充 `BarChart3: ChartBar` 别名（lucide 更名导致 OnboardingView/ValuationChart 渲染崩溃）；`jest.setup.ts` 定义 `__DEV__` 全局
