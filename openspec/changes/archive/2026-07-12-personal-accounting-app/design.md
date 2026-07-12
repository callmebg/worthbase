## Context

本项目从零构建一款跨平台（Android + iOS）个人财务状态管理应用。核心设计原则为**隐私优先、本地存储、持有成本智能计算**。

市场调研发现：净资产追踪 App（Richify、Worth It）关注金融资产但忽视实物资产持有成本；物品管理 App（纳物、物欲、iAsset）关注实物折旧但不管理账户余额和净资产趋势。本 App 填补这一市场空白，同时覆盖两者并增加独创的分摊方式自选和经常性支出补充能力。

目标用户：注重隐私、不希望数据上云的个人用户；想了解"养这些东西每月要花多少钱"的理性消费者。

约束条件：
- 数据完全存储在设备本地，不依赖任何远程服务器
- 同时支持 Android 和 iOS
- 无需注册账号即可使用
- 离线可用，全部功能不依赖网络

## Goals / Non-Goals

**Goals:**
- 实现跨平台（Android + iOS）个人财务状态管理应用
- 账户余额管理：多账户集中展示，定期手动更新，余额快照
- 净资产趋势分析：历史快照折线图，目标设定与进度
- 实物资产管理：购入/估值/生命周期/卖出结算
- 持有成本智能计算：4种分摊方式可选，经常性支出补充，一次性维护费用，月/日双视角
- 数据导入导出：CSV/JSON 格式
- 应用安全锁：PIN + 生物识别
- 轻量、无广告、无内购

**Non-Goals:**
- 不做云同步功能
- 不做账号注册/登录系统
- 不做逐笔交易记账（本 App 关注"状态快照"而非"流水记录"）
- 不做理财产品推荐、广告等商业化功能
- 不做银行账户对接/自动导入
- 不做多人协作/家庭共享
- 不做 Web/Desktop 版本（MVP 阶段）

## Decisions

### 1. 跨平台框架：React Native + Expo

**选择：** React Native + Expo

**理由：** 单一代码库双端覆盖，生态成熟，Expo 简化原生模块管理，与 expo-sqlite 无缝集成。

**备选：** Flutter（性能更优但本地数据库生态不如 RN 成熟）、原生开发（双端成本翻倍）。

### 2. 本地数据库：SQLite (expo-sqlite)

**选择：** SQLite via `expo-sqlite`

**理由：** 移动端最成熟的嵌入式数据库，支持事务和关系查询，数据为单文件便于备份迁移。

**备选：** WatermelonDB（超大数据量场景，MVP 不需要）、Realm（包体积大，许可证限制）。

### 3. 状态管理：Zustand

**选择：** Zustand

**理由：** 轻量、API 直观、适合中等复杂度状态管理，无 Redux 的样板代码。

### 4. 图表库：react-native-chart-kit

**选择：** `react-native-chart-kit`

**理由：** 开箱即用的折线图、饼图、柱状图，轻量，与 RN 生态兼容。复杂需求可降级 D3.js。

### 5. 持有成本计算引擎设计

这是本 App 的技术核心。采用**策略模式**实现多种分摊算法：

```
分摊策略接口:
  - calculateMonthlyCost(asset, currentDate) → number
  - calculateAccumulated(asset, currentDate) → number
  - calculateRemaining(asset, currentDate) → number

4种策略实现:
  - SimpleLinearStrategy: 购入价 ÷ 已持有月数
  - ExpectedLifespanStrategy: 购入价 ÷ 预期使用月数
  - ResidualValueStrategy: (购入价 - 预估残值) ÷ 预期使用月数
  - NoAmortizationStrategy: 0

持有成本 = 分摊策略结果 + 经常性支出(当月生效项之和) + 一次性维护(如选纳入分摊则÷剩余月数)
日均持有成本 = 月持有成本 ÷ 30
```

**理由：** 策略模式让分摊算法可独立扩展，用户可按资产自由切换，新增算法只需实现接口。

### 6. 数据库核心表结构

```
accounts (账户)
  - id, name, type, icon, created_at, updated_at

balance_snapshots (余额快照)
  - id, account_id, balance, snapshot_date

assets (实物资产)
  - id, name, category, purchase_date, purchase_price,
    amortization_type, expected_lifespan_months, residual_value,
    valuation_tracking (bool), current_valuation, status (active/retired/sold),
    sell_date, sell_price, image_path, created_at, updated_at

recurring_expenses (经常性支出)
  - id, asset_id, name, amount, effective_from, effective_to, created_at

maintenance_records (一次性维护)
  - id, asset_id, name, amount, date, amortize (bool), created_at

valuation_history (估值历史)
  - id, asset_id, valuation, recorded_date

settings (应用设置)
  - key, value (JSON)
```

### 7. 数据备份方案

**选择：** 导出 JSON（完整备份）+ CSV（可读导出），退出时自动备份副本。

### 8. 安全锁方案

**选择：** `expo-local-authentication`（生物识别）+ 本地 PIN 码备选。PIN 码使用 SHA-256 哈希后存入 `expo-secure-store`，严禁使用 base64 等可逆编码。

### 9. 深色模式方案

**选择：** 使用 `useColorScheme` Hook 动态感知系统颜色方案，COLORS 常量改为函数返回当前配色，所有页面实时响应切换，不使用静态常量。

### 10. 日期输入方案

