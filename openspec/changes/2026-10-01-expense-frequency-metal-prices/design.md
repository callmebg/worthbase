# Design Notes

## 支出周期：单一折算咽喉点

所有"周期 → 月度"换算集中在 `RecurringExpenseCalculator`（`toMonthlyAmount`）完成：

- `getMonthlyTotal` 返回月度等价金额之和 → `HoldingCostCalculator.monthlyRecurring`、`HoldingCostBreakdown`、资产列表/首页的月度总支出**自动正确**，零改动
- `getAccumulatedTotal` 用 月度等价 × 生效月数 → `SettlementCalculator` 卖出结算自动正确
- 不足整季/整年按月折算（prorate），与月度展示口径一致，避免"年中卖出算不算整年"的歧义
- `frequency` 非法/缺失（旧数据、旧备份、异常导入）一律回落 monthly：DB 列有 `DEFAULT 'monthly'`，读取层 `?? MONTHLY`，导入层枚举校验，三层兜底

备选方案（被否）：累计成本按"完整扣费周期数"计——更贴近真实账单，但与月度展示口径不一致，且部分周期退款/过户场景复杂，收益低。

## 贵金属价格：不做金属分类

贵金属种类繁多（金/银/铂/钯…），逐一建类型字段是过度设计（用户确认为伪需求倾向）。采取**参考价 + 一键填入**：

- 不改 assets 表，只依赖已有 `weightGrams`
- 详情页展示金/银两个参考价与对应市值，用户自行判断自己的资产更接近哪种
- 估值写入仍走人工确认（填入 → 可改 → 保存），实时价永远只是"参考"，不自动污染估值历史

## 数据源与降级

- `api.gold-api.com`（XAU/XAG，USD/oz）与 `api.frankfurter.dev`（ECB 汇率，USD→CNY），均免费无 key、已实测可用（2026-10-01：金价 ≈ ¥902/g，银价 ≈ ¥13.2/g）
- 国际现货折算比国内金价（上金所）略低（国内有溢价），页面注明"仅供估价参考"；用户可在填入后手动加价
- 这是 App 首个网络请求：8s 超时（AbortController）、10 分钟缓存（settings 表 `metal_price_cache` key，`loadAll/saveAll` 只认固定 key，不会进备份导出）、失败静默回落缓存，任何网络异常都不影响其余功能
