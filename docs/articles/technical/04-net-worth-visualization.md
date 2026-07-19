[TOC]

# 净资产趋势可视化：SVG 图表 + 手势交互 + 降采样算法

> 你的净资产在涨还是在跌？什么时候能达成目标？

## 净资产计算：68 行代码

净资产的公式很简单：

```
净资产 = 账户余额（流动资产） + 资产估值（实物资产）
```

实现只有 68 行：

```typescript
// src/engine/NetWorthCalculator.ts (核心逻辑)
export const NetWorthCalculator = {
  async calculate(currentDate: Date = new Date()): Promise<NetWorthResult> {
    // 1. 流动资产 = 所有账户最新余额之和
    const balances = await AccountRepository.getAllLatestBalances();
    let liquidAssets = 0;
    for (const balance of balances.values()) {
      liquidAssets += balance;
    }

    // 2. 资产估值 = 所有活跃资产的当前估值之和
    const assets = await AssetRepository.getByStatus(AssetStatus.ACTIVE);
    const valuations = await ValuationRepository.getLatestForAllAssets();
    let assetValuations = 0;
    let unamortizedCost = 0;

    for (const asset of assets) {
      if (asset.valuationTracking) {
        const valuation = valuations.get(asset.id) ?? asset.currentValuation ?? 0;
        assetValuations += valuation;
      }
      // 追踪未分摊成本（用于参考，不影响净资产）
      const strategy = getStrategy(asset);
      unamortizedCost += strategy.calculateRemaining(asset, currentDate);
    }

    return {
      liquidAssets,
      assetValuations,
      unamortizedCost,
      netWorth: liquidAssets + assetValuations,
    };
  },
};
```

## 趋势重建：从快照到曲线

趋势图的数据不是预计算的——每次打开 Dashboard 都会**从原始快照重建**。

流程：
1. 根据选定的时间范围（3 个月 / 6 个月 / 1 年 / 全部），获取所有快照日期
2. 对每个日期，重建当天的净资产：
   - 取每个账户在该日期（或之前）的最新余额
   - 取每个资产在该日期的估值（有估值记录就用估值，没有就用购入价）
   - 求和 = 当天净资产
3. 得到时间序列 `[{date, value}, ...]`

```typescript
// app/index.tsx (简化)
const snapshotDates = await BalanceSnapshotRepository.getAllSnapshotDates(cutoff, end);

for (const date of snapshotDates) {
  // 流动资产：该日期各账户最新余额
  const balances = await BalanceSnapshotRepository.getBalancesForDate(date);
  let totalBalance = 0;
  for (const balance of balances.values()) totalBalance += balance;

  // 资产估值：该日期各资产最新估值
  let totalValuation = 0;
  for (const asset of trackedAssets) {
    const history = valuationHistories.get(asset.id) ?? [];
    const latest = history.findLast(v => v.recordedDate <= date);
    totalValuation += latest?.valuation ?? asset.purchasePrice;
  }

  allPoints.push({ date, value: totalBalance + totalValuation });
}
```

**为什么不用预计算？** 因为净资产公式可能变化（比如未来可能加入负债抵扣），从原始数据重建可以保证趋势图和当前公式始终一致。对于个人 App 的数据量来说，性能完全不是问题。

## 降采样：保留极值的桶算法

当数据点超过 24 个时，图表会显得拥挤。需要降采样——但不能简单等距取样，否则会丢失重要的峰值和谷值。

```typescript
// app/index.tsx:644
function downsamplePreservingExtrema(
  points: { date: string; value: number }[],
  maxPoints: number
): { date: string; value: number }[] {
  if (points.length <= maxPoints) return points;

  const result = [points[0]]; // 始终保留第一个点
  const bucketCount = maxPoints - 2;
  const interiorPoints = points.slice(1, -1);
  const bucketSize = interiorPoints.length / bucketCount;

  for (let b = 0; b < bucketCount; b++) {
    const bucket = interiorPoints.slice(
      Math.floor(b * bucketSize),
      Math.floor((b + 1) * bucketSize)
    );
    if (bucket.length === 0) continue;

    // 在每个桶中，找偏离趋势线最远的点
    const prevVal = result[result.length - 1].value;
    const lastVal = points[points.length - 1].value;
    const avg = (prevVal + lastVal) / 2;

    let bestIdx = 0, bestDist = -1;
    for (let j = 0; j < bucket.length; j++) {
      const dist = Math.abs(bucket[j].value - avg);
      if (dist > bestDist) { bestDist = dist; bestIdx = j; }
    }
    result.push(bucket[bestIdx]);
  }

  result.push(points[points.length - 1]); // 始终保留最后一个点
  return result;
}
```

**算法思路**：
1. 始终保留首尾两点
2. 中间部分分成 N 个桶
3. 每个桶保留"偏离趋势线最远"的那个点
4. 这确保了峰值和谷值不会被降采样抹平

