[TOC]

# 本地优先架构实践：SQLite + Repository 模式 + 自动备份

> 不联网、不注册、不上云。你的财务数据只存在你手机上。

## 为什么选择本地优先

做"本地优先"（Local-First）不是因为技术限制，而是产品定位的刻意选择：

**1. 隐私**
财务数据是最敏感的个人信息之一。你有多少存款、你的房子值多少、你的信用卡欠多少——这些信息不应该存在于任何第三方服务器上。WorthBase 不主动发起任何网络请求。

**2. 离线可用**
地铁里、飞机上、山区旅行——任何地方都能打开 App 查看和更新数据。不依赖网络状态。

**3. 数据所有权**
你的数据是你的。不存在"服务商停止运营后数据丢失"的问题。数据就是一个 `.db` 文件，你可以随时复制、备份、迁移。

## 数据库设计

### Schema：7 张表

```sql
-- 账户表（8 种类型）
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,          -- wechat/alipay/bank_card/cash/fund/credit_card/loan/other
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  deleted_at TEXT,             -- 软删除，不物理删除
  created_at TEXT,
  updated_at TEXT
);

-- 余额快照表（追加式，不修改历史）
CREATE TABLE balance_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  balance REAL NOT NULL,
  snapshot_date TEXT NOT NULL
);

-- 实物资产表（8 种分类，4 种分摊方式）
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,       -- vehicle/real_estate/electronics/digital/home/luxury/precious_metal/other
  purchase_date TEXT NOT NULL,
  purchase_price REAL NOT NULL,
  amortization_type TEXT NOT NULL,
  expected_lifespan_months INTEGER,
  residual_value REAL,
  valuation_tracking INTEGER DEFAULT 0,
  current_valuation REAL,
  status TEXT DEFAULT 'active', -- active/retired/sold
  sell_date TEXT,
  sell_price REAL,
  weight_grams REAL,
  image_path TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 经常性支出（保险、停车费等，按月生效）
CREATE TABLE recurring_expenses (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets(id),
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,            -- null = 持续生效
  ended_reason TEXT
);

-- 一次性维护记录（维修、保养）
CREATE TABLE maintenance_records (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets(id),
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  amortize INTEGER DEFAULT 0   -- 是否纳入月均分摊
);

-- 估值历史（可选追踪）
CREATE TABLE valuation_history (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets(id),
  valuation REAL NOT NULL,
  recorded_date TEXT NOT NULL
);

-- 应用设置（KV 存储）
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 索引策略

针对高频查询场景建索引：

```sql
-- 余额快照：按账户+日期查询（最新余额）
CREATE INDEX idx_snapshots_account_date ON balance_snapshots(account_id, snapshot_date);
-- 余额快照：按日期查询（趋势图数据）
CREATE INDEX idx_snapshots_date ON balance_snapshots(snapshot_date);
-- 经常性支出：按生效区间查询（当月有哪些支出生效）
CREATE INDEX idx_recurring_effective ON recurring_expenses(effective_from, effective_to);
```

### Repository 模式

每个表对应一个 Repository 对象，封装所有 SQL 操作：

```typescript
// src/db/account-repository.ts (简化)
export const AccountRepository = {
  async getAll(): Promise<Account[]> { ... },
  async create(account: Account): Promise<void> { ... },
  async update(id: string, updates: Partial<Account>): Promise<void> { ... },
  async softDelete(id: string): Promise<void> { ... },  // SET deleted_at = now

  // 聚合查询：获取所有账户的最新余额
  async getAllLatestBalances(): Promise<Map<string, number>> {
    const result = await db.getAllAsync(`
      SELECT bs.account_id, bs.balance
      FROM balance_snapshots bs
      INNER JOIN (
        SELECT account_id, MAX(snapshot_date) as max_date
        FROM balance_snapshots
        GROUP BY account_id
      ) latest ON bs.account_id = latest.account_id
               AND bs.snapshot_date = latest.max_date
      INNER JOIN accounts a ON bs.account_id = a.id
      WHERE a.deleted_at IS NULL
    `);
    return new Map(result.map(r => [r.account_id, r.balance]));
  },
};
```

没有 ORM，没有 query builder，纯 SQL。对于 7 张表的项目来说，ORM 引入的抽象层比它解决的问题更多。

## 自动备份：5 行代码的数据安全

本地优先 App 最大的风险是数据丢失——手机丢了、App 被卸载、数据库文件损坏。

我的解决方案极其简单：

```typescript
// app/_layout.tsx:58-66
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    const prev = appStateRef.current;
    appStateRef.current = nextAppState;

    // App 退到后台 → 自动备份
    if (prev === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
      BackupService.createBackup();
    }
  });
  return () => subscription.remove();
}, []);
```

`BackupService.createBackup()` 做的事情就是把 SQLite `.db` 文件原封不动地复制到 `backups/` 目录，文件名带时间戳。最多保留 3 份，旧的自动删除。

没有后台任务、没有定时器、没有推送通知。**App 退后台就备份，就这么朴素。**

## 数据导出/导入

### JSON 导出

用户手动触发，生成结构化 JSON 文件：

```json
{
  "version": 1,
  "exportDate": "2026-07-12T08:00:00.000Z",
  "accounts": [...],
  "balanceSnapshots": [...],
  "assets": [...],
  "recurringExpenses": [...],
  "maintenanceRecords": [...],
  "valuationHistory": [...],
  "settings": {...}
}
```

从 7 个 Repository 各取全量数据，打包成一个 JSON。通过 `expo-sharing` 调起系统分享面板，用户可以发到微信、邮件、云盘。

### JSON 导入（最复杂的部分）

导入不是简单的"把 JSON 写进数据库"。核心挑战是 **ID 重映射**：

1. 清空所有 7 张表
2. 逐条插入 accounts，记录 `oldId → newId` 映射
3. 逐条插入 assets，同样记录映射
4. 插入子表（balance_snapshots、recurring_expenses 等），用映射表替换外键
5. 如果父记录不存在（孤儿记录），静默跳过

**整个过程在一个数据库事务内执行**。任何一步失败，全部回滚。

```typescript
// src/services/import-service.ts (简化)
await db.withTransactionAsync(async () => {
  // 清空所有表
  for (const table of TABLES) {
    await db.execAsync(`DELETE FROM ${table}`);
  }

  // 重建账户，记录 ID 映射
  const accountIdMap = new Map<string, string>();
  for (const account of data.accounts) {
    const newId = generateId();
    accountIdMap.set(account.id, newId);
    await AccountRepository.create({ ...account, id: newId });
  }

  // 重建子表，替换外键
  for (const snapshot of data.balanceSnapshots) {
    const newAccountId = accountIdMap.get(snapshot.accountId);
    if (!newAccountId) continue;  // 孤儿记录，跳过
    await BalanceSnapshotRepository.create({
      ...snapshot,
      accountId: newAccountId,
    });
  }
  // ... 其他表类似
});
```

### CSV 导出

给人看的格式，方便在 Excel 里查看：

```
日期, 微信零钱, 支付宝余额, 招商储蓄卡, ..., 总计
2025-01-15, 3500, 12000, 45000, ..., 60500
2025-02-15, 4000, 11500, 46000, ..., 61500
```

## 局限性

本地优先不是万能的：

| 局限 | 说明 | 缓解方案 |
|------|------|----------|
| 无多端同步 | 换设备需要手动导出/导入 | JSON 文件 + 系统分享 |
| 设备丢失 = 数据丢失 | 如果没备份 | 自动备份到本地（退后台触发） |
| 图片未备份 | 资产照片存在文件系统中，`.db` 备份不包含图片 | 已知问题，计划中 |
| 无加密 | SQLite 文件可以被直接读取 | 应用锁保护 App 访问 |

## 总结

本地优先架构的核心原则：**简单胜过完备**。

- 不用云同步，用文件导出/导入
- 不用后台任务，用 AppState 监听
- 不用 ORM，用纯 SQL
- 不用复杂加密，用应用锁

对于一个个人财务 App 来说，这些"简单方案"已经够用了。

🔗 **源码**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase) | [db/](https://github.com/callmebg/worthbase/tree/main/src/db) | [services/](https://github.com/callmebg/worthbase/tree/main/src/services)

---

> **CSDN 标签**: `SQLite` `React Native` `数据安全` `本地存储` `架构`
> **掘金话题**: `前端` `数据库` `React Native` `架构`
