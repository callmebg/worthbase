[TOC]

# 持有成本计算的 4 种分摊策略：Strategy 模式 + 智能推荐

> 你买一台 8000 块的 MacBook，用了 3 年，它每个月"花"你多少钱？

## 问题定义

"持有成本"不只是购买价格。一台车有保险、保养、油费；一套房有物业、维修、贷款利息。但最基础的持有成本是**购买价格本身的分摊**——你花了 8000 块买 MacBook，用了 36 个月，每个月分摊多少？

这个问题看起来简单，但不同资产类型的答案完全不同：

- 电子产品贬值快，持有越久月均越低
- 房子可以用 30 年，应该按预期寿命均摊
- 车有残值，卖掉时还能收回一部分
- 奢侈品和贵金属可能升值，不该分摊

所以我设计了 **4 种分摊策略**，用 Strategy 模式实现，并配合一个**智能推荐器**自动为不同资产类型选择最合适的策略。

## 架构：Strategy 模式

```typescript
// src/engine/strategies/AmortizationStrategy.ts
export interface AmortizationStrategy {
  calculateMonthlyCost(asset: Asset, currentDate: Date): number;
  calculateAccumulated(asset: Asset, currentDate: Date): number;
  calculateRemaining(asset: Asset, currentDate: Date): number;
}
```

每个策略实现同一个接口的三个方法：
- **月均成本**：当月分摊多少钱
- **累计分摊**：到目前为止一共分摊了多少
- **剩余未分摊**：还有多少没分摊完

工厂函数根据资产的 `amortizationType` 返回对应策略：

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

要加第 5 种策略？写一个新文件实现 3 个方法，在 `strategyMap` 注册一行，完事。

## 策略 1：简单线性（Simple Linear）

**公式**: `月均成本 = 购入价 ÷ 持有月数`

特点：**月均成本随时间递减**。持有 7 个月时月均 1714 元，持有 13 个月时降到 923 元。

```typescript
// src/engine/strategies/SimpleLinearStrategy.ts
export const SimpleLinearStrategy: AmortizationStrategy = {
  calculateMonthlyCost(asset, currentDate) {
    if (asset.purchasePrice <= 0) return 0;
    const monthsHeld = monthsBetween(asset.purchaseDate, currentDate);
    return asset.purchasePrice / monthsHeld;
  },
  calculateAccumulated(asset) {
    return asset.purchasePrice;  // 全部已分摊
  },
  calculateRemaining() {
    return 0;  // 没有剩余
  },
};
```

**适用场景**：电子产品、数码产品——贬值快，早期月均高，但越用越"回本"。

## 策略 2：预期寿命（Expected Lifespan）

**公式**: `月均成本 = 购入价 ÷ 预期寿命月数`

特点：**月均成本固定**。不管你持有了多久，每个月分摊的钱是一样的。累计分摊到购入价封顶。

```typescript
// src/engine/strategies/ExpectedLifespanStrategy.ts
export const ExpectedLifespanStrategy: AmortizationStrategy = {
  calculateMonthlyCost(asset) {
    if (asset.purchasePrice <= 0) return 0;
    if (!asset.expectedLifespanMonths || asset.expectedLifespanMonths <= 0) return 0;
    return asset.purchasePrice / asset.expectedLifespanMonths;
  },
  calculateAccumulated(asset, currentDate) {
    if (asset.purchasePrice <= 0) return 0;
    const monthsHeld = monthsBetween(asset.purchaseDate, currentDate);
    const monthlyCost = asset.purchasePrice / asset.expectedLifespanMonths!;
    // 持有月数不超过预期寿命时，按比例分摊；超过后封顶
    const accumulated = monthlyCost * Math.min(monthsHeld, asset.expectedLifespanMonths!);
    return Math.min(accumulated, asset.purchasePrice);
  },
  calculateRemaining(asset, currentDate) {
    return Math.max(0, asset.purchasePrice - this.calculateAccumulated(asset, currentDate));
  },
};
```

**适用场景**：房产（默认 360 个月 = 30 年）、家居用品（默认 108 个月 = 9 年）。

## 策略 3：残值分摊（Residual Value）

**公式**: `月均成本 = (购入价 - 残值) ÷ 预期寿命月数`

在预期寿命的基础上，考虑了资产的残值（卖掉时能收回的钱）。只分摊会贬值的部分。

```typescript
// src/engine/strategies/ResidualValueStrategy.ts
export const ResidualValueStrategy: AmortizationStrategy = {
  calculateMonthlyCost(asset) {
    if (!asset.expectedLifespanMonths || asset.expectedLifespanMonths <= 0) return 0;
    const residual = asset.residualValue ?? 0;  // 无残值时默认为 0
    const depreciable = asset.purchasePrice - residual;
    if (depreciable <= 0) return 0;  // 残值 >= 购入价（升值了），不分摊
    return depreciable / asset.expectedLifespanMonths;
  },
  // accumulated 和 remaining 逻辑类似，上限为 depreciable 而非 purchasePrice
};
```

**适用场景**：车辆（默认 60 个月 = 5 年）。一台 15 万的车，5 年后残值约 5 万，实际分摊的是 10 万。

## 策略 4：不分摊（No Amortization）

**月均分摊 = 0**。

```typescript
// src/engine/strategies/NoAmortizationStrategy.ts
export const NoAmortizationStrategy: AmortizationStrategy = {
  calculateMonthlyCost() { return 0; },
  calculateAccumulated() { return 0; },
  calculateRemaining(asset) { return asset.purchasePrice; },
};
```

