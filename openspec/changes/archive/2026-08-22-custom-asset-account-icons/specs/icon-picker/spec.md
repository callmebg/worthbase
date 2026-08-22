## ADDED Requirements

### Requirement: Icon picker sheet component
The system SHALL provide a reusable `IconPickerSheet` component that displays a grid of selectable Lucide icons inside a BottomSheet. The sheet SHALL include a search text input at the top for filtering icons by name. Icons SHALL be displayed in a 4-column scrollable grid. Each icon SHALL be rendered using the shared `Icon` component with a consistent size. The currently selected icon SHALL be visually highlighted with the primary color background.

#### Scenario: Open icon picker
- **WHEN** user taps the "自定义图标" button in an asset or account form
- **THEN** the IconPickerSheet SHALL open as a BottomSheet displaying all available icons in a 4-column grid with a search input at the top

#### Scenario: Search icons by keyword
- **WHEN** user types "car" in the search input
- **THEN** the grid SHALL filter to show only icons whose names contain "car" (case-insensitive), such as "Car", "CarFront", "CarTaxiFront"

#### Scenario: Select an icon
- **WHEN** user taps an icon in the grid
- **THEN** the icon SHALL be visually highlighted with primary color background, and the sheet SHALL display a "确认" button that, when tapped, SHALL close the sheet and return the selected icon name to the parent form

#### Scenario: Cancel icon selection
- **WHEN** user taps the "取消" button or dismisses the sheet
- **THEN** the sheet SHALL close without changing the current icon selection

### Requirement: Icon category browsing
The IconPickerSheet SHALL organize icons into 12 named categories using four-character Chinese labels: 常用精选, 交通出行, 建筑房产, 科技数码, 家居家电, 穿戴配饰, 金融财务, 餐饮美食, 运动户外, 文娱休闲, 工具器械, 自然杂项. A horizontal scrollable row of category chips SHALL be displayed between the search input and the icon grid. The "常用精选" category SHALL be selected by default when the sheet opens. Selecting a category SHALL filter the grid to show only icons in that category.

#### Scenario: Browse by category
- **WHEN** user taps the "财务" category chip
- **THEN** the grid SHALL display only icons belonging to the "财务" category (e.g., Wallet, CreditCard, Banknote, DollarSign, TrendingUp)

#### Scenario: Default category on open
- **WHEN** the IconPickerSheet opens
- **THEN** the "常用精选" category SHALL be pre-selected and its icons displayed in the grid

### Requirement: Reset to default icon
The IconPickerSheet SHALL include a "使用默认图标" option at the top of the icon grid. When selected, the system SHALL clear the custom icon and revert to the default icon for the asset's category or the account's type.

#### Scenario: Reset custom icon to default
- **WHEN** user taps "使用默认图标" and confirms
- **THEN** the icon selection SHALL be cleared (set to null), and the asset/account SHALL display the default icon based on its category/type

### Requirement: Current icon preview
The IconPickerSheet SHALL display the currently selected icon (or the default icon if none is custom) at the top of the sheet, alongside the search input. This preview SHALL update immediately when the user taps a different icon.

#### Scenario: Preview current selection
- **WHEN** the icon picker opens with a previously selected custom icon "Bike"
- **THEN** the preview area SHALL display the "Bike" icon with the label "当前: Bike"

#### Scenario: Preview updates on tap
- **WHEN** user taps the "Car" icon in the grid
- **THEN** the preview area SHALL immediately update to show the "Car" icon
