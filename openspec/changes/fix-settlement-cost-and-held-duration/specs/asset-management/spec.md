# asset-management — delta

## ADDED Requirements

### Requirement: Sold asset holding duration
已售资产的持有时长展示（详情页「已持有」、列表卡片「N个月」）SHALL 计算为购入日期至**卖出日期**的整月数，而非至当前日期；在用资产仍计算至当前日期。卖出日期缺失时 SHALL 回退为当前日期（防御性行为，正常卖出流程必有卖出日期）。

#### Scenario: Detail page held duration stops at sell date
- **WHEN** 查看购入于 2018-10、卖出于 2022-10 的已售资产详情（当前日期为 2026 年）
- **THEN** 「已持有」显示约 4 年（截止卖出日），而非 7 年+

#### Scenario: List card consistency
- **WHEN** 已售资产出现在资产列表（含「已售」筛选）且卡片展示持有时长
- **THEN** 卡片「N个月」同样截止于卖出日期，与详情页一致

#### Scenario: Active assets unchanged
- **WHEN** 资产状态为在用（未卖出）
- **THEN** 持有时长按购入日期至当前日期计算（保持既有行为）