**适用场景**：奢侈品、贵金属。这些东西可能升值，分摊没有意义。持有成本只计算经常性支出（保管费等）和维护费用。

## 四种策略对比

| 策略 | 公式 | 月均变化 | 上限 | 默认适用 |
|------|------|----------|------|----------|
| 简单线性 | 购入价 ÷ 持有月数 | **递减** | 购入价 | 电子产品、数码 |
| 预期寿命 | 购入价 ÷ 预期月数 | **固定** | 购入价 | 房产(360月)、家居(108月) |
| 残值分摊 | (购入价-残值) ÷ 预期月数 | **固定** | 购入价-残值 | 车辆(60月) |
| 不分摊 | 0 | **零** | 0 | 奢侈品、贵金属 |

## 智能推荐器

用户添加资产时，不应该让他们理解这些算法。所以我做了一个表驱动的推荐器：

```typescript
// src/engine/AmortizationRecommender.ts
const RECOMMENDATION_TABLE: Record<AssetCategory, AmortizationRecommendation> = {
  [AssetCategory.ELECTRONICS]: {
    type: AmortizationType.SIMPLE_LINEAR,
    hint: '电子产品贬值快，按已持有时间递减',
  },
  [AssetCategory.REAL_ESTATE]: {
    type: AmortizationType.EXPECTED_LIFESPAN,
    defaultLifespanMonths: 360,  // 30 年
    hint: '房产保值期长，按预期使用年限分摊',
  },
  [AssetCategory.VEHICLE]: {
    type: AmortizationType.RESIDUAL_VALUE,
    defaultLifespanMonths: 60,  // 5 年
    hint: '车辆有残值，建议考虑残值后分摊',
  },
  [AssetCategory.LUXURY]: {
    type: AmortizationType.NO_AMORTIZATION,
    hint: '奢侈品可能增值，建议不分摊',
  },
  // ... 其他分类
};

export function recommendAmortization(category: AssetCategory) {
  return RECOMMENDATION_TABLE[category];
}
```

纯函数、确定性输出、零副作用。添加新分类？在表里加一行。

## 边界场景处理

金融计算的边界条件最容易出 bug。测试覆盖了这些场景：

| 边界场景 | 处理方式 | 测试 |
|----------|----------|------|
| 购入价 = 0 | 月均返回 0 | ✅ |
| 持有月数 = 0（同一天） | `monthsBetween` 最小返回 1，避免除零 | ✅ |
| 残值 > 购入价（升值） | `depreciable <= 0`，月均返回 0 | ✅ |
| 预期寿命未设置 | 月均返回 0 | ✅ |
| 累计分摊超过购入价 | `Math.min` 封顶 | ✅ |
| 剩余未分摊为负 | `Math.max(0, ...)` | ✅ |

## 持有成本 = 分摊 + 经常性支出 + 维护

分摊只是持有成本的一部分。完整的月持有成本：

```
月持有成本 = 月摊销（4种策略之一）
           + 月经常性支出（当月生效的保险、停车费等之和）
           + 月维护费用（可选纳入分摊的一次性维修费）
```

`HoldingCostCalculator` 编排这三个计算：

```typescript
// src/engine/HoldingCostCalculator.ts (简化)
// 退役或已售资产不计算持有成本
if (asset.status !== AssetStatus.ACTIVE) {
  return { monthlyTotal: 0, dailyAverage: 0, ... };
}

const strategy = getStrategy(asset);
const monthlyAmortization = strategy.calculateMonthlyCost(asset, currentDate);
const monthlyRecurring = RecurringExpenseCalculator.calculateMonthly(asset, currentDate);
const monthlyMaintenance = MaintenanceCalculator.calculateMonthly(asset, currentDate);

return {
  monthlyAmortization,
  monthlyRecurring,
  monthlyMaintenance,
  monthlyTotal: monthlyAmortization + monthlyRecurring + monthlyMaintenance,
  dailyAverage: monthlyTotal / 30,
  accumulatedTotal: ...,
  remainingUnamortized: strategy.calculateRemaining(asset, currentDate),
};
```

## 与行业折旧方法的对比

| 方法 | WorthBase 对应 | 会计准则 | 差异 |
|------|----------------|----------|------|
| 直线法 | 预期寿命策略 | 相同 | 基本一致 |
| 加速折旧 | — | 前期多后期少 | WorthBase 未实现，个人资产不需要 |
| 工作量法 | — | 按使用量分摊 | 个人资产无法衡量使用量 |
| 残值法 | 残值分摊策略 | 类似 | WorthBase 由用户自定义残值 |
| 简单线性 | 简单线性策略 | **无对应** | WorthBase 独有：月均递减，反映"越用越回本"的直觉 |

简单线性是 WorthBase 独有的方法。它不符合任何会计准则，但符合个人直觉——一台 MacBook 用了 3 年，你觉得它每个月"花"你多少钱？答案是"8000 ÷ 36 = 222 块"，但第一年你会觉得更贵，因为还没"回本"。简单线性捕捉的就是这种感觉。

🔗 **源码**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase) | [策略目录](https://github.com/callmebg/worthbase/tree/main/src/engine/strategies)

---

> **CSDN 标签**: `设计模式` `策略模式` `TypeScript` `算法` `React Native`
> **掘金话题**: `前端` `TypeScript` `设计模式` `算法`
