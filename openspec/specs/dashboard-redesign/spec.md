## ADDED Requirements

### Requirement: Redesigned net worth hero card
The Dashboard's net worth card SHALL use a gradient background derived from the theme's primary color with improved visual hierarchy. The card SHALL display: total net worth (display typography), a breakdown of liquid assets / asset valuations / unamortized costs in a horizontal stat row, and an optional goal progress indicator with a styled progress bar.

#### Scenario: Net worth card renders with gradient
- **WHEN** the Dashboard loads with accounts present
- **THEN** the hero card SHALL display a gradient from the theme's primary color to a darker shade, with the net worth amount in display-large typography (36px, weight 700)

#### Scenario: Goal progress display
- **WHEN** a net worth goal is set and current net worth is 60% of the goal
- **THEN** the card SHALL display a progress bar filled to 60% with white fill on semi-transparent track, and text showing "60% / ¥500K"

### Requirement: Asset category breakdown visualization
The Dashboard SHALL include an asset category breakdown section showing the distribution of total asset value across categories. Each category SHALL display its icon (Lucide), name, value, and percentage in a visual list with proportional bar indicators.

#### Scenario: Category breakdown renders with proportions
- **WHEN** the Dashboard has assets in 3 categories (vehicle 60%, electronics 30%, digital 10%)
- **THEN** each category row SHALL display a proportional colored bar matching its percentage, with the Lucide icon, category name, value, and percentage text

### Requirement: Interactive trend chart
The trend chart SHALL be a custom SVG-based interactive financial chart (`InteractiveTrendChart`). It SHALL support pinch-to-zoom (scale visible data window), pan-to-drag (scroll through time), and tap-for-tooltip (show exact value and date). The chart SHALL render with a gradient fill (green above starting value, red below), a dashed goal line when a net worth goal is set, Y-axis labels with compact currency format and overlap prevention, and auto-spaced X-axis labels. In fullscreen mode, the chart SHALL use native gesture handlers (via `react-native-gesture-handler` `GestureHandler`) for pan and pinch interactions, providing smooth 60fps gesture response.

#### Scenario: Pinch-to-zoom
- **WHEN** user performs a pinch gesture on the chart
- **THEN** the visible data window SHALL scale, with a minimum of 3 visible points and a maximum of all data points

#### Scenario: Pan-to-drag
- **WHEN** user drags horizontally on the chart
- **THEN** the visible data window SHALL scroll through time, constrained to the data bounds

#### Scenario: Tap for tooltip
- **WHEN** user taps on the chart area
- **THEN** a tooltip SHALL display the exact net worth value and date for the nearest data point

#### Scenario: Chart renders with theme colors
- **WHEN** the trend chart renders with data points
- **THEN** the line color SHALL match the theme's primary color, the chart background SHALL be transparent (matching the card surface), and axis labels SHALL use the secondary text color

#### Scenario: Goal line display
- **WHEN** a net worth goal is set
- **THEN** the chart SHALL render a dashed horizontal line at the goal value

#### Scenario: Fullscreen chart mode
- **WHEN** user taps the fullscreen button on the chart
- **THEN** the chart SHALL expand to fullscreen with landscape orientation lock, providing a larger view with expanded data range

#### Scenario: Fullscreen pan gesture
- **WHEN** user performs a single-finger horizontal swipe gesture on the fullscreen chart
- **THEN** the chart SHALL pan the visible time window by shifting both start and end dates proportionally to the swipe distance, constrained to the available data bounds, with the pan offset applied in real-time during the gesture (not on release)

#### Scenario: Fullscreen pinch-to-zoom gesture
- **WHEN** user performs a two-finger pinch gesture on the fullscreen chart
- **THEN** the chart SHALL scale the visible time range symmetrically around the pinch center point, with pinch-out narrowing the range (zoom in, minimum 3 data points) and pinch-in widening the range (zoom out, maximum all data points), applied in real-time during the gesture

#### Scenario: Fullscreen gesture composition
- **WHEN** user performs a pan gesture followed by a pinch gesture (or vice versa) on the fullscreen chart
- **THEN** each gesture SHALL operate on the current visible window state left by the previous gesture, allowing the user to navigate to any time sub-range through combined pan and zoom operations

