[TOC]

# 我花 600 元用 AI 做了一个本地优先的个人财务管理 App——技术选型与核心实现

> 不联网、不注册、不上云。你的财务数据只存在你手机上。

## 背景：为什么做这个 App

市面上的记账 App 都有一个共同点：要求你注册账号，数据上传到云端。

但我不想把自己的财务状况交给任何第三方服务器。我要的是一个能回答三个问题的工具：

1. **我有多少钱** — 多账户余额汇总
2. **我的东西值多少** — 实物资产估值 + 持有成本计算
3. **净资产趋势如何** — 历史折线图 + 目标预测

于是我做了 **家底 WorthBase**：一款隐私优先、本地存储的个人财务状态管理 App。

## 花了多少钱？

整个项目我只为 AI token 付了费。成本分解：

| 项目 | 费用 |
|------|------|
| Claude + Qwen  AI API（编程辅助） | ~¥600 |
| EAS Build 构建 | 免费额度内 |
| Apple/Google 开发者账号 | 未购买（开源分发） |
| **总计** | **~¥600** |

没有上架应用商店。如果没人用，上架没有意义；如果有人用，GitHub 下载就够了。

## 技术选型

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
│   Expo Router (Tab Navigator)                    │
│   react-native-paper (Material Design 3)         │
│   react-native-svg (图表渲染)                     │
│   react-native-gesture-handler (缩放/拖拽)        │
├─────────────────────────────────────────────────┤
│                 State Layer                      │
│   Zustand (轻量状态管理)                          │
├─────────────────────────────────────────────────┤
│                Engine Layer                      │
│   HoldingCostCalculator (持有成本，4种策略)        │
│   NetWorthCalculator (净资产 = 余额 + 估值)       │
│   ProjectionCalculator (线性回归预测目标达成)      │
│   SettlementCalculator (卖出结算)                 │
├─────────────────────────────────────────────────┤
│                Data Layer                        │
│   SQLite (expo-sqlite)                           │
│   Repository 模式 (7 张表, 无 ORM)                │
└─────────────────────────────────────────────────┘
```

选择 **Expo SDK 55** 而不是裸 React Native，是因为 Expo 的开发体验（热更新、EAS 构建）对独立开发者来说效率更高。选择 **SQLite** 而不是 AsyncStorage，是因为财务数据需要事务支持和复杂查询。选择 **Zustand** 而不是 Redux，是因为 75 个文件的项目不需要那么重的状态管理。

## Vibe Coding：我的角色从"写代码"变成了"指挥 AI + 审核"

这个项目 99% 的代码是 AI 写的。我的工作方式变成了：

1. **描述需求**：用自然语言告诉 Claude 我要什么功能
2. **AI 生成代码**：Claude 产出完整实现
3. **跑起来验证**：在设备上运行，看效果
4. **描述 bug 让 AI 改**：发现问题后用自然语言描述，AI 修复

我的核心价值从"编码能力"变成了"需求定义能力 + 代码审核能力"。AI 不懂"持有成本应该怎么算才符合直觉"，但我懂。我负责做产品决策，AI 负责把它们变成代码。

这个流程让整个项目在 **5 天内** 从零到可用。

## 核心功能实现

### 1. 持有成本计算：4 种分摊策略

这是整个 App 最核心的功能。你买一台 8000 块的 MacBook，用了 3 年，它每个月"花"你多少钱？

答案取决于你怎么算。我设计了 4 种分摊方式，用 **Strategy 模式** 实现：

```typescript
// src/engine/strategies/index.ts
const strategyMap: Record<AmortizationType, AmortizationStrategy> = {
  [AmortizationType.SIMPLE_LINEAR]: SimpleLinearStrategy,
  [AmortizationType.EXPECTED_LIFESPAN]: ExpectedLifespanStrategy,
  [AmortizationType.RESIDUAL_VALUE]: ResidualValueStrategy,
  [AmortizationType.NO_AMORTIZATION]: NoAmortizationStrategy,
};

