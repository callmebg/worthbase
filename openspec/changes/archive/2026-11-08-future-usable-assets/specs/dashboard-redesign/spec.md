## MODIFIED Requirements

### Requirement: Redesigned net worth hero card

The Dashboard's net worth card SHALL use a gradient background derived from the theme's primary color with improved visual hierarchy. The card SHALL display: total net worth (display typography), a breakdown of **available liquid / restricted liquid / asset valuations** in a horizontal stat row, and an optional goal progress indicator with a styled progress bar.

The card SHALL NOT carry an entry point to the usable-assets date query — that view is reached from Settings. The hero card answers "我现在值多少", not "某天我能花多少"; putting both on one card makes it a dashboard of dashboards.

The total net worth figure SHALL be numerically unchanged by the introduction of the available/restricted split.

#### Scenario: Net worth card renders with gradient

- **WHEN** the Dashboard loads with accounts present
- **THEN** the hero card SHALL display a gradient from the theme's primary color to a darker shade, with the net worth amount in display-large typography (36px, weight 700)

#### Scenario: Breakdown row shows available and restricted separately

- **WHEN** the user holds ¥50,000 in available accounts and ¥80,000 in a provident fund
- **THEN** the stat row SHALL display 可用 ¥50,000 and 受限 ¥80,000 as separate items, and the total net worth SHALL include both

#### Scenario: Restricted item hidden when empty

- **WHEN** the user has no accounts whose type is in `RESTRICTED_ACCOUNT_TYPES`
- **THEN** the 受限 stat item SHALL NOT be rendered, and the stat row SHALL fall back to the available / valuations layout

#### Scenario: Goal progress display

- **WHEN** a net worth goal is set and current net worth is 60% of the goal
- **THEN** the card SHALL display a progress bar filled to 60% with white fill on semi-transparent track, and text showing "60% / ¥500K"

#### Scenario: No usable-assets row on the hero card

- **WHEN** the hero card renders
- **THEN** it SHALL NOT display a "今日可用" row or any other control that navigates to the usable-assets view

### Requirement: Goal projection calculator

The Dashboard SHALL estimate when the user will reach their net worth goal using **known cash flows as the primary driver and historical linear regression as the residual term**:

```
projected(D) = netWorth(today) + Σ monthlyNetInflow(month) + residualSlope × months
```

`monthlyNetInflow` SHALL sum the monthly equivalents of recorded income, household expenses and asset-attached recurring expenses effective in each month from the month after the current month through `D`'s month. `residualSlope` SHALL be the slope of linear regression over the last 6 net worth data points, and SHALL be permitted to be negative. The projection SHALL display an estimated achievement date and a brief explanation that separates the known cash flow contribution from the residual. A detailed formula explanation SHALL be available via `GoalProjectionExplainer` bottom sheet.

The system SHALL distinguish three outcomes explicitly rather than silently displaying nothing: achievable (show date), not achievable at current run-rate (show the gap and the monthly net inflow), and insufficient data.

#### Scenario: Projection with positive growth

- **WHEN** user has a net worth goal of ¥500,000, current net worth is ¥300,000, and the last 6 data points show consistent monthly growth of ¥10,000 with no cash flows recorded
- **THEN** the system SHALL estimate achievement in approximately 20 months and display the projected date, matching the pre-change behaviour when no cash flows exist

#### Scenario: Cash flows dominate a flat history

- **WHEN** current net worth is ¥300,000, the goal is ¥500,000, the last 6 data points are flat (residualSlope ≈ 0), and recorded cash flows produce a net inflow of ¥10,000/month
- **THEN** the system SHALL estimate achievement in approximately 20 months and SHALL NOT report the goal as unreachable

#### Scenario: Negative residual with positive cash flow

- **WHEN** the historical residual slope is −¥3,000/month but known cash flows contribute +¥12,000/month
- **THEN** the system SHALL project using a net +¥9,000/month and SHALL display both components in the explanation

#### Scenario: Projection with negative or zero growth

- **WHEN** the sum of monthly net inflow and residual slope is zero or negative and the goal is not yet reached
- **THEN** the system SHALL NOT display a projected achievement date, and SHALL state that the goal is unreachable at the current run-rate, showing the remaining gap and the current monthly net inflow

#### Scenario: Insufficient data

- **WHEN** fewer than 2 historical net worth data points exist and no cash flows are recorded
- **THEN** the system SHALL indicate that more data is needed, rather than displaying a date or an empty area

#### Scenario: Explanation separates the two terms

- **WHEN** user opens `GoalProjectionExplainer`
- **THEN** it SHALL show the known monthly net inflow and the residual monthly growth as separate labelled lines summing to the projected monthly growth

#### Scenario: Goal already achieved

- **WHEN** current net worth exceeds the goal
- **THEN** the projection section SHALL indicate the goal has been reached
