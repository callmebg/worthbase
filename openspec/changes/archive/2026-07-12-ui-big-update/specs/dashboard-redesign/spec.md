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

### Requirement: Improved trend chart
The trend chart SHALL use improved styling with theme-aware colors, better axis labels, and interactive data points. The time range toggle (半年/一年/两年) SHALL use the Chip component from the shared component library.

#### Scenario: Chart renders with theme colors
- **WHEN** the trend chart renders with data points
- **THEN** the line color SHALL match the theme's primary color, the chart background SHALL be transparent (matching the card surface), and axis labels SHALL use the secondary text color

#### Scenario: Empty chart state
- **WHEN** there are fewer than 2 data points for the trend chart
- **THEN** the chart area SHALL display an EmptyState with a TrendingUp icon and text "暂无趋势数据" with subtext "更新余额后会生成趋势"

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

### Requirement: Pull-to-refresh with themed indicator
The Dashboard ScrollView SHALL support pull-to-refresh with the refresh indicator colored by the theme's primary color. Refreshing SHALL reload all account balances, asset data, trend data, and holding cost calculations.

#### Scenario: Pull to refresh
- **WHEN** user pulls down on the Dashboard ScrollView
- **THEN** a refresh indicator SHALL appear in the theme's primary color, all data SHALL reload, and the indicator SHALL disappear when loading completes