**选择：** 使用 `@react-native-community/datetimepicker` 组件替代纯文本输入，避免用户手动输入日期格式出错。

## Risks / Trade-offs

- [本地数据库损坏风险] → 退出时自动备份副本文件
- [无云同步换机迁移困难] → JSON 完整导出/导入
- [持有成本随时间变化导致历史数据不可追溯] → 每次余额更新时存快照，趋势图基于快照而非实时计算
- [经常性支出变更历史] → effective_from/effective_to 记录生效区间，计算时取当月生效项
- [expo-sqlite 大量查询性能] → 对日期、account_id、asset_id 建索引
- [生物识别 API 平台差异] → expo-local-authentication 抹平差异
- [PIN 码安全存储] → SHA-256 哈希 + expo-secure-store，不用 base64/btoa
- [深色模式动态切换] → useColorScheme Hook + 动态 COLORS 函数，避免静态常量不响应
- [净资产趋势图数据不完整] → 趋势图应同时包含余额快照和资产估值历史
## Context

本项目从零构建一款跨平台（Android + iOS）个人记账应用，核心设计原则为**隐私优先、本地存储、无云依赖**。当前不存在任何已有代码或架构，需要做出从技术选型到数据模型的完整设计决策。

目标用户群体：注重隐私、不希望数据上传云端的个人用户；需要快速记录日常收支的普通消费者。

约束条件：
- 数据必须完全存储在设备本地，不依赖任何远程服务器
- 必须同时支持 Android 和 iOS
- 无需注册账号即可使用
- 离线可用，全部功能不依赖网络

## Goals / Non-Goals

**Goals:**
- 实现跨平台（Android + iOS）的个人记账应用，代码库统一
- 数据完全本地存储，支持加密备份
- 提供 3 秒内完成记账的快速录入体验
- 支持多账户、多分类、预算追踪、报表统计等核心记账功能
- 应用安全锁保护隐私
- 数据可导出为标准格式（CSV），方便迁移
- 轻量、无广告、无内购

**Non-Goals:**
- 不做云同步功能（隐私优先）
- 不做账号注册/登录系统
- 不做理财产品推荐、广告等商业化功能
- 不做银行账户对接/自动导入账单
- 不做多人协作/家庭共享账本（MVP 阶段）
- 不做 Web/Desktop 版本（MVP 阶段）

## Decisions

### 1. 跨平台框架选择：React Native (Expo)

**选择：** React Native + Expo

**理由：**
- 单一代码库同时支持 Android 和 iOS，降低开发和维护成本
- 生态成熟，社区活跃，有大量记账类 App 的实践案例
- Expo 提供完善的构建工具链，简化原生模块管理
- 与本地数据库库兼容性好

**备选方案：**
- Flutter：性能更优，但本地数据库生态相对不如 RN 成熟
- 原生开发（Swift + Kotlin）：体验最佳，但双端开发成本翻倍

### 2. 本地数据库：SQLite (via expo-sqlite)

**选择：** SQLite，通过 `expo-sqlite` 库访问

**理由：**
- SQLite 是移动端最成熟的嵌入式数据库，可靠性高
- 支持事务、查询性能好，适合记账场景的结构化数据
- `expo-sqlite` 与 Expo 生态无缝集成
- 数据存储为单个文件，便于备份和迁移

**备选方案：**
- WatermelonDB：适合超大数据量，但引入复杂度，MVP 阶段不需要
- Realm：性能好，但包体积大，许可证有商业限制
- AsyncStorage：太简单，不适合关系型查询

### 3. 状态管理：Zustand

**选择：** Zustand

**理由：**
- 轻量简洁，API 直观，学习成本低
- 适合中等复杂度的状态管理
- 不像 Redux 那样有大量样板代码

**备选方案：**
- Redux Toolkit：成熟但偏重，MVP 不需要
- React Context：简单但性能优化需手动处理

### 4. 图表库：React Native Chart Kit 或 D3.js 封装

**选择：** `react-native-chart-kit` 作为基础，复杂需求用 D3.js 自定义

**理由：**
- 开箱即用的饼图、折线图、柱状图
- 轻量，与 RN 生态兼容
- 复杂自定义场景可降级到 D3.js

### 5. 数据备份方案：本地文件 + 可选加密

**选择：** 导出为 `.json` 或 `.db` 文件到设备本地存储，可选 AES 加密

**理由：**
- JSON 格式通用，便于用户检查和迁移
- 数据库文件直接复制可快速恢复
- 加密选项保护敏感财务数据

### 6. 安全锁方案：expo-local-authentication

**选择：** `expo-local-authentication`（生物识别）+ 本地 PIN 码

**理由：**
- 支持 Face ID / Touch ID / 指纹
- Expo 原生集成，无需配置原生模块
- PIN 码作为生物识别不可用时的备选

## Risks / Trade-offs

- [本地数据库损坏风险] → 实现自动本地备份机制（每次关闭应用时自动备份到副本文件）
- [无云同步导致换机数据迁移困难] → 提供文件导出/导入功能，用户可手动迁移
- [React Native 性能不如原生] → 记账场景交互简单，性能瓶颈不在 UI 层，可接受
- [expo-sqlite 在大数量查询时可能变慢] → 添加索引优化关键查询字段（日期、分类、账户）
- [生物识别 API 差异] → 通过 expo-local-authentication 抹平平台差异
- [数据加密增加复杂度] → MVP 阶段先实现明文备份，加密作为后续迭代
