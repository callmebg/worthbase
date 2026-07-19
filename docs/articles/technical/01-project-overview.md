[TOC]

# WorthBase（家底）技术架构全解析：一款本地优先的个人财务 App

## 为什么做 WorthBase

市面上的个人财务 App 分两类：记账类和资产管理类。记账类关注"每笔花了多少钱"，资产管理类关注"你有多少钱"。

我想要的是后者——不记流水，只做状态管理。回答三个核心问题：

1. **我有多少钱** — 多账户余额汇总
2. **我的东西值多少** — 实物资产估值 + 持有成本
3. **净资产趋势如何** — 历史折线图 + 目标预测

并且，**所有数据只存在本地**。不联网、不注册、不上云。

## 技术选型

| 层级 | 技术 | 选择理由 |
|------|------|----------|
| 框架 | Expo SDK 55 | 开发体验好，EAS 构建便捷 |
| UI | react-native-paper (MD3) | Material Design 3 开箱即用 |
| 图表 | react-native-svg | 自绘 SVG 图表，完全控制渲染 |
| 手势 | react-native-gesture-handler | 图表缩放/拖拽需要精确手势控制 |
| 状态 | Zustand | 轻量、简洁，适合中小项目 |
| 存储 | expo-sqlite | 本地 SQLite，支持事务和复杂查询 |
| 路由 | Expo Router | 文件系统路由，Tab 导航 |
| 图标 | lucide-react-native | 统一图标库，支持主题色 |

### 为什么选 SQLite 而不是 AsyncStorage？

财务数据有三个特点需要关系型数据库：
1. **事务**：导入数据时，要么全部成功，要么全部回滚
2. **关联查询**：余额快照要按账户 JOIN 查询最新值
3. **聚合计算**：净资产需要 SUM 所有账户余额

AsyncStorage 是 KV 存储，做这些很痛苦。SQLite 是正确选择。

### 为什么选 Zustand 而不是 Redux？

项目只有 3 个 store（account-store、asset-store、settings-store），每个 store 管理一个领域的数据。Zustand 的 API 极简——没有 action、reducer、middleware 的概念，直接 `setState`。对 75 个文件的项目来说，Redux 太重了。

## 项目架构

```
app/                          # Expo Router 页面（4 个 Tab + 设置）
├── _layout.tsx               # 根布局：DB 初始化、自动备份、应用锁
├── index.tsx                 # 总览 Dashboard：净资产、趋势图、持有成本
├── accounts.tsx              # 账户列表：余额管理、快照更新
├── assets.tsx                # 资产列表：实物资产 CRUD
└── settings.tsx              # 设置：主题、导出/导入、应用锁

src/
├── engine/                   # 纯计算逻辑（无 UI 依赖，可单测）
│   ├── HoldingCostCalculator.ts    # 持有成本编排器
│   ├── NetWorthCalculator.ts       # 净资产 = 余额 + 估值
│   ├── ProjectionCalculator.ts     # 线性回归预测目标达成日
│   ├── SettlementCalculator.ts     # 卖出结算
│   ├── MaintenanceCalculator.ts    # 维护费用分摊
│   ├── RecurringExpenseCalculator.ts # 经常性支出
│   ├── AmortizationRecommender.ts  # 按资产分类推荐分摊方式
│   └── strategies/                 # 4 种分摊策略（Strategy 模式）
│
├── db/                       # 数据层（SQLite + Repository 模式）
│   ├── schema.ts             # 7 张表的 CREATE TABLE + 索引
│   ├── client.ts             # SQLite 连接管理
│   ├── migrations.ts         # 数据库迁移
│   └── *-repository.ts       # 各表的 CRUD（7 个 Repository）
│
├── stores/                   # Zustand 状态管理
│   ├── account-store.ts      # 账户数据 + 余额更新
│   ├── asset-store.ts        # 资产数据 + CRUD
│   └── settings-store.ts     # 用户设置
│
├── services/                 # 业务服务
│   ├── backup-service.ts     # SQLite 文件级自动备份
│   ├── export-service.ts     # JSON/CSV 导出
│   ├── import-service.ts     # JSON 导入（ID 重映射 + 事务）
│   └── auth-service.ts       # 应用锁
│
├── components/               # UI 组件
│   ├── ui/                   # 基础组件（Button, Card, Chip, TextInput...）
│   ├── InteractiveTrendChart.tsx   # 趋势图（540 行，最复杂组件）
│   ├── HoldingCostBreakdown.tsx    # 持有成本明细
│   └── ...
│
├── theme/                    # 主题系统
│   ├── colors.ts             # 颜色定义
│   ├── tokens.ts             # 间距、圆角、阴影 token
│   ├── typography.ts         # 字体定义
│   └── ThemeProvider.tsx      # 主题上下文 + 暗色模式
│
└── types/                    # TypeScript 类型
    ├── enums.ts              # 枚举（账户类型、资产分类、分摊方式等）
    └── models.ts             # 数据模型接口
```

**代码统计：** 75 个源文件，11,669 行代码，2,800+ 行测试。

## 数据模型

7 张表，覆盖完整的财务数据管理：

```
accounts ─────────────── 账户（8 种类型）
  └── balance_snapshots ── 余额快照（每次更新追加，不修改）

assets ───────────────── 实物资产（8 种分类，4 种分摊方式）
  ├── recurring_expenses ─ 经常性支出（保险、停车费等）
  ├── maintenance_records─ 一次性维护（维修、保养）
  └── valuation_history ── 估值历史（可选开启追踪）

settings ──────────────── 应用设置（KV 存储）
```

## 核心特性速览

| 特性 | 实现方式 | 相关文章 |
|------|----------|----------|
| 4 种持有成本分摊 | Strategy 模式 + 智能推荐 | [持有成本深度解析](链接) |
| 净资产趋势图 | SVG 自绘 + 手势缩放/拖拽 + 降采样 | [趋势可视化深度解析](链接) |
| 本地数据备份 | AppState 监听 + SQLite 文件复制 | [本地优先架构](链接) |
| 资产生命周期 | 状态机（active → retired/sold）| [资产生命周期管理](链接) |
| 多账户管理 | 8 种类型 + 快照机制 + 负债支持 | [多账户余额管理](链接) |
| 主题系统 | Token 驱动 + 暗色模式 | [设计系统](链接) |

## 开源地址

🔗 **GitHub**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase)

如果觉得架构设计有参考价值，给个 Star。欢迎提 Issue 和 PR。

---

> **CSDN 标签**: `React Native` `Expo` `架构设计` `开源` `移动开发`
> **掘金话题**: `前端` `架构` `React Native` `开源`