#### Scenario: Empty chart state
- **WHEN** there are fewer than 2 data points for the trend chart
- **THEN** the chart area SHALL display an EmptyState with a TrendingUp icon and text "暂无趋势数据" with subtext "更新余额后会生成趋势"

### Requirement: Downsampling algorithm
The trend chart data SHALL be downsampled to a maximum of 24 data points using a peak-and-valley-preserving algorithm. This ensures smooth rendering while maintaining visual accuracy of important trend changes.

#### Scenario: Downsample with extrema preservation
- **WHEN** the raw trend data contains 100 data points
- **THEN** the system SHALL reduce to at most 24 points while preserving all local maxima and minima, producing a visually faithful representation of the original curve

### Requirement: Time range selection
The Dashboard SHALL provide time range selection with preset options (3m, 6m, 1y, YTD, all) and a custom date range picker via `TimeRangeSheet`. The preset options SHALL use Chip components for quick selection. The custom range picker SHALL use scroll-wheel year/month pickers with validation (start cannot be after end). In fullscreen mode, gesture-based pan and pinch interactions SHALL serve as an alternative method to adjust the visible time range, alongside the preset buttons.

#### Scenario: Select preset time range
- **WHEN** user taps the "6m" preset Chip
- **THEN** the trend chart SHALL recalculate to show only data from the last 6 months

#### Scenario: Select custom date range
- **WHEN** user taps the custom range option and selects 2025-06 to 2026-01 via scroll wheels
- **THEN** the trend chart SHALL display data within the selected range, with a summary showing the range and month count

#### Scenario: Fullscreen gesture updates time range display
- **WHEN** user pans or pinches the fullscreen chart to change the visible time window
- **THEN** any visible time range indicator or date labels SHALL update in real-time to reflect the current visible range

### Requirement: Goal projection calculator
The Dashboard SHALL estimate when the user will reach their net worth goal using linear regression on the last 6 net worth data points. The projection SHALL display an estimated achievement date and a brief explanation. A detailed formula explanation SHALL be available via `GoalProjectionExplainer` bottom sheet.

#### Scenario: Projection with positive growth
- **WHEN** user has a net worth goal of ¥500,000, current net worth is ¥300,000, and the last 6 data points show consistent monthly growth of ¥10,000
- **THEN** the system SHALL estimate achievement in approximately 20 months and display the projected date

#### Scenario: Projection with negative or zero growth
- **WHEN** the linear regression slope is zero or negative
- **THEN** the system SHALL NOT display a projected achievement date, and instead indicate that growth is insufficient

#### Scenario: Goal already achieved
- **WHEN** current net worth exceeds the goal
- **THEN** the projection section SHALL indicate the goal has been reached

### Requirement: Net worth goal management from dashboard
The Dashboard SHALL provide a bottom sheet (`NetWorthGoalSheet`) for setting and clearing the net worth target amount. The goal SHALL also be visible in Settings as read-only, with editing only available from the Dashboard.

#### Scenario: Set net worth goal from dashboard
- **WHEN** user taps the goal indicator and enters ¥500,000
- **THEN** the system SHALL save the goal, update the progress bar, and display a goal line on the trend chart

#### Scenario: Clear net worth goal
- **WHEN** user taps "清除目标" in the goal sheet
- **THEN** the system SHALL remove the goal, hide the progress bar, and remove the goal line from the trend chart

### Requirement: Pull-to-refresh with fortune cookie Easter egg
The Dashboard ScrollView SHALL support pull-to-refresh with the refresh indicator colored by the theme's primary color. Refreshing SHALL reload all account balances, asset data, trend data, and holding cost calculations. Additionally, pull-to-refresh SHALL randomly display one of 20 Chinese financial aphorisms (理财吉祥话) as a fun Easter egg.

#### Scenario: Pull to refresh
- **WHEN** user pulls down on the Dashboard ScrollView
- **THEN** a refresh indicator SHALL appear in the theme's primary color, all data SHALL reload, and the indicator SHALL disappear when loading completes

