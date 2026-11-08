# holding-cost-calc — delta

## ADDED Requirements

### Requirement: Settlement net expenditure calculation
卖出结算的真实净支出 SHALL 按 `购入价 + 现金性累计持有成本 − 卖价` 计算，其中现金性累计持有成本 = 累计经常性支出 + 累计维护费（含摊销性与非摊销性）。累计折旧（购入价的会计分摊）MUST NOT 计入累计持有成本，因其非现金支出且已由「贬值 = 购入价 − 卖价」单独体现，计入将导致购入价被重复计算。结算 MUST 仅基于该资产自身的数据。

#### Scenario: Fully depreciated asset does not double-count purchase price
- **WHEN** 已售资产购入价 ¥6,999、卖价 ¥2,400、持有 1,477 天（超过预期寿命，累计折旧已达上限 ¥6,999），无经常性支出与维护费
- **THEN** 累计持有成本 = ¥0，真实净支出 = ¥4,599（等于贬值额），而非 ¥11,598

#### Scenario: Settlement with cash holding costs
- **WHEN** 已售资产购入价 ¥12,000、卖价 ¥6,000，累计经常性支出 ¥2,000、累计维护费 ¥1,500，累计折旧 ¥8,000
- **THEN** 累计持有成本 = ¥3,500（不含折旧），真实净支出 = 12,000 + 3,500 − 6,000 = ¥9,500

#### Scenario: Sell preview uses the same formula
- **WHEN** 用户在卖出弹窗中以假设卖价预览结算
- **THEN** 预览的累计持有成本、真实净支出与日均成本采用与卖出后结算完全相同的口径（同一计算入口）

### Requirement: Settlement daily average cost calculation
已售资产的日均成本 SHALL 按 `真实净支出 ÷ 持有天数` 计算，持有天数 = 购入日期至卖出日期的天数。

#### Scenario: Daily average cost of the reported device
- **WHEN** 已售资产真实净支出 ¥4,599、持有 1,477 天
- **THEN** 日均成本 ≈ ¥3.11/天，而非 ¥7.85/天（旧口径将购入价重复计入所致）

#### Scenario: Settlement card rows are self-consistent
- **WHEN** 用户查看已售资产的结算卡片
- **THEN** 画面满足恒等式：贬值 + 累计持有成本 = 真实净支出；真实净支出 ÷ 持有天数 = 日均成本
