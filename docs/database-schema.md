# WorthBase (家底) 数据库架构文档

## 目录

1. [架构概览](#架构概览)
2. [实体关系图 (ER Diagram)](#实体关系图)
3. [数据表详细说明](#数据表详细说明)
4. [索引设计](#索引设计)
5. [迁移系统](#迁移系统)
6. [Repository 模式](#repository-模式)
7. [数据关系与业务逻辑](#数据关系与业务逻辑)
8. [设计决策与备注](#设计决策与备注)

---

## 架构概览

WorthBase 采用 **本地优先 (local-first)** 架构，所有数据存储在设备端的 SQLite 数据库中（文件名：`worthbase.db`）。无云端同步，无远程服务器依赖，用户数据完全保留在本机。

### 核心技术选型

| 维度 | 选型 | 说明 |
|------|------|------|
| 数据库引擎 | SQLite | 通过 `expo-sqlite` 访问，适用于 React Native / Expo 移动端 |
| 外键约束 | 启用 | 初始化时执行 `PRAGMA foreign_keys = ON`，支持级联删除 |
| 主键策略 | 文本型 ID | 使用 `时间戳(base36) + 随机数(base36)` 生成，避免外部 UUID 依赖 |
| 日期存储 | ISO 8601 文本 | 所有日期/时间均以 ISO 8601 字符串存储（如 `2025-07-15` 或完整时间戳） |
| 布尔值存储 | 整数 (0/1) | SQLite 无原生布尔类型，使用 `INTEGER` 存储，Repository 层负责转换 |
| 迁移机制 | 版本号递增 | 基于 `db_version` 表的版本追踪，每个迁移在独立事务中执行 |

### 初始化流程

```
initDatabase()
  ├── SQLite.openDatabaseAsync('worthbase.db')
  ├── PRAGMA foreign_keys = ON
  ├── 执行 CREATE_TABLES_SQL（所有建表语句，IF NOT EXISTS）
  ├── 执行 CREATE_INDEXES_SQL（所有索引语句，IF NOT EXISTS）
  └── runMigrations()（执行尚未应用的版本迁移）
```

数据库实例以 **单例模式** 管理，`initDatabase()` 多次调用安全返回同一实例。

---

## 实体关系图

```
┌─────────────────────┐
│      accounts       │
│─────────────────────│
│  id (PK)            │
│  name               │
│  type               │
│  icon               │
│  sort_order         │
│  deleted_at         │◄──┐ 软删除
│  created_at         │   │
│  updated_at         │   │
└────────┬────────────┘   │
         │                │
         │ 1:N            │
         │ ON DELETE      │
         │ CASCADE        │
         ▼                │
┌─────────────────────┐   │
│  balance_snapshots  │   │
│─────────────────────│   │
│  id (PK)            │   │
│  account_id (FK)────┼───┘
│  balance            │
│  snapshot_date      │
└─────────────────────┘

┌─────────────────────┐
│       assets        │
│─────────────────────│
│  id (PK)            │
│  name               │
│  category           │
│  purchase_date      │
│  purchase_price     │
│  amortization_type  │
│  expected_lifespan  │
│  residual_value     │
│  valuation_tracking │
│  current_valuation  │
│  status             │
│  sell_date          │
│  sell_price         │
│  weight_grams       │
│  image_path         │
│  created_at         │
│  updated_at         │
└──┬───┬───┬──────────┘
   │   │   │
   │   │   │ 1:N  ON DELETE CASCADE
   │   │   │
   │   │   └──────────────────────────┐
   │   │                              │
   │   │ 1:N  ON DELETE CASCADE       │ 1:N  ON DELETE CASCADE
   │   │                              │
   │   ▼                              ▼
   │  ┌─────────────────────┐  ┌─────────────────────┐
   │  │ recurring_expenses  │  │ maintenance_records  │
   │  │─────────────────────│  │─────────────────────│
   │  │  id (PK)            │  │  id (PK)            │
   │  │  asset_id (FK)      │  │  asset_id (FK)      │
   │  │  name               │  │  name               │
   │  │  amount             │  │  amount             │
   │  │  effective_from     │  │  date               │
   │  │  effective_to       │  │  amortize           │
   │  │  ended_reason       │  │  created_at         │
   │  │  created_at         │  └─────────────────────┘
   │  └─────────────────────┘
   │
   │ 1:N  ON DELETE CASCADE
   │
   ▼
  ┌─────────────────────┐       ┌─────────────────────┐
  │  valuation_history   │       │      settings       │
  │─────────────────────│       │─────────────────────│
  │  id (PK)            │       │  key (PK)           │
  │  asset_id (FK)      │       │  value              │
  │  valuation          │       └─────────────────────┘
  │  recorded_date      │         (独立键值表，无外键)
  └─────────────────────┘

  ┌─────────────────────┐
  │     db_version      │
  │─────────────────────│
  │  version (PK)       │  (迁移追踪内部表)
  │  description        │
  │  applied_at         │
  └─────────────────────┘
```

### 关系总结

| 父表 | 子表 | 关系 | 删除行为 |
|------|------|------|----------|
| `accounts` | `balance_snapshots` | 1:N | **CASCADE** — 删除账户自动清除所有余额快照 |
| `assets` | `recurring_expenses` | 1:N | **CASCADE** — 删除资产自动清除所有经常性支出 |
| `assets` | `maintenance_records` | 1:N | **CASCADE** — 删除资产自动清除所有维护记录 |
| `assets` | `valuation_history` | 1:N | **CASCADE** — 删除资产自动清除所有估值历史 |
| `settings` | — | 独立 | 无外键关系 |

---

## 数据表详细说明

### 1. `accounts` — 账户表

**用途：** 存储用户的金融账户信息，如微信、支付宝、银行卡、现金、基金、信用卡、贷款等。是流动性资产（余额）的载体。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY, NOT NULL | 唯一标识符（时间戳+随机数） |
| `name` | TEXT | NOT NULL | 账户名称（如「招商银行储蓄卡」） |
| `type` | TEXT | NOT NULL | 账户类型，取值见下方枚举 |
| `icon` | TEXT | 可空 | 自定义图标标识 |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | 排序权重，越小越靠前 |
| `deleted_at` | TEXT | 可空 | 软删除时间戳，NULL 表示活跃 |
| `created_at` | TEXT | NOT NULL | 创建时间（ISO 8601） |
| `updated_at` | TEXT | NOT NULL | 最后更新时间（ISO 8601） |

**账户类型枚举 (`AccountType`)：**

| 值 | 中文标签 | 说明 |
|----|----------|------|
| `wechat` | 微信 | 微信支付账户 |
| `alipay` | 支付宝 | 支付宝账户 |
| `bank_card` | 银行卡 | 银行储蓄卡 |
| `cash` | 现金 | 手持现金 |
| `fund` | 基金 | 基金/理财账户 |
| `credit_card` | 信用卡 | 信用卡（负债类） |
| `loan` | 贷款 | 贷款（负债类） |
| `other` | 其他 | 其他类型 |

> **负债类型标记：** `credit_card` 和 `loan` 被归类为负债账户（`LIABILITY_ACCOUNT_TYPES`），其余额表示欠款而非资产。

**索引：**
- `idx_accounts_deleted_at` — 加速软删除筛选查询

**特殊设计：**
- 采用 **软删除** 机制：删除账户时仅设置 `deleted_at` 时间戳，不物理删除，以保留余额历史数据用于趋势图表。同时提供 `hardDelete` 方法用于需要物理清除的场景。

---

### 2. `balance_snapshots` — 余额快照表

**用途：** 记录每个账户在特定日期的余额值，形成时间序列数据。是计算净资产、绘制余额趋势图的核心数据来源。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY, NOT NULL | 唯一标识符 |
| `account_id` | TEXT | NOT NULL, FK → accounts(id) | 关联账户 |
| `balance` | REAL | NOT NULL | 该日期的账户余额 |
| `snapshot_date` | TEXT | NOT NULL | 快照日期（YYYY-MM-DD） |

**外键：** `account_id` → `accounts(id)` **ON DELETE CASCADE**

**索引：**
- `idx_snapshots_account_date` (`account_id`, `snapshot_date`) — 复合索引，加速按账户+日期范围查询
- `idx_snapshots_date` (`snapshot_date`) — 加速按日期查询所有账户余额

**余额查询模式：**
- **最新余额：** 取 `snapshot_date` 最大的一条记录
- **历史趋势：** 按日期范围查询，绘制折线图
- **净资产计算：** 汇总所有活跃账户的最新余额
- **指定日期快照：** 通过 `getLatestSnapshotForDate(date)` 获取某日期（或之前最近日期）的所有账户余额

---

### 3. `assets` — 实物资产表

**用途：** 存储用户拥有的实物资产信息（车辆、房产、电子产品、数码产品、家居、奢侈品、贵金属等）。是持有成本计算和净资产估值的核心实体。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY, NOT NULL | 唯一标识符 |
| `name` | TEXT | NOT NULL | 资产名称（如「iPhone 15 Pro」） |
| `category` | TEXT | NOT NULL | 资产分类，取值见下方枚举 |
| `purchase_date` | TEXT | NOT NULL | 购买日期（ISO 8601） |
| `purchase_price` | REAL | NOT NULL | 购买价格 |
| `amortization_type` | TEXT | NOT NULL | 分摊方式，取值见下方枚举 |
| `expected_lifespan_months` | INTEGER | 可空 | 预期使用寿命（月），用于 `expected_lifespan` 和 `residual_value` 分摊 |
| `residual_value` | REAL | 可空 | 预估残值，用于 `residual_value` 分摊方式 |
| `valuation_tracking` | INTEGER | NOT NULL, DEFAULT 0 | 是否开启估值追踪（0/1） |
| `current_valuation` | REAL | 可空 | 当前估值 |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | 生命周期状态 |
| `sell_date` | TEXT | 可空 | 出售日期（状态变为 `sold` 时设置） |
| `sell_price` | REAL | 可空 | 出售价格 |
| `weight_grams` | REAL | 可空 | 重量（克），用于贵金属类资产 |
| `image_path` | TEXT | 可空 | 资产图片的本地文件路径 |
| `created_at` | TEXT | NOT NULL | 创建时间（ISO 8601） |
| `updated_at` | TEXT | NOT NULL | 最后更新时间（ISO 8601） |

**资产分类枚举 (`AssetCategory`)：**

| 值 | 中文标签 | 说明 |
|----|----------|------|
| `vehicle` | 车辆 | 汽车、摩托车等 |
| `real_estate` | 房产 | 房屋、商铺等 |
| `electronics` | 电子产品 | 手机、平板、电脑等 |
| `digital` | 数码产品 | 相机、耳机等数码配件 |
| `home` | 家居 | 家具、家电（由 `furniture` + `appliance` 合并而来） |
| `luxury` | 奢侈品 | 手表、包袋等 |
| `precious_metal` | 贵金属 | 黄金、白银等（配合 `weight_grams` 使用） |
| `other` | 其他 | 其他分类 |

**分摊方式枚举 (`AmortizationType`)：**

| 值 | 中文标签 | 计算公式 |
|----|----------|----------|
| `simple_linear` | 简单线性分摊 | 购入价 ÷ 已持有月数（随时间递减） |
| `expected_lifespan` | 预期寿命分摊 | 购入价 ÷ 预期使用月数（每月固定） |
| `residual_value` | 残值分摊 | (购入价 − 预估残值) ÷ 预期使用月数（每月固定） |
| `no_amortization` | 不分摊 | 月分摊成本 = 0，仅计算经常性支出和维护费 |

**资产状态枚举 (`AssetStatus`)：**

| 值 | 中文标签 | 说明 |
|----|----------|------|
| `active` | 使用中 | 正常持有和使用 |
| `retired` | 退役 | 不再使用但未出售（停止分摊和经常性支出） |
| `sold` | 已售 | 已出售（记录出售日期和价格） |

**状态转换规则：**
```
active → retired    （退役：停止分摊，结束所有经常性支出）
active → sold       （出售：记录出售信息，结束所有经常性支出）
retired → active    （恢复：重新激活，恢复因退役而结束的经常性支出）
retired → sold      （出售：从退役状态直接出售）
```

**索引：**
- `idx_assets_status` (`status`) — 加速按状态筛选
- `idx_assets_category` (`category`) — 加速按分类筛选

---

### 4. `recurring_expenses` — 经常性支出表

**用途：** 记录与资产关联的周期性支出（如手机月租、车辆保险、房屋物业费等）。每条记录有生效区间，支持手动结束或因资产状态变更而自动结束。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY, NOT NULL | 唯一标识符 |
| `asset_id` | TEXT | NOT NULL, FK → assets(id) | 关联资产 |
| `name` | TEXT | NOT NULL | 支出名称（如「车险」、「话费套餐」） |
| `amount` | REAL | NOT NULL | 每期金额 |
| `effective_from` | TEXT | NOT NULL | 生效起始月份（YYYY-MM） |
| `effective_to` | TEXT | 可空 | 生效截止月份（YYYY-MM），NULL 表示持续中 |
| `ended_reason` | TEXT | 可空 | 结束原因：`manual`（手动）、`retired`（退役）、`sold`（出售） |
| `created_at` | TEXT | NOT NULL | 创建时间（ISO 8601） |

**外键：** `asset_id` → `assets(id)` **ON DELETE CASCADE**

**索引：**
- `idx_recurring_asset` (`asset_id`) — 加速按资产查询其所有经常性支出
- `idx_recurring_effective` (`effective_from`, `effective_to`) — 加速按生效区间查询

**生效区间查询逻辑：**
```sql
-- 查询某月份生效的支出
WHERE effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
```

**结束原因 (`ended_reason`)：**
| 值 | 含义 | 触发场景 |
|----|------|----------|
| `manual` | 手动结束 | 用户主动终止该支出 |
| `retired` | 因退役结束 | 资产标记为退役时自动结束 |
| `sold` | 因出售结束 | 资产出售时自动结束 |
| NULL | 持续中 | 支出仍在生效 |

> **恢复机制：** 当退役资产恢复为活跃状态时，因 `retired` 原因结束的经常性支出会被自动恢复（`effective_to` 重置为 NULL，`ended_reason` 重置为 NULL）。

---

### 5. `maintenance_records` — 一次性维护记录表

**用途：** 记录资产的一次性维护/维修支出（如更换电池、车辆保养、房屋维修等）。可选择是否将费用分摊到剩余持有月份。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY, NOT NULL | 唯一标识符 |
| `asset_id` | TEXT | NOT NULL, FK → assets(id) | 关联资产 |
| `name` | TEXT | NOT NULL | 维护项目名称（如「更换电池」） |
| `amount` | REAL | NOT NULL | 维护费用 |
| `date` | TEXT | NOT NULL | 维护日期（ISO 8601） |
| `amortize` | INTEGER | NOT NULL, DEFAULT 0 | 是否分摊（0=仅记录，1=分摊到剩余持有月数） |
| `created_at` | TEXT | NOT NULL | 创建时间（ISO 8601） |

**外键：** `asset_id` → `assets(id)` **ON DELETE CASCADE**

**索引：**
- `idx_maintenance_asset` (`asset_id`) — 加速按资产查询维护记录
- `idx_maintenance_date` (`date`) — 加速按日期范围查询

**分摊逻辑：**
- `amortize = 0`：费用仅作为历史记录，不影响月度持有成本计算
- `amortize = 1`：费用将分摊到资产剩余持有月份中，影响月度持有成本

---

### 6. `valuation_history` — 估值历史表

**用途：** 记录资产的历史估值变化，用于追踪资产价值波动（如房产升值、车辆贬值）。配合 `assets.current_valuation` 字段使用。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY, NOT NULL | 唯一标识符 |
| `asset_id` | TEXT | NOT NULL, FK → assets(id) | 关联资产 |
| `valuation` | REAL | NOT NULL | 估值金额 |
| `recorded_date` | TEXT | NOT NULL | 记录日期（ISO 8601） |

**外键：** `asset_id` → `assets(id)` **ON DELETE CASCADE**

**索引：**
- `idx_valuation_asset_date` (`asset_id`, `recorded_date`) — 复合索引，加速按资产+日期查询估值变化曲线

**使用模式：**
- `getLatestByAsset(assetId)` — 获取某资产最新估值
- `getLatestForAllAssets()` — 批量获取所有资产的最新估值（用于净资产计算）
- 资产的 `current_valuation` 字段为冗余缓存，最新估值以 `valuation_history` 为准

---

### 7. `settings` — 应用设置表

**用途：** 以键值对形式存储应用配置。值为 JSON 编码的文本，支持布尔、数字、字符串等多种类型。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `key` | TEXT | PRIMARY KEY, NOT NULL | 设置键名 |
| `value` | TEXT | NOT NULL | 设置值（JSON 编码） |

**无外键关系。** 此表为独立的键值存储。

**预定义设置项：**

| 键名 | 值类型 | 默认值 | 说明 |
|------|--------|--------|------|
| `app_lock_enabled` | boolean | `false` | 是否启用应用锁（PIN + 生物识别） |
| `pin_hash` | string | `null` | PIN 码哈希值 |
| `biometric_enabled` | boolean | `false` | 是否启用生物识别认证 |
| `theme_color` | string | `'#6C5CE7'` | 主题色 |
| `dark_mode` | string | `'system'` | 深色模式（`system` / `light` / `dark`） |
| `currency_symbol` | string | `'¥'` | 货币符号 |
| `net_worth_goal` | number | `null` | 净资产目标金额 |

**写入方式：** 使用 SQLite 的 `INSERT ... ON CONFLICT(key) DO UPDATE` 实现 upsert，确保键存在时更新、不存在时插入。

---

## 索引设计

所有索引均使用 `CREATE INDEX IF NOT EXISTS` 创建，确保幂等性。

| 索引名 | 表 | 列 | 用途 |
|--------|-----|-----|------|
| `idx_snapshots_account_date` | `balance_snapshots` | `account_id, snapshot_date` | 按账户查询余额历史趋势 |
| `idx_snapshots_date` | `balance_snapshots` | `snapshot_date` | 按日期查询所有账户余额（净资产快照） |
| `idx_recurring_asset` | `recurring_expenses` | `asset_id` | 按资产查询其经常性支出列表 |
| `idx_recurring_effective` | `recurring_expenses` | `effective_from, effective_to` | 按生效区间筛选特定月份的支出 |
| `idx_maintenance_asset` | `maintenance_records` | `asset_id` | 按资产查询其维护记录 |
| `idx_maintenance_date` | `maintenance_records` | `date` | 按日期范围查询维护记录 |
| `idx_valuation_asset_date` | `valuation_history` | `asset_id, recorded_date` | 按资产查询估值变化曲线 |
| `idx_assets_status` | `assets` | `status` | 按资产状态筛选（使用中/退役/已售） |
| `idx_assets_category` | `assets` | `category` | 按资产分类筛选 |
| `idx_accounts_deleted_at` | `accounts` | `deleted_at` | 加速软删除筛选（迁移 V3 添加） |

---

## 迁移系统

### 版本管理机制

迁移系统基于 **递增版本号** 工作：

1. 代码中定义 `CURRENT_VERSION` 常量（当前为 **5**）
2. 数据库内部维护 `db_version` 表记录已应用的版本
3. 初始化时比较当前数据库版本与 `CURRENT_VERSION`，执行所有未应用的迁移

### `db_version` 表结构

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `version` | INTEGER | PRIMARY KEY | 版本号 |
| `description` | TEXT | — | 迁移描述 |
| `applied_at` | TEXT | NOT NULL | 应用时间（ISO 8601） |

### 执行流程

```
runMigrations(db)
  ├── 创建 db_version 表（IF NOT EXISTS）
  ├── 查询当前版本: SELECT MAX(version) FROM db_version
  ├── 若 currentVersion >= CURRENT_VERSION → 直接返回
  └── 遍历 migrations 数组：
      └── 对每个 version > currentVersion 的迁移：
          ├── BEGIN TRANSACTION
          ├── 执行 migration.up(db)
          ├── INSERT INTO db_version (记录版本)
          └── COMMIT（失败则 ROLLBACK 并抛出异常）
```

### 设计原则

- **幂等性 (Idempotent)：** 每个迁移函数内部检查目标列/索引是否已存在（通过 `PRAGMA table_info` 或 `IF NOT EXISTS`），即使重复执行也不会出错
- **事务隔离：** 每个迁移在独立事务中执行，单个迁移失败不影响已成功的迁移
- **顺序执行：** 迁移按版本号从小到大依次执行，不会跳过任何版本

### 已有迁移列表

| 版本 | 描述 | 具体变更 |
|------|------|----------|
| **V1** | 初始架构 | 创建所有基础表和索引（由 `schema.ts` 的 `CREATE TABLE IF NOT EXISTS` 完成） |
| **V2** | 账户软删除支持 | 为 `accounts` 表添加 `deleted_at TEXT` 列，支持软删除而非物理删除 |
| **V3** | 经常性支出结束原因 + 软删除索引 | 为 `recurring_expenses` 添加 `ended_reason TEXT` 列；为 `accounts.deleted_at` 创建索引 |
| **V4** | 贵金属重量字段 | 为 `assets` 表添加 `weight_grams REAL` 列，支持贵金属类资产按重量估值 |
| **V5** | 分类合并 | 将 `furniture`（家具）和 `appliance`（家电）分类合并为 `home`（家居） |

### 添加新迁移的步骤

1. 在 `migrations.ts` 的 `migrations` 数组末尾添加新迁移对象
2. 设置 `version` 为当前 `CURRENT_VERSION + 1`
3. 编写 `description` 和 `up` 函数（确保幂等性）
4. 将 `CURRENT_VERSION` 常量递增 1

---

## Repository 模式

每个数据表对应一个 Repository 对象，封装所有数据库访问逻辑。Repository 以 **导出的常量对象** 形式提供，包含一组异步方法。

### 架构分层

```
UI / 业务逻辑层
       │
       ▼
  Repository 层         ← 数据访问抽象，驼峰命名 ↔ 蛇形命名的转换
       │
       ▼
  expo-sqlite 层        ← 底层 SQL 执行
       │
       ▼
  SQLite 数据库文件      ← worthbase.db
```

### 通用模式

- **命名转换：** Repository 内部定义 `Row` 接口（蛇形命名，匹配数据库列名），通过 `rowToXxx()` 函数转换为应用层模型（驼峰命名）
- **ID 生成：** 所有 Repository 使用 `generateId()` 生成主键，格式为 `{timestamp_base36}-{random_base36}`
- **时间戳管理：** `created_at` 和 `updated_at` 由 Repository 自动设置，调用方无需传入
- **布尔转换：** SQLite 的 `INTEGER` (0/1) 与 TypeScript 的 `boolean` 在 Repository 层互相转换

### Repository 清单

| Repository | 对应表 | 核心方法 |
|------------|--------|----------|
| `AccountRepository` | `accounts` | `getAll`, `getById`, `create`, `update`, `delete`(软删除), `hardDelete`, `getLatestBalance`, `getAllLatestBalances` |
| `BalanceSnapshotRepository` | `balance_snapshots` | `create`, `getByDateRange`, `getByAccount`, `getLatestSnapshotForDate`, `getAllSnapshotDates`, `getBalancesForDate` |
| `AssetRepository` | `assets` | `getAll`, `getById`, `getByStatus`, `getByCategory`, `create`, `update`, `delete`, `markRetired`, `recordSale`, `restoreActive` |
| `RecurringExpenseRepository` | `recurring_expenses` | `getByAsset`, `getForMonth`, `getForRange`, `create`, `update`, `delete`, `endExpense`, `endExpenseWithReason` |
| `MaintenanceRepository` | `maintenance_records` | `getByAsset`, `getByAssetAndDateRange`, `create`, `update`, `delete` |
| `ValuationRepository` | `valuation_history` | `getByAsset`, `getLatestByAsset`, `create`, `delete`, `getLatestForAllAssets` |
| `SettingsRepository` | `settings` | `get`, `getJSON`, `set`, `setJSON`, `delete`, `loadAll`, `saveAll` |

---

## 数据关系与业务逻辑

### 资产与持有成本

资产 (`assets`) 是整个系统的核心实体，其持有成本由三部分组成：

```
月度持有成本 = 月度分摊成本 + 月度经常性支出 + 月度分摊维护费
```

1. **月度分摊成本** — 由 `amortization_type` 决定计算方式
2. **月度经常性支出** — 来自 `recurring_expenses` 表中当前月份生效的记录
3. **月度分摊维护费** — 来自 `maintenance_records` 中 `amortize = 1` 的记录

### 资产生命周期与经常性支出的联动

```
资产创建 → 添加经常性支出（effective_from = 某月, effective_to = NULL）
    │
    ├── 资产退役 (markRetired)
    │   ├── assets.status → 'retired'
    │   └── recurring_expenses.effective_to → 当前月份
    │       recurring_expenses.ended_reason → 'retired'
    │
    ├── 资产恢复 (restoreActive)
    │   ├── assets.status → 'active'
    │   └── 因 'retired' 结束的经常性支出恢复：
    │       effective_to → NULL, ended_reason → NULL
    │
    └── 资产出售 (recordSale)
        ├── assets.status → 'sold'
        ├── assets.sell_date / sell_price 设置
        └── recurring_expenses.effective_to → 出售月份
```

### 净资产计算

```
净资产 = 流动性资产 + 实物资产估值

其中：
  流动性资产 = 所有活跃账户的最新余额之和
  实物资产估值 = 所有活跃资产的 current_valuation 之和
```

### 余额快照与历史趋势

`balance_snapshots` 表支撑了净资产趋势图的绘制：

1. 用户定期记录各账户余额（快照）
2. `getLatestSnapshotForDate(date)` 可获取指定日期（或之前最近日期）的所有账户余额
3. 通过对比不同日期的快照，计算净资产变化趋势
4. 软删除的账户仍保留其历史快照数据，但在计算时通过 `JOIN accounts ... WHERE deleted_at IS NULL` 排除

### 估值追踪

1. 资产创建时可开启 `valuation_tracking`（`INTEGER 0/1`）
2. 每次更新估值时，在 `valuation_history` 表中插入新记录
3. `assets.current_valuation` 作为冗余缓存，避免每次计算净资产时都需查询 `valuation_history`
4. `ValuationRepository.getLatestForAllAssets()` 可批量获取所有资产最新估值

---

## 设计决策与备注

### 1. 软删除 vs 硬删除

| 表 | 删除策略 | 原因 |
|----|----------|------|
| `accounts` | **软删除** (`deleted_at`) | 保留余额历史用于趋势图表和报表 |
| `assets` | **硬删除** | 资产删除时通过 CASCADE 级联清除所有关联数据 |
| 其他表 | CASCADE 级联删除 | 作为子表，随父表删除而自动清除 |

### 2. 去冗余化设计

- **`assets.current_valuation`：** 冗余缓存字段，与 `valuation_history` 表中的最新记录应保持同步。目的是避免净资产汇总时对每个资产执行子查询。
- **`assets.status`：** 生命周期状态直接存储在资产表中，而非独立的狀態历史表，简化查询。

### 3. 布尔值的存储

SQLite 没有原生布尔类型。本项目中：
- `valuation_tracking`、`amortize` 使用 `INTEGER`（0/1）存储
- Repository 层负责 `number ↔ boolean` 的双向转换（`!!value` 和 `value ? 1 : 0`）

### 4. 日期与时间格式

所有日期/时间字段统一使用 **ISO 8601** 格式的 TEXT 存储：
- 完整时间戳（`created_at`、`updated_at`、`deleted_at`、`applied_at`）：`2025-07-15T10:30:00.000Z`
- 日期（`purchase_date`、`sell_date`、`snapshot_date`、`recorded_date`）：`2025-07-15`
- 月份（`effective_from`、`effective_to`）：`2025-07`

### 5. 分类合并的历史处理

在 V5 迁移中，原有的 `furniture`（家具）和 `appliance`（家电）两个分类被合并为 `home`（家居）。这是一个 **数据迁移**（而非结构迁移），直接 UPDATE 了现有数据的 `category` 值。`schema.ts` 中的 `CREATE TABLE` 语句不受影响，因为 `category` 是 TEXT 类型，不约束枚举值。

### 6. 无云端同步

本数据库设计不考虑多设备同步。所有数据仅存在于用户设备的本地 SQLite 文件中。这意味着：
- 无需冲突解决机制
- 无需同步标记字段（如 `is_synced`、`server_id`）
- 无需软删除同步（`accounts` 的软删除纯粹为了保留历史数据，而非同步需求）

### 7. 主键策略

不使用自增整数主键，而使用 `generateId()` 生成的文本 ID：
```
格式: {Date.now().toString(36)}-{Math.random().toString(36).substring(2,10)}
示例: "m3x9k2a1-f7g2h9j4"
```
优势：
- 无需依赖数据库自增机制
- 客户端即可生成，无需等待数据库返回
- 碰撞概率极低（时间戳 + 随机数双重保障）
