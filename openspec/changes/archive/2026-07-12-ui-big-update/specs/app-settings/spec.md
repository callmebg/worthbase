## MODIFIED Requirements

### Requirement: Theme and appearance
The system SHALL support light/dark mode and multiple theme colors through the centralized design token system and Paper's theme provider. The settings page SHALL use the shared ListItem component for all settings rows, the shared Card component for sections, and the shared Chip component for color/mode/currency selectors. The theme color picker SHALL display color swatches using the shared Button component with selected state.

#### Scenario: Settings page renders with shared components
- **WHEN** user opens the Settings tab
- **THEN** all sections (Security, Appearance, Goal, Data, About) SHALL be rendered as Card components, each setting row SHALL be a ListItem with Lucide icons, and all toggles SHALL use Paper's Switch component with theme-aware track colors

#### Scenario: Theme color selection with new components
- **WHEN** user taps a color swatch in the Appearance section
- **THEN** the selected swatch SHALL display a check icon (Lucide Check) with a border ring, and the theme SHALL update immediately across all components using the design token system

#### Scenario: Dark mode selector with chip component
- **WHEN** user taps "深色" in the dark mode selector
- **THEN** the "深色" Chip SHALL become selected with primary color, other options SHALL become unselected, and the app SHALL immediately switch to dark theme

### Requirement: App security lock
The PIN setup dialog SHALL use a Bottom Sheet modal with the shared TextInput and Button components. The PIN input SHALL use the secure TextInput variant with number-pad keyboard.

#### Scenario: Enable app lock via bottom sheet
- **WHEN** user toggles "App Lock" on
- **THEN** a Bottom Sheet SHALL slide up with title "设置 PIN 码", a secure TextInput for PIN entry, and Cancel/Confirm Button components

#### Scenario: Lock screen uses design tokens
- **WHEN** the lock screen is displayed
- **THEN** the PIN pad buttons, background, and text SHALL all use design token colors, adapting to light/dark mode and the selected theme color

### Requirement: Net worth goal configuration
The goal input section SHALL use the shared TextInput and Button components within a Card section.

#### Scenario: Set goal with shared input
- **WHEN** user enters a goal amount and taps "Save"
- **THEN** the TextInput SHALL clear, a success indicator SHALL display, and the updated goal SHALL appear as formatted currency with a "Clear" text button in danger color

### Requirement: Data management
All data management actions (export JSON, export CSV, import JSON, backup management) SHALL use ListItem components with Lucide icons (FileJson, FileSpreadsheet, FileDown, HardDrive). The backup list SHALL display in a Bottom Sheet modal.

#### Scenario: Data settings with Lucide icons
- **WHEN** user views the Data section
- **THEN** each row SHALL display a Lucide icon on the left, title and description text in the middle, and a chevron-right icon on the right, all as ListItem components

#### Scenario: Backup management in bottom sheet
- **WHEN** user taps "Backup Management"
- **THEN** a Bottom Sheet SHALL slide up showing a list of backup files, each with timestamp and a "Restore" Button, using ListItem components
