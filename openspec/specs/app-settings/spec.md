## Purpose

应用级外观与区域偏好的持久化设置。当前覆盖主题色与货币符号；两者都必须立即作用于全 App，且不依赖重启。

## Requirements

### Requirement: Theme color picker
The system SHALL display theme color options as circular color swatches using `TouchableOpacity` and `View` components, not Paper Button. Each swatch SHALL display its actual theme color as background. The currently selected color SHALL display a white check icon (Lucide `Check`). Unselected swatches SHALL display only the color without a check icon.

#### Scenario: Swatches render as colored circles
- **WHEN** user opens Settings and views the theme color section
- **THEN** each option SHALL render as a circular swatch built from `TouchableOpacity` + `View` (not Paper Button), with its actual theme color as the background

#### Scenario: Only the selected swatch shows a check
- **WHEN** the current theme color is one of the options
- **THEN** that swatch SHALL display a white Lucide `Check` icon, and every unselected swatch SHALL display only its color with no icon

### Requirement: Currency symbol options
The system SHALL provide a list of unique currency symbols for user selection. The list SHALL NOT contain duplicate entries. The available symbols SHALL include at minimum: ¥ (shared by Chinese Yuan and Japanese Yen), US Dollar ($), Euro (€), British Pound (£), and Korean Won (₩).

> 原文曾把「Chinese Yuan (¥)」与「Japanese Yen (¥)」并列为两个必含项，与同一条要求里的
> 「SHALL NOT contain duplicate entries」自相矛盾——两者是同一个字形。实现
> （`app/settings.tsx` 的 `CURRENCY_OPTIONS`）一直是去重后的 5 项，此处按实现修正措辞，
> 不改变任何行为。

#### Scenario: No duplicate symbols
- **WHEN** the currency symbol list is rendered
- **THEN** every entry SHALL be visually distinct, with no symbol appearing twice

#### Scenario: Minimum coverage
- **WHEN** user opens the currency symbol options
- **THEN** the list SHALL include at minimum ¥ (CNY, and JPY which shares the same glyph), $, €, £ and ₩

