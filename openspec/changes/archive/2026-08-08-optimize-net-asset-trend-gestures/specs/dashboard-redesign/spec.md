## MODIFIED Requirements

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
