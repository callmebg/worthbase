## 1. 过滤非追踪资产

- [x] 1.1 在 `src/engine/UsageCalculator.ts` 的 `calculateAll()` 中增加 `usageTracking` 过滤，跳过未开启使用追踪的资产
- [x] 1.2 在 `app/index.tsx` 排行构建处增加 `asset.usageTracking` 过滤条件

## 2. UI 简化

- [x] 2.1 移除 `usageTab` state 和 `neglectedItems` state，移除 `getNeglected()` 调用
- [x] 2.2 将"次均成本洞察"区域从双 Tab 改为单排行列表：标题改为"次均成本排行"，去掉 Tab 切换 Chip
- [x] 2.3 在排行行内增加闲置角标：当 `usage.isNeglected` 为 true 时，显示 warning 色 `闲置X天` 文本

## 3. 验证

- [x] 3.1 运行现有测试确保无回归
- [x] 3.2 添加单元测试验证 `calculateAll` 过滤 `usageTracking: false` 的资产
