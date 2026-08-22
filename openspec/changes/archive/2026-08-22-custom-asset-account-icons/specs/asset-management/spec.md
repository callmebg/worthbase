## MODIFIED Requirements

### Requirement: Asset list view
The system SHALL display all assets grouped by category using the shared Card, Chip, and EmptyState components. Each asset card SHALL display a Lucide icon — using the asset's custom icon if set, otherwise falling back to the category default icon. The category group headers SHALL use the category default Lucide icons. The status filter SHALL use the shared Chip component for filter toggles. The FAB SHALL use the shared FAB component with Lucide icon.

#### Scenario: View asset list with custom icons
- **WHEN** user opens the Assets tab and an asset has a custom icon set (e.g., "Bike" for a bicycle in the "vehicle" category)
- **THEN** the asset card SHALL display the "Bike" icon instead of the default "Car" icon for the vehicle category

#### Scenario: View asset list with default icons
- **WHEN** user opens the Assets tab and an asset has no custom icon set (icon is null)
- **THEN** the asset card SHALL display the default icon for its category (e.g., "Car" for vehicle, "Smartphone" for electronics)

#### Scenario: Filter assets using chip component
- **WHEN** user taps the "使用中" filter Chip
- **THEN** the Chip SHALL become selected (primary color background) and only active assets SHALL display; other Chips SHALL show as unselected

#### Scenario: Empty asset list with EmptyState
- **WHEN** there are no assets in the selected filter
- **THEN** the EmptyState component SHALL display with a Package Lucide icon, primary text "暂无资产", and secondary text "点击下方按钮添加第一个资产"

### Requirement: Add a new asset
The add asset form SHALL use a Bottom Sheet modal with the shared TextInput, Button, Chip, and DatePickerField components. The 3-step progressive form SHALL use a visual step indicator with theme-colored progress. Category selection SHALL use Chips with Lucide icons. In full mode (not quick mode), a "自定义图标" button SHALL be displayed after the category selection, allowing the user to open an IconPickerSheet to select a custom icon for the asset.

#### Scenario: Add asset via bottom sheet wizard
- **WHEN** user taps the FAB "添加资产"
- **THEN** system displays the overview Card with stats, a row of filter Chips (全部/使用中/退役/已售), and assets grouped by category with Lucide category icons in headers and Lucide icons on each asset card

#### Scenario: Select custom icon during asset creation
- **WHEN** user is in full mode (step 1) and taps "自定义图标" after selecting a category
- **THEN** the IconPickerSheet SHALL open, and upon selecting and confirming an icon, the button SHALL update to show the selected icon with a label indicating the custom icon name

#### Scenario: Custom icon persisted with new asset
- **WHEN** user creates an asset with a custom icon "Laptop" in the "electronics" category
- **THEN** the asset SHALL be saved with `icon: "Laptop"`, and all views displaying this asset SHALL show the "Laptop" icon instead of the default "Smartphone"

#### Scenario: No custom icon selected during creation
- **WHEN** user creates an asset without selecting a custom icon
- **THEN** the asset SHALL be saved with `icon: null`, and the asset SHALL display the default icon for its category

### Requirement: Asset lifecycle management
Lifecycle action buttons (retire, sell, restore) in the asset detail view SHALL use the shared Button component with appropriate variants: primary for confirm actions, danger-colored outlined for destructive actions, text for secondary actions. The asset detail header SHALL display the asset's custom icon if set, otherwise the category default icon.

#### Scenario: Asset detail shows custom icon
- **WHEN** user views the detail page of an asset that has a custom icon "Bike" set
- **THEN** the detail header SHALL display the "Bike" icon instead of the default category icon

#### Scenario: Retire asset with themed buttons
- **WHEN** user views an active asset's detail page
- **THEN** the "Retire" action SHALL display as an outlined Button with warning color, and the "Sell" action SHALL display as an outlined Button with danger color

### Requirement: Edit an existing asset
The edit asset form SHALL pre-fill the custom icon field from the existing asset's data. The user SHALL be able to change or clear the custom icon using the same IconPickerSheet used during creation. Saving the edit SHALL persist the updated icon value.

#### Scenario: Edit asset with existing custom icon
- **WHEN** user opens the edit form for an asset that has `icon: "Bike"`
- **THEN** the "自定义图标" button SHALL display the "Bike" icon with its name, and tapping it SHALL open the IconPickerSheet with "Bike" pre-selected

#### Scenario: Clear custom icon during edit
- **WHEN** user taps "使用默认图标" in the IconPickerSheet while editing an asset
- **THEN** the custom icon SHALL be cleared (`icon: null`), and the asset SHALL revert to displaying the category default icon

## ADDED Requirements

### Requirement: Asset icon database field
The `assets` table SHALL include an `icon TEXT` column (nullable, default NULL) to store the user-selected custom Lucide icon name. The `AssetRepository` SHALL read and write this field in all CRUD operations.

#### Scenario: New column in database
- **WHEN** the app runs the database migration for the icon field
- **THEN** the `assets` table SHALL have a new `icon TEXT` column with NULL default, and all existing assets SHALL have `icon = NULL`

#### Scenario: Repository persists custom icon
- **WHEN** an asset is created with `icon: "Bike"` via the repository
- **THEN** reading the asset back SHALL return `icon: "Bike"`

### Requirement: Asset icon resolution
The system SHALL provide a `resolveAssetIcon` utility function that takes an asset's `icon` and `category` fields and returns the icon name to display. The resolution order SHALL be: custom icon (if non-null and valid) → category default icon → "Package" fallback.

#### Scenario: Resolve with custom icon
- **WHEN** `resolveAssetIcon` is called with `icon: "Bike"` and `category: "vehicle"`
- **THEN** it SHALL return `"Bike"`

#### Scenario: Resolve with null custom icon
- **WHEN** `resolveAssetIcon` is called with `icon: null` and `category: "vehicle"`
- **THEN** it SHALL return `"Car"` (the default for vehicle category)

#### Scenario: Resolve with invalid custom icon
- **WHEN** `resolveAssetIcon` is called with `icon: "NonExistentIcon"` and `category: "vehicle"`
- **THEN** it SHALL return `"Car"` (the default for vehicle category) because the icon name is not in the registry
