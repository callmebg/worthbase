## Context

WorthBase 当前的次均成本追踪系统由两部分组成：
1. `assets` 表的 `usage_tracking` 字段（是否开启追踪）
2. `usage_records` 表（每次使用追加一条记录）

`UsageCalculator.calculate()` 通过 `SELECT COUNT(*) FROM usage_records` 获取使用次数，然后 `purchasePrice / useCount` 得出次均成本。新用户补录历史物品时，`usage_records` 从 0 开始，导致次均成本失效。

## Goals / Non-Goals

**Goals:**
- 允许用户在创建或编辑资产时设置初始使用次数
- 次均成本计算结果包含初始次数，使补录历史物品的统计数据有意义
- 资产详情页清晰展示初始次数和记录次数的构成

**Non-Goals:**
- 不做历史使用记录的批量导入（只设总数，不补单条记录）
- 不改变闲置提醒的判定逻辑（仍基于 `lastUsedAt` 或 `purchaseDate`）
- 不引入"估算使用频率"等推测功能

## Decisions

### Decision 1: 在 `assets` 表新增列 vs 独立的 `usage_initial` 表

**选择**: 在 `assets` 表新增 `initial_use_count INTEGER NOT NULL DEFAULT 0` 列

**理由**:
- 初始次数是资产的一个固有属性，和 `usage_tracking` 逻辑上同属一个实体
- 查询时无需 JOIN，保持 `UsageCalculator` 的简洁性
- 与现有的 `expected_lifespan_months`、`residual_value` 等可选数值字段模式一致

**替代方案**: 独立表 `asset_usage_meta(asset_id, initial_count)` — 更灵活但增加复杂度，当前不需要

### Decision 2: 计算公式的语义

**选择**: `总次数 = initial_use_count + COUNT(usage_records)`

**理由**:
- 直观：用户填的"初始次数"就是"在开始用这个 App 之前已经用了多少次"
- 向后兼容：`initial_use_count = 0` 时行为和现在完全一致
- `costPerUse = purchasePrice / (initialUseCount + recordCount)`，当两者之和为 0 时仍返回 `Infinity`

### Decision 3: UI 交互设计

**选择**: 在 AddAssetModal 第三步（可选设置步骤），当 `usageTracking = true` 时，显示一个"初始使用次数"的数字输入框，默认值为 0，placeholder 提示"已经用了多少次？"

**理由**:
- 复用现有的 3 步表单结构，不增加新步骤
- 只在用户开启次均追踪时显示，保持界面简洁
- 默认值 0 确保不影响不关心此功能的用户

### Decision 4: 展示层拆分

**选择**: 在 `AssetDetailModal` 的使用次数展示区域，显示格式从 "X 次" 改为 "初始 X 次 + 记录 Y 次 = 总计 Z 次"（仅当 `initialUseCount > 0` 时展示拆分，否则只显示 "X 次"）

**理由**:
- 透明度：用户能看到数据的来源构成
- 不改变无初始次数用户的现有体验

## Risks / Trade-offs

- **[Risk] 用户可能随意填写初始次数，导致数据不准** → 可接受。这是用户自己的参考数据，不影响财务计算
- **[Risk] Migration v8 对已有用户的影响** → `DEFAULT 0` 确保完全向后兼容，现有用户不受影响
- **[Trade-off] 不支持单条历史记录的补录** → 简化实现，覆盖 90% 的场景。需要精确历史记录的用户可以逐条手动添加
