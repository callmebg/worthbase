## Context

总览页（`app/index.tsx`）的"次均成本洞察"模块当前使用双 Tab 设计：
- **最贵单次**：按 `costPerUse` 降序排列 top 3
- **闲置提醒**：`getNeglected()` 返回 90 天未使用的物品列表

两个 Tab 的数据来源相同（`UsageCalculator`），且"最贵单次"本质就是次均成本排行。用户反馈 Tab 设计冗余，且未开启 `usageTracking` 的资产也出现在排行中。

## Goals / Non-Goals

**Goals:**
- 只展示开启了 `usageTracking` 且有使用记录（`totalUseCount > 0`）的资产
- 单个排行列表，按次均成本降序，显示 top 3
- 闲置 90+ 天的物品在同行显示 `⚠️闲置X天` 角标
- 清理不再需要的 state 和计算逻辑

**Non-Goals:**
- 不改变 `UsageCalculator.calculate()` 单资产计算逻辑
- 不修改资产详情页的使用追踪功能
- 不改变"查看全部"导航行为

## Decisions

### Decision 1: 在 UI 层过滤而非修改 UsageCalculator

**选择**: 在 `index.tsx` 排行构建时过滤 `asset.usageTracking`，同时也在 `UsageCalculator.calculateAll()` 中增加过滤

**理由**: 双重保险。`calculateAll` 过滤避免不必要的数据库查询；UI 层过滤确保即使 `usageMap` 包含非追踪资产也不会显示。

### Decision 2: 闲置信息合入排行行内

**选择**: 在每个排行项中直接使用 `usage.isNeglected` 和 `usage.daysSinceLastUse` 显示角标

**理由**: `UsageResult` 已经包含 `isNeglected` 和 `daysSinceLastUse` 字段，无需额外查询。移除 `getNeglected()` 调用和 `neglectedItems` state。

## Risks / Trade-offs

- **[信息密度]** 排行行内增加闲置角标可能使行略显拥挤 → 可接受：仅在闲置时显示，多数物品不受影响
- **[闲置提醒弱化]** 去掉独立 Tab 后闲置提醒不如之前醒目 → 可接受：角标颜色（warning）足够引起注意
