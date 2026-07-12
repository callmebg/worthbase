## MODIFIED Requirements

### Requirement: Asset list view
The system SHALL display all assets grouped by category using the shared Card, Chip, and EmptyState components. Each asset card SHALL display a Lucide icon for the category, and status badges SHALL use the Chip component with theme-aware status colors. The category group headers SHALL use Lucide icons instead of emoji. The status filter SHALL use the shared Chip component for filter toggles. The FAB SHALL use the shared FAB component with Lucide icon.

#### Scenario: View asset list with new components
- **WHEN** user opens the Assets tab
- **THEN** system displays the overview Card with stats, a row of filter Chips (全部/使用中/退役/已售), and assets grouped by category with Lucide category icons in headers and Lucide icons on each asset card

#### Scenario: Filter assets using chip component
- **WHEN** user taps the "使用中" filter Chip
- **THEN** the Chip SHALL become selected (primary color background) and only active assets SHALL display; other Chips SHALL show as unselected

#### Scenario: Empty asset list with EmptyState
- **WHEN** there are no assets in the selected filter
- **THEN** the EmptyState component SHALL display with a Package Lucide icon, primary text "暂无资产", and secondary text "点击下方按钮添加第一个资产"

### Requirement: Add a new asset
The add asset form SHALL use a Bottom Sheet modal with the shared TextInput, Button, Chip, and DatePickerField components. The 3-step progressive form SHALL use a visual step indicator with theme-colored progress. Category selection SHALL use Chips with Lucide icons.

#### Scenario: Add asset via bottom sheet wizard
- **WHEN** user taps the FAB "添加资产"
- **THEN** a full-height Bottom Sheet SHALL open with a 3-step wizard using shared TextInput (name, price), Chip grid (category with Lucide icons), DatePickerField (purchase date), and Button components for navigation between steps

### Requirement: Monthly holding cost summary
The holding cost summary on the asset page SHALL use the shared Card component. The overview stats row SHALL display with display-level typography for values.

#### Scenario: Asset overview card renders with design tokens
- **WHEN** the Assets tab loads with active assets
- **THEN** the overview Card SHALL display total valuation, monthly cost, and asset count using headline typography for values and label typography for descriptions, all colored with theme tokens

### Requirement: Asset lifecycle management
Lifecycle action buttons (retire, sell, restore) in the asset detail view SHALL use the shared Button component with appropriate variants: primary for confirm actions, danger-colored outlined for destructive actions, text for secondary actions.

#### Scenario: Retire asset with themed buttons
- **WHEN** user views an active asset's detail page
- **THEN** the "Retire" action SHALL display as an outlined Button with warning color, and the "Sell" action SHALL display as an outlined Button with danger color