#### Scenario: Fortune cookie display
- **WHEN** user pulls to refresh
- **THEN** a random financial aphorism SHALL be displayed as a toast notification (e.g., "积少成多，聚沙成塔")

### Requirement: Onboarding view for first-time users
When no accounts exist, the Dashboard SHALL display an `OnboardingView` instead of the standard dashboard content. The onboarding view SHALL explain the app's core purpose (net worth tracking, holding cost calculation, privacy-first design), highlight key features with icons, and provide a CTA button to add the first account.

#### Scenario: First-time user opens app
- **WHEN** the app launches and no accounts exist in the database
- **THEN** the Dashboard SHALL display the OnboardingView with feature highlights and a "添加第一个账户" button

#### Scenario: Transition to normal dashboard
- **WHEN** user adds their first account via the onboarding CTA
- **THEN** the app SHALL navigate to the Accounts tab, and subsequent Dashboard views SHALL show the standard dashboard content

### Requirement: Holding cost summary card
The holding cost summary SHALL use the Card component with a highlighted monthly cost display and a per-asset breakdown list. Each breakdown row SHALL display the Lucide category icon, asset name, percentage bar, and cost amount.

#### Scenario: Cost breakdown with proportional bars
- **WHEN** the cost breakdown has 3 assets with costs distributed 50%, 30%, 20%
- **THEN** each row SHALL display a proportional bar filled with the theme's primary color at reduced opacity, alongside the asset icon, name, percentage, and formatted cost

### Requirement: Quick actions grid
The quick actions section SHALL display action buttons in a horizontal row using Card components with Lucide icons. Actions: "更新余额" (Wallet icon, navigates to Accounts), "添加资产" (PackagePlus icon, navigates to Assets), "导出数据" (Download icon, navigates to Settings).

#### Scenario: Quick action navigation
- **WHEN** user taps the "更新余额" quick action
- **THEN** the app SHALL navigate to the Accounts tab

#### Scenario: Quick action press feedback
- **WHEN** user presses a quick action button
- **THEN** the card SHALL provide visual press feedback (slight scale reduction or opacity change) before navigating

### Requirement: Cost-per-use ranking on dashboard
The Dashboard SHALL display a "次均成本排行" section showing assets ranked by cost-per-use in descending order. Only assets with `usageTracking` enabled AND at least one recorded use (`totalUseCount > 0`) SHALL appear in the ranking. The section SHALL display up to 3 items by default with a "查看全部" link to the full assets page.

#### Scenario: Ranking shows only tracked assets with usage
- **WHEN** the Dashboard has 5 active assets but only 3 have `usageTracking` enabled and `totalUseCount > 0`
- **THEN** the ranking SHALL display only those 3 assets, sorted by cost-per-use descending

#### Scenario: Asset without usage tracking excluded
- **WHEN** an asset has `usageTracking: false` but has `initialUseCount > 0`
- **THEN** that asset SHALL NOT appear in the cost-per-use ranking

#### Scenario: Empty ranking state
- **WHEN** no assets have `usageTracking` enabled or no assets have recorded uses
- **THEN** the section SHALL display text "还没有使用记录，去资产页记录第一次使用吧"

### Requirement: Neglect badge in ranking
Each item in the cost-per-use ranking SHALL display a neglect warning badge when the asset has been unused for 90 or more days. The badge SHALL show the warning color and text "闲置X天" where X is the number of days since last use.

#### Scenario: Neglected item in ranking
- **WHEN** a ranked asset has `daysSinceLastUse >= 90`
- **THEN** the ranking row SHALL display a warning-colored badge "闲置92天" (using actual day count) next to the asset name

#### Scenario: Active item in ranking
- **WHEN** a ranked asset has `daysSinceLastUse < 90`
- **THEN** the ranking row SHALL NOT display any neglect badge

## REMOVED Requirements

### Requirement: Cost-per-use tab toggle
**Reason**: Replaced by a single ranking list that integrates neglect information inline
**Migration**: The "最贵单次" and "闲置提醒" tabs are removed; their functionality is merged into the single cost-per-use ranking with inline neglect badges
