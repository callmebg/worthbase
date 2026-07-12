## MODIFIED Requirements

### Requirement: Theme color picker
The system SHALL display theme color options as circular color swatches using `TouchableOpacity` and `View` components, not Paper Button. Each swatch SHALL display its actual theme color as background. The currently selected color SHALL display a white check icon (Lucide `Check`). Unselected swatches SHALL display only the color without a check icon.

### Requirement: Currency symbol options
The system SHALL provide a list of unique currency symbols for user selection. The list SHALL NOT contain duplicate entries. The available currencies SHALL include at minimum: Chinese Yuan (¥), US Dollar ($), Euro (€), British Pound (£), Korean Won (₩), and Japanese Yen (¥).
