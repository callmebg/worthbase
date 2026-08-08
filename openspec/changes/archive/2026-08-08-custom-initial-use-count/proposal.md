## Why

当前次均成本的计算方式是 `购买价格 ÷ 使用记录次数`，使用次数完全依赖于 App 内的使用记录条数。新用户加入 WorthBase 时，往往已经拥有并使用了很多物品（比如一台用了两年的相机、一件穿了半年的外套），但补录这些历史物品时只能从 0 次开始计数，导致次均成本畸高或显示为 ∞，统计数据完全失效，失去了"次均成本"作为决策参考的意义。

## What Changes

- 在资产创建/编辑时，允许用户为已开启"次均追踪"的物品设置**初始使用次数**（initial use count），默认为 0
- 次均成本计算公式调整为：`购买价格 ÷ (初始次数 + App 内记录次数)`
- 资产详情页展示使用次数时，区分显示"初始 X 次 + 记录 Y 次 = 总计 Z 次"
- 闲置提醒判定逻辑不受影响（仍基于最后使用日期）

## Capabilities

### New Capabilities
- `initial-use-count`: 允许用户在创建或编辑资产时设置初始使用次数，修改次均成本计算公式以包含初始次数

### Modified Capabilities
（无需修改现有 spec 的需求级行为，holding-cost-calc 的摊销计算不涉及次均成本）

## Impact

- **数据库**: 需在 `assets` 表新增 `initial_use_count INTEGER NOT NULL DEFAULT 0` 列，新增 migration（v8）
- **数据模型**: `Asset` 接口新增 `initialUseCount: number` 字段
- **计算引擎**: `UsageCalculator.calculate()` 中 `useCount` 改为 `initialUseCount + recordCount`
- **UI 组件**: `AddAssetModal`（创建/编辑表单增加初始次数输入）、`AssetDetailModal`（使用次数展示拆分）、`assets.tsx` 列表卡片展示
- **导入/导出**: `import-service.ts` / `export-service.ts` 需兼容新字段
