## Why

总览页"次均成本洞察"模块存在两个问题：(1) 未开启使用追踪的资产也被纳入统计，导致排行数据不准确；(2) "最贵单次"和"闲置提醒"两个 Tab 设计冗余，用户更希望看到一个简洁的次均成本排行列表，闲置信息作为角标融入排行即可。

## What Changes

- **Bug 修复**：次均成本计算和排行过滤增加 `asset.usageTracking === true` 条件，未开启使用追踪的资产不纳入统计
- **UI 简化**：去掉"最贵单次"/"闲置提醒" Tab 切换，改为单个"次均成本排行"列表，按次均成本降序排列，显示 top 3
- **闲置角标**：闲置 90 天以上的物品在排行行内显示 `⚠️闲置X天` 标记，兼顾排行和闲置提醒
- **代码清理**：移除 `neglectedItems` / `usageTab` 等相关 state 和 `getNeglected()` 调用

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `dashboard-redesign`: 次均成本洞察区域从双 Tab 设计改为单排行列表，增加闲置角标，过滤非追踪资产

## Impact

- **受影响文件**：`app/index.tsx`（UI 重构 + state 清理）、`src/engine/UsageCalculator.ts`（calculateAll 过滤）
- **用户体验**：更简洁的次均成本展示，数据更准确
- **无数据库变更**、无 API 变更
