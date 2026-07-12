## ADDED Requirements

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
