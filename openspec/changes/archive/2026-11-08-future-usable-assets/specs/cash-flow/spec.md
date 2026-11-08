## ADDED Requirements

### Requirement: Household-level recurring expenses

The system SHALL allow users to record recurring expenses that are not attached to any asset — such as rent (房租), broadband (宽带), and life insurance (人寿险) — in the `cash_flows` store with `kind = 'expense'`. These entries SHALL NOT reference an asset and SHALL NOT participate in any asset's holding cost calculation. Expenses that are attached to an asset SHALL remain in `recurring_expenses` and SHALL NOT be duplicated into `cash_flows`.

#### Scenario: Add a household expense

- **WHEN** user adds a cash flow entry named "房租" with amount 4500, kind `expense`, frequency `monthly`, effective from `2026-01`
- **THEN** the entry SHALL be stored in `cash_flows` with `effective_to` null (ongoing) and SHALL appear in the household cash flow list

#### Scenario: Household expense is excluded from holding cost

- **WHEN** the holding cost of any asset is calculated after a household expense exists
- **THEN** that household expense SHALL NOT contribute to the asset's recurring expense total, and `HoldingCostCalculator` output SHALL be identical to its value before the household expense was added

#### Scenario: Asset-attached expenses are summarized on the cash flow page

- **WHEN** user opens the cash flow page and has 2 asset-attached recurring expenses totalling ¥800/month
- **THEN** the page SHALL display a read-only summary row "另有 2 笔资产附属支出 ¥800/月" with navigation to the relevant assets, and that amount SHALL NOT be editable from the cash flow page

### Requirement: Recurring income

The system SHALL allow users to record recurring income — monthly salary (月薪), quarterly bonus (季度奖), annual bonus (年终奖) — in the `cash_flows` store with `kind = 'income'`. Income entries SHALL use the same frequency vocabulary as expenses (`monthly` / `quarterly` / `yearly`).

#### Scenario: Add monthly salary

- **WHEN** user adds an income entry named "月薪" with amount 20000 and frequency `monthly`
- **THEN** the entry SHALL be stored and SHALL contribute ¥20,000 to each month's known inflow from its `effective_from` month onward

#### Scenario: Add annual bonus

- **WHEN** user adds an income entry named "年终奖" with amount 60000 and frequency `yearly`
- **THEN** the entry SHALL contribute a monthly equivalent of ¥5,000 (60000 ÷ 12)

#### Scenario: Add quarterly bonus

- **WHEN** user adds an income entry named "季度奖" with amount 15000 and frequency `quarterly`
- **THEN** the entry SHALL contribute a monthly equivalent of ¥5,000 (15000 ÷ 3)

### Requirement: Monthly-equivalent normalization

The system SHALL normalize every cash flow amount to a monthly equivalent using the same single choke point used for recurring expenses (`toMonthlyAmount`): monthly ÷ 1, quarterly ÷ 3, yearly ÷ 12. An unrecognized or missing frequency SHALL fall back to `monthly`.

#### Scenario: Income and expense share one normalization rule

- **WHEN** an income of ¥12,000/`yearly` and an expense of ¥12,000/`yearly` are both normalized
- **THEN** both SHALL yield ¥1,000 per month, and the net monthly inflow SHALL be ¥0

#### Scenario: Unknown frequency falls back to monthly

- **WHEN** a cash flow record carries a frequency value that is not one of `monthly` / `quarterly` / `yearly`
- **THEN** the system SHALL treat it as `monthly` and SHALL NOT throw

### Requirement: Effective period of a cash flow

Each cash flow SHALL carry `effective_from` (`YYYY-MM`, required) and `effective_to` (`YYYY-MM`, nullable — null means ongoing). A cash flow SHALL only contribute to months within its inclusive effective range.

#### Scenario: Future-dated income is not counted today

- **WHEN** today is `2026-11` and an income entry has `effective_from = 2027-03`
- **THEN** the entry SHALL NOT contribute to the known monthly inflow for `2026-11`, and SHALL contribute from `2027-03` onward

#### Scenario: Ended cash flow stops contributing

- **WHEN** an expense entry has `effective_from = 2026-01` and `effective_to = 2026-06`
- **THEN** the entry SHALL contribute to months `2026-01` through `2026-06` inclusive, and SHALL NOT contribute from `2026-07` onward

#### Scenario: Partial month at the boundary is not prorated

- **WHEN** a monthly cash flow's effective range covers a month
- **THEN** that month SHALL count the full monthly equivalent, with no day-level proration

### Requirement: Manage cash flows

The system SHALL allow users to add, edit, and delete cash flow entries through a Bottom Sheet form using the shared TextInput, Button, and Chip components. Frequency selection SHALL use Chip components consistent with the recurring expense form.

#### Scenario: Edit a cash flow

- **WHEN** user taps an existing cash flow entry and changes its amount from 4500 to 5000
- **THEN** the stored entry SHALL be updated and every downstream calculation (projection, usable assets) SHALL reflect the new amount on the next computation

#### Scenario: Delete a cash flow

- **WHEN** user deletes a cash flow entry
- **THEN** the entry SHALL be removed from `cash_flows` and SHALL no longer contribute to any month's inflow or outflow

#### Scenario: Reached from the accounts screen

- **WHEN** user opens the Accounts tab and taps 「固定收支」
- **THEN** the cash flow page SHALL open, listing fixed income and fixed expenses with their monthly-equivalent subtotals

#### Scenario: Not filed under Settings

- **WHEN** user opens Settings
- **THEN** Settings SHALL NOT contain an entry point to the cash flow page — Settings covers the app itself (security, appearance, data), while cash flow belongs to the money context on the Accounts screen

#### Scenario: Empty state

- **WHEN** user opens the cash flow page with no entries recorded
- **THEN** the page SHALL display an explanatory empty state that distinguishes household cash flow from asset-attached recurring expenses, and SHALL NOT display a blank list
