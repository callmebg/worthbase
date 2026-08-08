## Context

WorthBase 使用 `balance_snapshots` 表记录账户余额变更历史。每次用户更新余额时，会插入一条新记录（account_id, balance, snapshot_date）。

当前存在一个数据查询 bug：
- `getBalancesForDate(date)` 只返回**在该日期恰好有快照记录的账户**
- `getLatestSnapshotForDate(date)` 返回**截至该日期每个账户的最新余额**（已存在但未被使用）

账户页的"余额总计"使用 `getAllLatestBalances()`（正确），而"余额历史"和总览页"净资产趋势"使用 `getBalancesForDate()`（错误）。两者算法不一致导致数值对不上。

## Goals / Non-Goals

**Goals:**
- 余额历史中每个日期行的合计 = 截至该日所有活跃账户的最新余额之和
- 净资产趋势图中每个数据点 = 截至该日所有活跃账户最新余额 + 资产估值
- 余额历史最新日期行的合计 = 账户页"账户余额总计"
- 趋势图最新数据点 = 总览页 Hero Card 的净资产数值

**Non-Goals:**
- 不改变余额快照的写入逻辑（仍为每次更新插入新行）
- 不修改数据库 schema
- 不改变资产估值的趋势计算（该部分已正确使用 "as-of" 查询）
- 不处理已删除账户在历史趋势中的可见性问题（留作后续改进）

## Decisions

### Decision 1: 使用已有的 `getLatestSnapshotForDate()` 方法

**选择**: 直接替换 `getBalancesForDate()` 为 `getLatestSnapshotForDate()`

**理由**: 该方法已存在于 `BalanceSnapshotRepository`，SQL 逻辑正确：
```sql
SELECT bs.account_id, bs.balance
FROM balance_snapshots bs
INNER JOIN (
  SELECT account_id, MAX(snapshot_date) as max_date
  FROM balance_snapshots WHERE snapshot_date <= ? GROUP BY account_id
) latest ON bs.account_id = latest.account_id AND bs.snapshot_date = latest.max_date
INNER JOIN accounts a ON bs.account_id = a.id AND a.deleted_at IS NULL;
```

**替代方案**: 在写入新快照时为所有账户"补录"当天快照（carry-forward）。否决理由：增加写入复杂度和存储开销，且与"用户手动更新"的设计意图不符。

### Decision 2: 两处修改点使用相同的替换策略

**选择**: `BalanceHistorySheet` 和趋势计算均使用 `getLatestSnapshotForDate()`

**理由**: 两处问题的根因完全相同，使用一致的修复方式便于理解和维护。

## Risks / Trade-offs

- **[性能]** `getLatestSnapshotForDate()` 比 `getBalancesForDate()` 多一个子查询 JOIN → 可接受：余额历史限制30条，趋势图经下采样后最多24个点，查询量很小
- **[已删除账户]** `getLatestSnapshotForDate()` 排除了 `deleted_at IS NOT NULL` 的账户，意味着已删除账户在其存在期间的历史数据不会出现在趋势中 → 可接受：当前行为已经是这样（`activeAccountIds` 过滤也排除了已删除账户），且与"账户余额总计"的计算逻辑一致
- **[同一天多次更新]** 如果同一账户在同一天多次更新余额，`getLatestSnapshotForDate` 的子查询用 `MAX(snapshot_date)` 但 `snapshot_date` 是日期字符串（不含时间），可能返回多条记录 → 需验证：实际上 `snapshot_date` 是 `YYYY-MM-DD` 格式，同一天多条记录时 `MAX(snapshot_date)` 相同，JOIN 后会返回所有该天的记录。这与 `getBalancesForDate` 行为相同，但账户余额合计会重复计算。→ 缓解：`getAllLatestBalances()` 也有同样问题且一直在使用，说明实际场景中同一天多次更新较少见
