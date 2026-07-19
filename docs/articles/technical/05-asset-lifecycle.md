[TOC]

# 资产生命周期管理：状态机 + 卖出结算算法

> 一台 MacBook 从买入到卖出，App 帮你算清楚到底花了多少钱。

## 资产状态机

每个资产有三个状态，合法转换如下：

```
         ┌──────────────┐
         │   active     │ ← 初始状态（购买后）
         │   使用中      │
         └──────┬───────┘
                │
        ┌───────┴───────┐
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│  retired     │  │   sold       │
│  退役        │  │   已售       │
└──────┬───────┘  └──────────────┘
       │                  ↑
       └──────────────────┘
       (retired → sold 也合法)

另外：retired → active（恢复使用）也支持
```

用枚举定义：

```typescript
// src/types/enums.ts
export enum AssetStatus {
  ACTIVE = 'active',    // 使用中
  RETIRED = 'retired',  // 退役（不再使用，但未出售）
  SOLD = 'sold',        // 已售（终态）
}
```

Zustand store 中的状态转换：

```typescript
// src/stores/asset-store.ts
markRetired: async (id) => {
  await AssetRepository.markRetired(id);
  set(state => ({
    assets: state.assets.map(a =>
      a.id === id ? { ...a, status: AssetStatus.RETIRED } : a
    ),
  }));
},

recordSale: async (id, sellDate, sellPrice) => {
  await AssetRepository.recordSale(id, sellDate, sellPrice);
  set(state => ({
    assets: state.assets.map(a =>
      a.id === id ? { ...a, status: AssetStatus.SOLD, sellDate, sellPrice } : a
    ),
  }));
},

restoreAsset: async (id) => {
  await AssetRepository.restoreActive(id);
  set(state => ({
    assets: state.assets.map(a =>
      a.id === id ? { ...a, status: AssetStatus.ACTIVE } : a
    ),
  }));
},
```

## 8 种资产分类

```typescript
export enum AssetCategory {
  VEHICLE = 'vehicle',           // 车辆 → 残值分摊 (60月)
  REAL_ESTATE = 'real_estate',   // 房产 → 预期寿命 (360月)
  ELECTRONICS = 'electronics',   // 电子产品 → 简单线性
  DIGITAL = 'digital',           // 数码 → 简单线性
  HOME = 'home',                 // 家居 → 预期寿命 (108月)
  LUXURY = 'luxury',             // 奢侈品 → 不分摊
  PRECIOUS_METAL = 'precious_metal', // 贵金属 → 不分摊
  OTHER = 'other',               // 其他 → 简单线性
}
```

分类影响两个行为：
1. **推荐的分摊方式**（通过 `AmortizationRecommender`）
2. **图标映射**（通过 `ASSET_CATEGORY_ICONS`）

## 卖出结算算法

当资产标记为"已售"时，触发结算计算。这是整个资产模块最核心的逻辑：

```typescript
// src/engine/SettlementCalculator.ts
export const SettlementCalculator = {
  async calculate(asset: Asset): Promise<SettlementResult> {
    // 1. 累计摊销（通过策略模式）
    const strategy = getStrategy(asset);
    const accumulatedAmortization = strategy.calculateAccumulated(asset, sellDateObj);

    // 2. 累计经常性支出（从购买到卖出月份，所有生效项之和）
    const accumulatedRecurring = await RecurringExpenseCalculator.getAccumulatedTotal(
      asset.id, asset.purchaseDate, sellMonth
    );

    // 3. 累计维护费用（分摊部分 + 不分摊部分）
    const accumulatedMaintenance =
      await MaintenanceCalculator.getAccumulatedAmortized(asset, sellDateObj)
      + await MaintenanceCalculator.getNonAmortizedTotal(asset.id);

    // 4. 总持有成本
    const totalHoldingCost = accumulatedRecurring + accumulatedMaintenance + accumulatedAmortization;

    // 5. 贬值 = 购入价 - 卖价（负数表示升值）
    const depreciation = asset.purchasePrice - sellPrice;

    // 6. 净支出 = 购入价 + 总持有成本 - 卖价
    const netExpenditure = asset.purchasePrice + totalHoldingCost - sellPrice;

    // 7. 持有天数
    const ownershipDays = daysBetween(asset.purchaseDate, sellDateObj);

    // 8. 日均成本 = 净支出 ÷ 持有天数
    const dailyAverageCost = netExpenditure / ownershipDays;

    return { purchasePrice, sellPrice, depreciation, totalHoldingCost, netExpenditure, ownershipDays, dailyAverageCost, ... };
  },
};
```

