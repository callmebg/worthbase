## Why

用户在更新账户余额后，"余额历史"中的数值与"账户余额总计"不一致，且可能出现"入账后余额历史数值反而下降"的反直觉现象。总览页的"净资产"Hero Card 与下方"净资产趋势"折线图的数值也对不上。这是因为历史数据查询使用了错误的算法——只统计当天恰好有快照记录的账户，而非截至该日期所有账户的最新余额。

## What Changes

- 修复 `BalanceHistorySheet`（账户页余额历史）：将 `getBalancesForDate(date)` 替换为 `getLatestSnapshotForDate(date)`，使每个历史日期显示截至该日所有活跃账户的余额合计
- 修复总览页净资产趋势图：同样将 `getBalancesForDate(date)` 替换为 `getLatestSnapshotForDate(date)`，使趋势线上每个数据点反映截至该日的完整净资产
- 修复后，余额历史的合计数字将与账户余额总计保持一致（最新日期行 = 总计），趋势图最新点将与 Hero Card 净资产数值匹配

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `account-management`: 余额历史查询逻辑变更——从"当天快照合计"改为"截至当天所有账户最新余额合计"
- `net-worth-trend`: 趋势数据计算逻辑变更——账户余额部分从"当天快照合计"改为"截至当天所有活跃账户最新余额合计"

## Impact

- **受影响文件**：`app/accounts.tsx`（BalanceHistorySheet 组件）、`app/index.tsx`（loadData 趋势计算）
- **数据库**：无 schema 变更，使用已存在的 `getLatestSnapshotForDate()` 方法
- **性能**：趋势计算对每个历史日期执行一次 `getLatestSnapshotForDate()` SQL 查询（含 JOIN 和子查询），替代原来的 `getBalancesForDate()` 简单查询。性能影响可接受，因趋势已有 MAX_POINTS=24 的下采样限制
- **用户体验**：修复后余额历史和趋势图的数值将与用户预期一致，消除困惑
