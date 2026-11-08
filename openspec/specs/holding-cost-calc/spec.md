## Purpose

回答「养这个东西每天花我多少钱」——家底的杀手级功能。覆盖 4 种分摊策略、依附于资产的经常性支出、一次性维护费、日均成本，以及卖出时的净支出结算。

## Requirements

### Requirement: Amortization method selection
The system SHALL provide 4 amortization methods for each asset, selected by the user at creation time and changeable at any time:
- **Simple Linear**: monthly cost = purchase_price ÷ months_held (decreases over time)
- **Expected Lifespan**: monthly cost = purchase_price ÷ expected_lifespan_months (fixed)
- **Residual Value**: monthly cost = (purchase_price - residual_value) ÷ expected_lifespan_months (fixed, accounts for residual)
- **No Amortization**: monthly cost = 0 (only recurring expenses and maintenance count)

#### Scenario: Calculate with simple linear method
- **WHEN** an asset has purchase_price ¥8,000, purchase_date 2025-01-15, current date 2026-07-15, and amortization method "Simple Linear"
- **THEN** system calculates months_held = 18, monthly amortization = 8000 ÷ 18 = ¥444.44/月

#### Scenario: Calculate with expected lifespan method
- **WHEN** an asset has purchase_price ¥8,000, expected_lifespan 36 months, and amortization method "Expected Lifespan"
- **THEN** system calculates monthly amortization = 8000 ÷ 36 = ¥222.22/月 (fixed regardless of actual holding time)

#### Scenario: Calculate with residual value method
- **WHEN** an asset has purchase_price ¥8,000, residual_value ¥2,000, expected_lifespan 36 months, and amortization method "Residual Value"
- **THEN** system calculates monthly amortization = (8000 - 2000) ÷ 36 = ¥166.67/月

#### Scenario: Calculate with no amortization method
- **WHEN** an asset has amortization method "No Amortization"
- **THEN** system calculates monthly amortization = ¥0/月, holding cost consists only of recurring expenses and maintenance

### Requirement: Recurring expenses management
The system SHALL allow users to add multiple recurring expenses per asset. Each recurring expense has a name, monthly amount, and effective_from date. Expenses can be edited, deleted, or ended (with effective_to date).

#### Scenario: Add recurring expense
- **WHEN** user adds a recurring expense "话费" ¥100/月 with effective_from 2025-01 to an asset
- **THEN** system includes ¥100 in the asset's monthly holding cost calculation for all months from 2025-01 onward

#### Scenario: Recurring expense with change history
- **WHEN** a recurring expense "话费" was ¥100/月 from 2025-01, changed to ¥150/月 from 2025-06, and changed back to ¥100/月 from 2025-12
- **THEN** system calculates the recurring expense for each month using the rate effective in that month (Jan-May: ¥100, Jun-Nov: ¥150, Dec+: ¥100)

### Requirement: One-time maintenance cost handling
The system SHALL allow users to add one-time maintenance records per asset. Each record has a name, amount, date, and an "amortize" flag. When amortize is true, the cost is spread over the remaining holding months; when false, it's recorded but not included in monthly cost.

#### Scenario: Add amortized maintenance
- **WHEN** user adds a maintenance record "换电池" ¥200 on 2025-06 with amortize=true, and the asset has 18 remaining months at that time
- **THEN** system adds ¥200 ÷ 18 = ¥11.11/月 to the holding cost from 2025-06 onward

#### Scenario: Add non-amortized maintenance
- **WHEN** user adds a maintenance record "屏幕维修" ¥500 on 2025-09 with amortize=false
- **THEN** system records the maintenance but does not add it to the monthly holding cost; it appears in the cumulative cost summary only

### Requirement: Daily average cost calculation
The system SHALL calculate and display the daily average holding cost alongside the monthly cost, computed as monthly_cost ÷ 30.

#### Scenario: Display daily cost
- **WHEN** an asset has a monthly holding cost of ¥411.11/月
- **THEN** system displays "≈ ¥13.70/天" alongside the monthly cost

### Requirement: Accumulated and remaining cost calculation
The system SHALL calculate the accumulated cost (total spent so far) and remaining unamortized cost for each asset.

#### Scenario: Calculate accumulated cost
- **WHEN** an asset has been held for 18 months with ¥222.22/月 amortization + ¥150/月 recurring + ¥38.89/月 maintenance
- **THEN** system calculates accumulated = (222.22 × 18) + (150 × 18) + (700 one-time) = ¥7,400

#### Scenario: Calculate remaining unamortized
- **WHEN** an asset with "Expected Lifespan" method (36 months) has been held for 18 months with purchase_price ¥8,000
- **THEN** system calculates remaining = 8000 - (222.22 × 18) = ¥4,000

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
