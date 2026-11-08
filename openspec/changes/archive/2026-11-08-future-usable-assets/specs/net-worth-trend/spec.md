## MODIFIED Requirements

### Requirement: Calculate and display net worth

The system SHALL calculate net worth as the sum of all account balances plus the current valuations of all active assets, minus any unamortized purchase costs (for assets using amortization). Account balances SHALL be reported as three components — **available liquid** (freely spendable accounts), **restricted liquid** (accounts whose type is in `RESTRICTED_ACCOUNT_TYPES`), and **liabilities** — whose sum equals the previously reported liquid assets figure. The net worth **total** SHALL be numerically identical to the value produced before liquidity classification existed.

#### Scenario: View net worth on dashboard

- **WHEN** user opens the Dashboard tab
- **THEN** system displays the current net worth, broken down into available liquid / restricted liquid / liabilities / asset valuation totals, with the change compared to the previous snapshot

#### Scenario: Net worth total is preserved

- **WHEN** net worth is computed for any data set
- **THEN** `availableLiquid + restrictedLiquid + liabilities + assetValuations` SHALL equal the value that `liquidAssets + assetValuations` produced for the same data set, to the cent

#### Scenario: Restricted funds are visible but separate

- **WHEN** the user holds ¥80,000 in a `provident_fund` account and ¥50,000 in a `bank_card` account
- **THEN** the breakdown SHALL report available ¥50,000 and restricted ¥80,000, and net worth SHALL include both

#### Scenario: Deprecated aggregate still available

- **WHEN** an existing caller reads the `liquidAssets` field of the net worth result
- **THEN** it SHALL receive the unchanged sum of all three account components, so that no caller breaks during migration

#### Scenario: No liquidity toggle affects the total

- **WHEN** any account's type is unchanged and only its balance is updated
- **THEN** the net worth total SHALL change by exactly the balance delta, with no user-facing setting able to suppress an account from the total

### Requirement: Set and track net worth goal

The system SHALL allow users to set a net worth target amount and display progress toward that goal on the trend chart. The estimated achievement date SHALL be derived from **known cash flows plus the historical residual trend**, not from historical regression alone (see `dashboard-redesign` → "Goal projection calculator" for the full requirement). A negative historical residual SHALL NOT by itself suppress the estimate.

#### Scenario: Set net worth goal

- **WHEN** user goes to Settings and enters a target amount of ¥500,000
- **THEN** system saves the goal and displays a horizontal goal line on the trend chart, plus a progress bar showing current net worth as a percentage of the goal

#### Scenario: View goal progress

- **WHEN** user views the Dashboard trend section
- **THEN** system displays "进度: ████████░░░░ 67.9%" and an estimated achievement date derived from known cash flows plus the historical residual

#### Scenario: Estimate survives a flat history

- **WHEN** the user's last 6 net worth data points are flat or declining, but recorded cash flows produce a positive net monthly inflow
- **THEN** the system SHALL still produce an estimated achievement date rather than displaying nothing

#### Scenario: Historical trend line is untouched

- **WHEN** the trend chart is rendered after this change ships
- **THEN** every historical data point SHALL hold the same value it held before, since the chart plots net worth and the net worth total is unchanged
