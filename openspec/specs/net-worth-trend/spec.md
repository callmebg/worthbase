## ADDED Requirements

### Requirement: Calculate and display net worth
The system SHALL calculate net worth as the sum of all account balances plus the current valuations of all active assets, minus any unamortized purchase costs (for assets using amortization).

#### Scenario: View net worth on dashboard
- **WHEN** user opens the Dashboard tab
- **THEN** system displays the current net worth, broken down into liquid assets total and asset valuation total, with the change compared to the previous snapshot

### Requirement: Generate net worth trend chart
The system SHALL generate a line chart of net worth over time based on historical balance snapshots and asset valuation history.

#### Scenario: View trend chart
- **WHEN** user views the trend section on the Dashboard
- **THEN** system displays a line chart with net worth values plotted over time, using historical snapshots as data points

#### Scenario: Switch time range
- **WHEN** user selects "Monthly", "Quarterly", or "Yearly" view
- **THEN** system adjusts the chart's granularity accordingly (monthly shows last 12 months, quarterly shows last 8 quarters, yearly shows all years)

### Requirement: Set and track net worth goal
The system SHALL allow users to set a net worth target amount and display progress toward that goal on the trend chart.

#### Scenario: Set net worth goal
- **WHEN** user goes to Settings and enters a target amount of ¥500,000
- **THEN** system saves the goal and displays a horizontal goal line on the trend chart, plus a progress bar showing current net worth as a percentage of the goal

#### Scenario: View goal progress
- **WHEN** user views the Dashboard trend section
- **THEN** system displays "进度: ████████░░░░ 67.9%" and an estimated achievement date based on the current trend
