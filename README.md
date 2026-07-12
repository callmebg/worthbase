# 家底 WorthBase

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/callmebg/worthbase?color=blue" alt="License"></a>
  <a href="https://github.com/callmebg/worthbase/releases"><img src="https://img.shields.io/github/v/release/callmebg/worthbase" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS-brightgreen" alt="Platform">
  <img src="https://img.shields.io/badge/Expo-SDK%2057-black" alt="Expo">
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome"></a>
</p>

> 你有多少钱在各账户？你的东西值多少？养这些东西每月要花多少？
>
> *How much money do you have across accounts? What are your things worth? How much does it cost to own them?*

一款**隐私优先、本地存储**的个人财务状态管理 App。不记每笔流水，而是回答三个核心问题：

📖 [English](./README.en.md) | 中文

---

1. **我有多少钱** — 多账户余额集中展示，定期手动更新
2. **我的东西值多少** — 实物资产估值追踪 + 持有成本智能计算
3. **净资产趋势如何** — 历史快照折线图，目标进度追踪

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=callmebg/worthbase&type=Date)](https://star-history.com/#callmebg/worthbase)

## 截图

<!-- TODO: 补充截图 -->
<!-- 建议截图内容：总览面板 / 资产管理 / 添加资产 / 卖出结算 / 设置 -->

---

## 功能特性

### 账户余额管理
- 支持微信、支付宝、银行卡、现金、基金等多种账户类型
- 定期手动更新余额，每次更新自动存为快照
- 多账户余额汇总，一键查看流动资产总额

### 净资产趋势分析
- 基于历史余额快照生成净资产趋势折线图
- 支持半年 / 一年 / 两年时间范围切换
- 净资产目标设定与进度条可视化

### 实物资产管理
- 8 种资产分类：车辆、房产、电子产品、数码、家具、家电、奢侈品、其他
- 资产生命周期管理：使用中 → 退役 / 已售
- 估值追踪：可选开启，记录估值历史变化曲线
- 卖出结算：自动计算购入价、卖价、贬值金额、累计持有成本、真实净支出、日均成本

### 持有成本智能计算（核心特色）
4 种分摊方式，每个资产可自由选择：

| 方式 | 公式 | 特点 |
|------|------|------|
| 简单线性分摊 | 购入价 ÷ 已持有月数 | 月成本随时间递减 |
| 预期寿命分摊 | 购入价 ÷ 预期使用月数 | 每月固定 |
| 残值分摊 | (购入价 - 预估残值) ÷ 预期使用月数 | 每月固定，考虑残值 |
| 不分摊 | 0 | 仅计算经常性支出和维护费用 |

持有成本 = 分摊成本 + 经常性支出（当月生效项之和）+ 一次性维护费用（如选纳入分摊则摊销）

- **经常性支出**：话费、油费、保险等，支持生效区间设置
- **一次性维护**：维修、保养等，可选纳入分摊或仅记录
- **月/日双视角**：同时展示月持有成本和日均持有成本
- **汇总面板**：所有资产月持有成本总计，直观展示"养你所有的东西要多少钱"

### 数据安全
- **完全本地存储**：无服务器、无账号注册、无数据上传
- **应用锁**：PIN 码 + 生物识别（指纹 / Face ID）
- **自动备份**：退出 App 时自动备份 SQLite 数据库副本（保留最近 3 份）
- **导入导出**：支持 JSON（完整备份）和 CSV（可读导出）格式

### 外观
- 深色模式（跟随系统 / 浅色 / 深色）
- 4 种主题颜色可选
- 货币符号可自定义

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React Native 0.86 + Expo SDK 57 |
| 语言 | TypeScript ~6.0 |
| 路由 | Expo Router |
| 数据库 | expo-sqlite (SQLite) |
| 状态管理 | Zustand |
| 图表 | react-native-chart-kit |
| 安全锁 | expo-local-authentication |
| 构建工具 | EAS Build |
| 测试 | Jest + ts-jest |

---

## 快速开始

### 环境要求

- Node.js >= 20.19.4（推荐使用 [nvm](https://github.com/coreybutler/nvm-windows) 管理版本）
- npm（通过 `corepack enable npm` 启用）
- Android Studio（本地编译 Android 需要，含 JDK 17+）
- Xcode（仅 macOS，本地编译 iOS 需要）

### 安装依赖

```bash
cd worthbase
npm install
```

### 开发模式运行

最快的方式，无需编译原生代码：

```bash
npm start
```

然后在手机上安装 **Expo Go** App，扫描终端中的二维码即可运行。

### 指定平台运行

```bash
# Android（需要连接模拟器或真机）
npm run android

# iOS（仅 macOS，需要 Xcode）
npm run ios
```

---

## 构建

### EAS 云端构建（推荐）

无需本地配置 Android Studio / Xcode，在 Expo 云端编译：

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 Android APK（预览版）
eas build --profile preview --platform android

# 构建 iOS
eas build --profile preview --platform ios
```

`eas.json` 中已配置三档构建 profile：

| Profile | 用途 | Android | iOS |
|---------|------|---------|-----|
| development | 开发调试 | APK | 模拟器 |
| preview | 内部测试 | APK | — |
| production | 上架商店 | AAB (App Bundle) | IPA |

### 本地构建

```bash
# 生成原生项目
npx expo prebuild --platform android

# 编译 Release APK
cd android
.\gradlew assembleRelease
```

> 需要设置 `JAVA_HOME` 指向 JDK 17+，并配置 `ANDROID_HOME` 指向 Android SDK。

---

## 测试

```bash
npm test
```

运行 36 个单元测试，覆盖持有成本计算引擎的核心逻辑：4 种分摊策略、经常性支出区间、卖出结算、维护分摊等。

---

## 项目结构

```
worthbase/
├── app/                        # 页面路由（Expo Router）
│   ├── _layout.tsx             #   根布局（Tab 导航 + AppState 自动备份）
│   ├── index.tsx               #   总览面板（净资产 + 趋势图 + 持有成本汇总）
│   ├── accounts.tsx            #   账户管理
│   ├── assets.tsx              #   资产管理
│   └── settings.tsx            #   设置
├── src/
│   ├── components/             # UI 组件
│   │   ├── AddAssetModal.tsx   #   3 步添加资产表单
│   │   ├── AssetDetailModal.tsx#   资产详情弹窗
│   │   ├── SettlementModal.tsx#   卖出结算弹窗
│   │   ├── HoldingCostBreakdown.tsx  # 持有成本三层分解
│   │   ├── ValuationChart.tsx  #   估值历史折线图
│   │   └── OnboardingView.tsx  #   首次使用引导
│   ├── db/                     # 数据库层
│   │   ├── schema.ts           #   7 张表建表语句 + 索引
│   │   ├── client.ts           #   SQLite 连接
│   │   ├── migrations.ts       #   迁移管理
│   │   └── *-repository.ts     #   各表 Repository（CRUD）
│   ├── engine/                 # 计算引擎（策略模式）
│   │   ├── strategies/         #   4 种分摊策略实现
│   │   ├── HoldingCostCalculator.ts       # 持有成本汇总
│   │   ├── NetWorthCalculator.ts          # 净资产计算
│   │   ├── SettlementCalculator.ts        # 卖出结算
│   │   ├── RecurringExpenseCalculator.ts  # 经常性支出区间
│   │   └── MaintenanceCalculator.ts       # 维护分摊
│   ├── stores/                 # Zustand 状态管理
│   ├── services/               # 数据服务（备份 / 导出 / 导入）
│   ├── hooks/                  # 自定义 Hook
│   ├── types/                  # 类型定义（enums, models）
│   └── utils/                  # 工具函数
├── __tests__/                  # 单元测试
├── assets/                     # 图标和启动画面
├── app.json                    # Expo 配置
├── eas.json                    # EAS Build 配置
├── jest.config.js              # Jest 配置
└── tsconfig.json               # TypeScript 配置
```

### 架构分层

```
┌─────────────────────────────────────────────────────┐
│                    UI 层                              │
│  app/*.tsx + src/components/*.tsx                    │
│  Expo Router 四 Tab 导航                              │
├─────────────────────────────────────────────────────┤
│                  状态管理层                            │
│  src/stores/ (Zustand)                               │
│  account-store · asset-store · settings-store        │
├─────────────────────────────────────────────────────┤
│                   计算引擎层                           │
│  src/engine/                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ 分摊策略     │  │ 经常性支出   │  │ 一次性维护  │ │
│  │ (4种实现)    │  │ (区间计算)   │  │ (分摊逻辑)  │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│  持有成本 = 分摊 + 经常性支出 + 维护分摊               │
├─────────────────────────────────────────────────────┤
│                   数据层                              │
│  src/db/ (expo-sqlite)                               │
│  7 张表：accounts · balance_snapshots · assets ·     │
│  recurring_expenses · maintenance_records ·         │
│  valuation_history · settings                       │
└─────────────────────────────────────────────────────┘
```

引擎**实时计算**，不预存结果。每次打开页面时根据当前日期动态计算月成本、累计、剩余等。

---

## 贡献

欢迎提交 Issue 和 Pull Request！详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

安全问题请参见 [SECURITY.md](./SECURITY.md)。

### 开发约定
- TypeScript 严格模式
- 路径别名 `@/` → `src/`
- 计算引擎的扩展通过实现策略接口完成（参见 `src/engine/strategies/`）
- 新功能请配套单元测试

---

## License

[MIT](./LICENSE) © callmebg
