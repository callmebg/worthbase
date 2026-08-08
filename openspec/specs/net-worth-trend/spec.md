## ADDED Requirements

### Requirement: Calculate and display net worth
The system SHALL calculate net worth as the sum of all account balances plus the current valuations of all active assets, minus any unamortized purchase costs (for assets using amortization).

#### Scenario: View net worth on dashboard
- **WHEN** user opens the Dashboard tab
- **THEN** system displays the current net worth, broken down into liquid assets total and asset valuation total, with the change compared to the previous snapshot

### Requirement: Generate net worth trend chart
The system SHALL generate a line chart of net worth over time based on historical balance snapshots and asset valuation history. For each data point on the trend, the account balance component SHALL be calculated as the sum of all active accounts' latest balances as of that date (using the most recent snapshot on or before that date for each account), not only accounts that have a snapshot on that exact date. The asset valuation component SHALL continue to use the most recent valuation on or before that date (with purchase price as fallback). The overview (总览) trend card SHALL NOT display any "左右滑动" or swipe hint text overlay.

#### Scenario: View trend chart
- **WHEN** user views the trend section on the Dashboard
- **THEN** system displays a line chart with net worth values plotted over time, where each data point equals the sum of all active accounts' latest balances as of that date plus all tracked assets' valuations as of that date, without any swipe hint text overlay

#### Scenario: No swipe hint on overview trend card
- **WHEN** the overview trend card renders on the Dashboard
- **THEN** the card SHALL NOT display any text or visual hint about swiping, such as "左右滑动...查看详情" or similar overlay text

#### Scenario: Trend chart consistency with hero card
- **WHEN** the most recent data point on the trend chart corresponds to the current date
- **THEN** that data point's value SHALL equal the net worth displayed in the Dashboard hero card

#### Scenario: Trend after partial balance update
- **WHEN** user updates only one account's balance on a given day while other accounts have older snapshots
- **THEN** the trend data point for that day SHALL include the latest known balances of ALL active accounts, producing a continuous and accurate trend line

#### Scenario: Switch time range
- **WHEN** user selects a different time range (3m, 6m, 1y, YTD, all, or custom)
- **THEN** system recalculates the trend using only snapshot dates within the selected range, with each point computed using the as-of-date algorithm

### Requirement: Set and track net worth goal
The system SHALL allow users to set a net worth target amount and display progress toward that goal on the trend chart.

#### Scenario: Set net worth goal
- **WHEN** user goes to Settings and enters a target amount of ¥500,000
- **THEN** system saves the goal and displays a horizontal goal line on the trend chart, plus a progress bar showing current net worth as a percentage of the goal

#### Scenario: View goal progress
- **WHEN** user views the Dashboard trend section
- **THEN** system displays "进度: ████████░░░░ 67.9%" and an estimated achievement date based on the current trend