### 结算公式可视化

```
购入价 ¥8,000 (MacBook)
  + 累计摊销 ¥8,000（简单线性 36 个月）
  + 累计经常性支出 ¥0
  + 累计维护费用 ¥500（换了一次电池）
  ──────────────────────────────
  总持有成本 = ¥8,500

  净支出 = ¥8,000 + ¥8,500 - ¥3,000(卖价)
         = ¥13,500

  持有天数 = 1,095 天 (3年)
  日均成本 = ¥13,500 ÷ 1,095 = ¥12.33/天
```

### 预览功能

还没卖，但想知道"如果现在卖了会怎样"？`preview` 方法用当前日期和假设卖价计算：

```typescript
async preview(asset: Asset, hypotheticalSellPrice: number): Promise<SettlementResult> {
  const previewAsset = {
    ...asset,
    status: AssetStatus.SOLD,
    sellDate: new Date().toISOString(),
    sellPrice: hypotheticalSellPrice,
  };
  return this.calculate(previewAsset);
}
```

## 估值历史追踪

资产可选开启"估值追踪"。每次更新估值，会同时写入两个地方：

```typescript
// src/stores/asset-store.ts
updateValuation: async (id, valuation, date) => {
  // 1. 写入估值历史表（用于趋势图和估值曲线）
  await ValuationRepository.create({
    assetId: id,
    valuation,
    recordedDate: date ?? new Date().toISOString().substring(0, 10),
  });

  // 2. 更新资产表的当前估值字段
  await AssetRepository.update(id, { currentValuation: valuation });
},
```

估值历史表的 schema：

```sql
CREATE TABLE valuation_history (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  valuation REAL NOT NULL,
  recorded_date TEXT NOT NULL
);

CREATE INDEX idx_valuation_asset_date ON valuation_history(asset_id, recorded_date);
```

趋势图在重建历史净资产时，会反向扫描估值历史，找到每个日期点的最新估值：

```typescript
// 对每个趋势图日期点
const history = valuationHistories.get(asset.id) ?? [];
const latest = history.findLast(v => v.recordedDate <= currentDate);
const valuation = latest?.valuation ?? asset.purchasePrice; // 无估值则用购入价
```

## 端到端示例

一台 MacBook Pro 的完整生命周期：

| 时间 | 事件 | 数据变化 |
|------|------|----------|
| 2023-01 | 购买 | status=active, purchasePrice=16000, amortization=simple_linear |
| 2023-06 | 更新估值 | valuation_history: [{date:'2023-06', valuation:14000}] |
| 2024-01 | 更新估值 | valuation_history: [..., {date:'2024-01', valuation:12000}] |
| 2024-06 | 换电池 | maintenance_records: {amount:800, amortize:false} |
| 2025-06 | 更新估值 | valuation_history: [..., {date:'2025-06', valuation:9000}] |
| 2025-12 | 卖出 | status=sold, sellPrice=8000 → 触发结算 |

结算结果：
- 购入价 ¥16,000，卖价 ¥8,000，贬值 ¥8,000
- 累计摊销 ¥16,000（简单线性 36 个月已全部分摊）
- 累计维护 ¥800
- 净支出 = 16000 + 16800 - 8000 = ¥24,800
- 持有 1,095 天，日均 ¥22.65

🔗 **源码**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase) | [SettlementCalculator.ts](https://github.com/callmebg/worthbase/blob/main/src/engine/SettlementCalculator.ts) | [asset-store.ts](https://github.com/callmebg/worthbase/blob/main/src/stores/asset-store.ts)

---

> **CSDN 标签**: `状态机` `React Native` `TypeScript` `设计模式`
> **掘金话题**: `前端` `TypeScript` `设计模式`