export function getStrategy(asset: Asset): AmortizationStrategy {
  return strategyMap[asset.amortizationType] ?? NoAmortizationStrategy;
}
```

每种策略实现同一个接口的三个方法：

```typescript
// src/engine/strategies/SimpleLinearStrategy.ts
export const SimpleLinearStrategy: AmortizationStrategy = {
  calculateMonthlyCost(asset, currentDate) {
    if (asset.purchasePrice <= 0) return 0;  // 边界保护
    const monthsHeld = monthsBetween(asset.purchaseDate, currentDate);
    return asset.purchasePrice / monthsHeld;  // 持有越久，月均越低
  },
  calculateAccumulated(asset) { return asset.purchasePrice; },
  calculateRemaining() { return 0; },
};
```

四种方式的对比：

| 方式 | 公式 | 月均变化 | 适用场景 |
|------|------|----------|----------|
| 简单线性 | 购入价 ÷ 持有月数 | 递减 | 电子产品、数码 |
| 预期寿命 | 购入价 ÷ 预期月数 | **固定** | 房产(360月)、家居(108月) |
| 残值分摊 | (购入价-残值) ÷ 预期月数 | 固定 | 车辆(60月) |
| 不分摊 | 月摊销 = 0 | 零 | 奢侈品、贵金属 |

为了让用户不需要理解这些算法，我做了一个 **智能推荐器**，根据资产类型自动选择最合适的方式：

```typescript
// src/engine/AmortizationRecommender.ts
const RECOMMENDATION_TABLE = {
  [AssetCategory.ELECTRONICS]: { type: SIMPLE_LINEAR, hint: '电子产品贬值快，按已持有时间递减' },
  [AssetCategory.REAL_ESTATE]: { type: EXPECTED_LIFESPAN, defaultLifespanMonths: 360, ... },
  [AssetCategory.VEHICLE]:     { type: RESIDUAL_VALUE, defaultLifespanMonths: 60, ... },
  [AssetCategory.LUXURY]:      { type: NO_AMORTIZATION, hint: '奢侈品可能增值' },
};
```

用户添加一台 MacBook，系统自动选"简单线性"；添加一辆车，自动选"残值分摊"并默认 60 个月。**技术为产品体验服务，而不是让用户做技术决策。**

### 2. 净资产趋势：降采样 + 线性回归预测

净资产 = 账户余额 + 资产估值。公式只有 68 行代码：

```typescript
// src/engine/NetWorthCalculator.ts
const netWorth = liquidAssets + assetValuations;
```

但趋势图的数据处理更有意思。当数据点超过 24 个时，需要降采样。我没有用简单的等距取样，而是写了一个**保留极值的降采样算法**——确保趋势图上的峰值和谷值不会在降采样中丢失：

```typescript
// app/index.tsx:644
function downsamplePreservingExtrema(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const result = [points[0]];  // 始终保留第一个点
  const bucketCount = maxPoints - 2;
  const interiorPoints = points.slice(1, -1);
  const bucketSize = interiorPoints.length / bucketCount;

  for (let b = 0; b < bucketCount; b++) {
    const bucket = interiorPoints.slice(
      Math.floor(b * bucketSize),
      Math.floor((b + 1) * bucketSize)
    );
    // 在每个桶中找偏离趋势线最远的点
    const avg = (result[result.length - 1].value + points[points.length - 1].value) / 2;
    let bestIdx = 0, bestDist = -1;
    for (let j = 0; j < bucket.length; j++) {
      const dist = Math.abs(bucket[j].value - avg);
      if (dist > bestDist) { bestDist = dist; bestIdx = j; }
    }
    result.push(bucket[bestIdx]);
  }
  result.push(points[points.length - 1]);  // 始终保留最后一个点
  return result;
}
```

另外，如果你设了净资产目标，系统会用**最近 6 个数据点做线性回归**，预测你什么时候能达成目标：

```typescript
// src/engine/ProjectionCalculator.ts
const points = historicalPoints.slice(-6);
// 最小二乘法求斜率（月均增长额）
const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
// 预计达成日期 = 最后数据点 + (目标差距 / 月增长)
const monthsNeeded = (goal - currentValue) / slope;
```

![总览页面](https://raw.githubusercontent.com/callmebg/worthbase/main/docs/screenshots/dashboard.jpg)

### 3. 自动备份：App 退到后台就存一份

本地优先 App 最大的风险是数据丢失。我的解决方案极其简单——App 退到后台时自动备份 SQLite 文件：

```typescript
// app/_layout.tsx:64
if (prev === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
  BackupService.createBackup();
}
```

就这 5 行代码。没有后台任务、没有定时器、没有推送。`AppState` 监听状态变化，退后台就复制 `.db` 文件到备份目录，最多保留 3 份。

此外还支持 JSON 格式的手动导出/导入（带 ID 重映射和事务安全），以及 CSV 格式的数据导出（方便在 Excel 里查看）。

## 遇到的技术难点

### 图表手势冲突

净资产趋势图支持缩放和拖拽，但它嵌套在 ScrollView 里。三个手势（图表缩放、图表拖拽、页面滚动）互相冲突。最终通过 Gesture Handler 的状态管理解决了：图表区域内优先响应缩放/拖拽手势，只有手势结束后才允许外层 ScrollView 滚动。`InteractiveTrendChart` 组件因此有 540 行，是整个项目最复杂的单个文件。

### 数据导入的 ID 重映射

从 JSON 文件导入数据时，不能直接用原来的 ID（可能和目标设备的已有数据冲突）。解决方案是在一个事务内：清空所有表 → 重建账户和资产（记录 old ID → new ID 的映射）→ 用新 ID 重建子记录（余额快照、经常性支出等）。整个流程在一个数据库事务里，任何一步失败都会回滚。

## 测试

作为独立开发者，我用三层策略保证质量：

1. **Jest 单元测试**：2,800+ 行测试覆盖核心引擎、Repository、Store、UI 组件和边界场景
2. **设备手动测试**：Expo Go 扫码即测，热更新快速迭代
3. **真实用户反馈**：小红书发了一篇帖子，18 条评论帮我发现了 2 个 bug

## 开源地址

🔗 **GitHub**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase)

如果你觉得这个项目有意思，给个 Star 就是最大的支持。欢迎提 Issue 和 PR。

---

**下一篇**：一个人从 0 到 1 做一个 App，我是怎么用 vibe coding 在 5 天内管理这个项目的（项目管理角度复盘）

**技术深度系列**（想深入了解某个模块的实现？）：
- [架构解析](链接)
- [持有成本计算的 4 种分摊策略详解](链接)
- [本地优先架构：SQLite + Repository 模式 + 自动备份](链接)
- [净资产趋势可视化：SVG 图表 + 手势交互 + 降采样算法](链接)
- [资产生命周期管理：状态机 + 卖出结算](链接)
- [多账户余额管理：8 种账户类型 + 负债处理](链接)
- [React Native / Expo 开发体验与可复用模式](链接)
- [UI 组件库与设计系统](链接)

---

> **CSDN 标签**: `React Native` `Expo` `SQLite` `AI编程` `开源项目`
> **掘金话题**: `前端` `React Native` `独立开发` `AI`
