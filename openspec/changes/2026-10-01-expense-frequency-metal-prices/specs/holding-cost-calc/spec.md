## MODIFIED Requirements

### Requirement: Recurring expenses management
The system SHALL allow users to add multiple recurring expenses per asset. Each recurring expense has a name, amount, billing frequency (按月 monthly / 按季 quarterly / 按年 yearly, default monthly), and effective_from date. Expenses can be edited, deleted, or ended (with effective_to date). For cost calculation, every expense SHALL be normalized to its monthly equivalent: `amount ÷ 1` (monthly), `amount ÷ 3` (quarterly), `amount ÷ 12` (yearly). Accumulated cost SHALL be `monthly equivalent × effective months`, prorating partial billing periods by month.

#### Scenario: Add recurring expense
- **WHEN** user adds a recurring expense "话费" ¥100/月 with effective_from 2025-01 to an asset
- **THEN** system includes ¥100 in the asset's monthly holding cost calculation for all months from 2025-01 onward

#### Scenario: Add yearly recurring expense
- **WHEN** user adds a recurring expense "车险" ¥3000/年 with effective_from 2025-01 to an asset
- **THEN** system includes ¥250 (= 3000 ÷ 12) in the asset's monthly holding cost for all months from 2025-01 onward, and the expense list displays "¥3,000.00/年"

#### Scenario: Add quarterly recurring expense
- **WHEN** user adds a recurring expense "物业费" ¥900/季 with effective_from 2025-01
- **THEN** system includes ¥300 (= 900 ÷ 3) in the monthly holding cost from 2025-01 onward

#### Scenario: Accumulated cost prorates partial billing periods
- **WHEN** a ¥3000/年 expense effective from 2025-01 is accumulated through 2025-06 (6 months)
- **THEN** accumulated recurring cost is ¥1500 (= 250 × 6), not ¥3000

#### Scenario: Recurring expense with change history
- **WHEN** a recurring expense "话费" was ¥100/月 from 2025-01, changed to ¥150/月 from 2025-06, and changed back to ¥100/月 from 2025-12
- **THEN** system calculates the recurring expense for each month using the rate effective in that month (Jan-May: ¥100, Jun-Nov: ¥150, Dec+: ¥100)

#### Scenario: Legacy data without frequency
- **WHEN** a recurring expense row created before migration v10 (no frequency value) or imported from an old backup JSON (missing/invalid frequency field) is read
- **THEN** the system SHALL treat it as monthly (frequency = 'monthly')
