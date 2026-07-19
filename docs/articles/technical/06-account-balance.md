[TOC]

# 多账户余额管理：8 种账户类型 + 负债处理 + 快照机制

> 微信、支付宝、银行卡、信用卡……你一共有多少钱？

## 8 种账户类型

```typescript
// src/types/enums.ts
export enum AccountType {
  WECHAT = 'wechat',           // 微信零钱
  ALIPAY = 'alipay',           // 支付宝余额
  BANK_CARD = 'bank_card',     // 银行卡
  CASH = 'cash',               // 现金
  FUND = 'fund',               // 基金
  CREDIT_CARD = 'credit_card', // 信用卡 ← 负债
  LOAN = 'loan',               // 贷款   ← 负债
  OTHER = 'other',             // 其他
}
```

其中信用卡和贷款是**负债账户**，余额可以为负数：

```typescript
export const LIABILITY_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set([
  AccountType.CREDIT_CARD,
  AccountType.LOAN,
]);
```

## 负债处理

负债账户和资产账户在 UI 和数据层面的处理差异：

| 维度 | 资产账户 | 负债账户 |
|------|----------|----------|
| 余额范围 | ≥ 0 | 可以为负 |
| 余额显示 | 正常显示 | 红色 + 负号 |
| 汇总计算 | 加到总额 | 从总额中减去 |
| 净资产影响 | 增加净资产 | 减少净资产 |

在净资产计算中，负债账户的负余额直接参与求和：

```typescript
// NetWorthCalculator.ts
const balances = await AccountRepository.getAllLatestBalances();
let liquidAssets = 0;
for (const balance of balances.values()) {
  liquidAssets += balance;  // 负数自然减少总额
}
```

微信 ¥5,000 + 银行卡 ¥30,000 + 信用卡 -¥3,000 = 流动资产 ¥32,000。不需要特殊处理，数学本身就是对的。

## 快照机制：追加不修改

余额不是直接存在账户表里的。每次更新余额，都会创建一条**快照记录**：

```sql
CREATE TABLE balance_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  balance REAL NOT NULL,
  snapshot_date TEXT NOT NULL
);

-- 按账户+日期查询（取最新余额）
CREATE INDEX idx_snapshots_account_date ON balance_snapshots(account_id, snapshot_date);
-- 按日期查询（趋势图数据）
CREATE INDEX idx_snapshots_date ON balance_snapshots(snapshot_date);
```

**设计原则：快照是追加式的，不修改历史记录。**

```
微信账户的快照历史：
2025-01-15  ¥3,000
2025-02-15  ¥4,200
2025-03-15  ¥3,800  ← 最新
```

这个设计的好处：
1. **历史可追溯**：任何时候都能看到过去的余额
2. **趋势图数据**：直接从快照表按日期查询
3. **数据完整性**：不会出现"被篡改"的情况

## 获取所有账户的最新余额

这是 Dashboard 和净资产计算的核心查询：

```typescript
// src/db/account-repository.ts
async getAllLatestBalances(): Promise<Map<string, number>> {
  const rows = await db.getAllAsync(`
    SELECT bs.account_id, bs.balance
    FROM balance_snapshots bs
    INNER JOIN (
      SELECT account_id, MAX(snapshot_date) as max_date
      FROM balance_snapshots
      GROUP BY account_id
    ) latest
      ON bs.account_id = latest.account_id
      AND bs.snapshot_date = latest.max_date
    INNER JOIN accounts a
      ON bs.account_id = a.id
      AND a.deleted_at IS NULL
  `);
  return new Map(rows.map(r => [r.account_id, r.balance]));
}
```

这个 SQL 做了三件事：
1. 子查询找出每个账户的**最新快照日期**（`MAX(snapshot_date)`）
2. 用这个日期回 JOIN 快照表，拿到**实际余额值**
3. 再 JOIN 账户表，**过滤掉已软删除的账户**

## 软删除设计

账户不会被物理删除。删除只是设置 `deleted_at` 时间戳：

```typescript
// src/db/account-repository.ts
async delete(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?;',
    now, now, id
  );
}
```

**为什么要软删除？** 因为余额快照是趋势图的数据源。如果物理删除账户，历史快照也会级联删除，趋势图上就会出现断层。软删除让账户"从列表中消失"，但历史数据仍然保留。

所有查询都通过 `WHERE deleted_at IS NULL` 过滤：

```sql
SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order;
```

## UI/UX 设计决策

### 1. 余额更新 = 输入新值，不是加减操作

用户更新余额时，直接输入当前余额（比如"3500"），而不是"充值 500"或"消费 200"。

**理由**：个人财务管理的核心是"状态"而不是"流水"。你不一定记得每一笔消费，但你知道微信里现在有多少钱。这降低了使用门槛。

### 2. 长按排序

账户列表支持长按拖动排序。`sort_order` 字段存在数据库里，拖放后批量更新。

### 3. 总余额一键可见

账户列表顶部显示所有账户的余额总和。点击可展开/收起各账户明细。负债账户的负数以红色显示，视觉上就能区分"你有的"和"你欠的"。

🔗 **源码**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase) | [account-repository.ts](https://github.com/callmebg/worthbase/blob/main/src/db/account-repository.ts) | [account-store.ts](https://github.com/callmebg/worthbase/blob/main/src/stores/account-store.ts)

---

> **CSDN 标签**: `SQLite` `React Native` `数据库` `UI设计`
> **掘金话题**: `前端` `数据库` `React Native`
