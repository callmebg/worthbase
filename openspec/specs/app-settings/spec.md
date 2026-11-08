## Purpose

应用级外观与区域偏好的持久化设置。当前覆盖主题色与货币符号；两者都必须立即作用于全 App，且不依赖重启。

## Requirements

### Requirement: Theme color picker
The system SHALL display theme color options as circular color swatches using `TouchableOpacity` and `View` components, not Paper Button. Each swatch SHALL display its actual theme color as background. The currently selected color SHALL display a white check icon (Lucide `Check`). Unselected swatches SHALL display only the color without a check icon.

### Requirement: Currency symbol options
The system SHALL provide a list of unique currency symbols for user selection. The list SHALL NOT contain duplicate entries. The available currencies SHALL include at minimum: Chinese Yuan (¥), US Dollar ($), Euro (€), British Pound (£), Korean Won (₩), and Japanese Yen (¥).
