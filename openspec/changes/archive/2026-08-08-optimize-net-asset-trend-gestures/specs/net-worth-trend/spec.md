## MODIFIED Requirements

### Requirement: Generate net worth trend chart
The system SHALL generate a line chart of net worth over time based on historical balance snapshots and asset valuation history. For each data point on the trend, the account balance component SHALL be calculated as the sum of all active accounts' latest balances as of that date (using the most recent snapshot on or before that date for each account), not only accounts that have a snapshot on that exact date. The asset valuation component SHALL continue to use the most recent valuation on or before that date (with purchase price as fallback). The overview (总览) trend card SHALL NOT display any "左右滑动" or swipe hint text overlay.

#### Scenario: View trend chart
- **WHEN** user views the trend section on the Dashboard
- **THEN** system displays a line chart with net worth values plotted over time, where each data point equals the sum of all active accounts' latest balances as of that date plus all tracked assets' valuations as of that date, without any swipe hint text overlay

#### Scenario: Trend chart consistency with hero card
- **WHEN** the most recent data point on the trend chart corresponds to the current date
- **THEN** that data point's value SHALL equal the net worth displayed in the Dashboard hero card

#### Scenario: Trend after partial balance update
- **WHEN** user updates only one account's balance on a given day while other accounts have older snapshots
- **THEN** the trend data point for that day SHALL include the latest known balances of ALL active accounts, producing a continuous and accurate trend line

#### Scenario: Switch time range
- **WHEN** user selects a different time range (3m, 6m, 1y, YTD, all, or custom)
- **THEN** system recalculates the trend using only snapshot dates within the selected range, with each point computed using the as-of-date algorithm

#### Scenario: No swipe hint on overview trend card
- **WHEN** the overview trend card renders on the Dashboard
- **THEN** the card SHALL NOT display any text or visual hint about swiping, such as "左右滑动...查看详情" or similar overlay text
