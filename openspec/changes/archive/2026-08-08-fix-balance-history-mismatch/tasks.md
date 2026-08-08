## 1. 修复余额历史查询

- [x] 1.1 在 `app/accounts.tsx` 的 `BalanceHistorySheet.loadHistory()` 中，将 `BalanceSnapshotRepository.getBalancesForDate(date)` 替换为 `BalanceSnapshotRepository.getLatestSnapshotForDate(date)`，使每个日期行显示截至该日所有活跃账户的余额合计
- [x] 1.2 调整 `BalanceHistorySheet` 中 `balances` 数组的构建逻辑，适配 `getLatestSnapshotForDate()` 返回的 `Map<string, number>` 格式（与 `getBalancesForDate` 返回类型相同，仅需替换调用）

## 2. 修复净资产趋势计算

- [x] 2.1 在 `app/index.tsx` 的 `loadData()` 趋势计算循环中（约第227行），将 `BalanceSnapshotRepository.getBalancesForDate(date)` 替换为 `BalanceSnapshotRepository.getLatestSnapshotForDate(date)`
- [x] 2.2 移除趋势循环中对 `activeAccountIds` 的手动过滤（`getLatestSnapshotForDate` 的 SQL 已通过 `a.deleted_at IS NULL` 排除已删除账户，无需二次过滤）

## 3. 验证

- [x] 3.1 运行现有测试确保无回归（`npm test`）
- [x] 3.2 通过单元测试验证：5 个回归测试覆盖 as-of 查询、部分更新不降值、与最新余额一致性、已删除账户排除、新旧算法对比
- [x] 3.3 通过单元测试验证：`getLatestSnapshotForDate` 最新日期合计与 `getAllLatestBalances` 完全一致