效果：100 个数据点降到 24 个，但趋势的"形状"保持不变。

## 线性回归预测：你什么时候能达成目标？

如果你设了净资产目标（比如 100 万），系统会用**最近 6 个数据点做线性回归**，预测达成日期：

```typescript
// src/engine/ProjectionCalculator.ts
export const ProjectionCalculator = {
  estimateProjectionDetail(historicalPoints, goal) {
    if (historicalPoints.length < 2) return null;

    const points = historicalPoints.slice(-6); // 最近 6 个点
    const n = points.length;
    const firstDate = new Date(points[0].date + 'T00:00:00Z');

    // 最小二乘法：x = 距首点的月数，y = 净资产
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      const d = new Date(points[i].date + 'T00:00:00Z');
      const x = (d.getTime() - firstDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
      const y = points[i].value;
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator; // 月均增长
    if (slope <= 0) return null; // 净资产在下降或持平，无法达成

    const currentValue = points[n - 1].value;
    if (currentValue >= goal) return null; // 已达成目标

    const gap = goal - currentValue;
    const monthsNeeded = gap / slope;

    // 从最后一个数据点推算达成日期
    const lastDate = new Date(points[n - 1].date + 'T00:00:00Z');
    const achievementDate = new Date(
      lastDate.getTime() + monthsNeeded * 30.44 * 24 * 60 * 60 * 1000
    );

    return {
      achievementDate: formatDate(achievementDate),
      monthlyGrowth: slope,
      gap,
      monthsNeeded,
      currentValue,
    };
  },
};
```

**边界处理**：
- 数据点 < 2 → 无法回归，返回 null
- 斜率 ≤ 0（净资产在下降或持平）→ 无法达成
- 当前净资产已 ≥ 目标 → 已达成，无需预测
- 只用最近 6 个点 → 避免被历史波动干扰

## SVG 图表组件：540 行

`InteractiveTrendChart` 是整个项目最复杂的组件（540 行），因为它需要处理：

### 手势交互

```
┌───────────────────────────────────────┐
│           图表区域                      │
│                                       │
│  双指捏合 → 缩放（调整可见窗口大小）    │
│  单指拖动 → 平移（左右滑动查看历史）    │
│  单击     → 显示数据点详情（十字准星）   │
│                                       │
│  外层 ScrollView → 垂直滚动页面        │
└───────────────────────────────────────┘
```

三种手势在同一区域内共存，通过 Gesture Handler 的状态管理解决冲突：图表区域内优先响应水平手势（缩放/拖拽），垂直手势传递给外层 ScrollView。

### 渲染细节

- **Y 轴标签**：自动计算刻度，标签之间最小间距 16px（防止重叠）
- **目标线**：如果设了净资产目标，在图表上画一条虚线
- **渐变色填充**：曲线下方区域，绿色=高于起始值，红色=低于起始值
- **空状态**：数据不足时显示"数据不足"提示

### 滑动窗口

图表维护一个"可见窗口"：`windowStart`（起始索引）+ `windowSize`（可见点数）。缩放改变 `windowSize`，拖拽改变 `windowStart`。最小窗口 3 个点。

```typescript
// 缩放：改变窗口大小
onPinchEvent={(event) => {
  const newWindowSize = Math.max(3, Math.round(baseWindowSize / event.scale));
  setWindowSize(Math.min(newWindowSize, totalPoints));
}}

// 拖拽：平移窗口
onPanEvent={(event) => {
  const pointsPerPx = totalPoints / chartWidth;
  const shift = Math.round(-event.translationX * pointsPerPx);
  setWindowStart(Math.max(0, Math.min(baseStart + shift, totalPoints - windowSize)));
}}
```

## 性能考虑

| 场景 | 数据量 | 策略 |
|------|--------|------|
| 3 个月 | ~10-30 点 | 全部渲染 |
| 1 年 | ~50-100 点 | 降采样到 24 点 |
| 全部历史 | 可能 200+ | 降采样到 24 点 |
| 缩放后 | 3-24 点 | 窗口内全量渲染 |

SVG 渲染 24 个点完全没有性能问题。即使不降采样，100 个点的 SVG path 也是毫秒级渲染。瓶颈在数据加载（SQLite 查询），不在渲染。

🔗 **源码**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase) | [InteractiveTrendChart.tsx](https://github.com/callmebg/worthbase/blob/main/src/components/InteractiveTrendChart.tsx) | [NetWorthCalculator.ts](https://github.com/callmebg/worthbase/blob/main/src/engine/NetWorthCalculator.ts)

---

> **CSDN 标签**: `数据可视化` `SVG` `算法` `React Native` `手势`
> **掘金话题**: `前端` `数据可视化` `React Native` `算法`
