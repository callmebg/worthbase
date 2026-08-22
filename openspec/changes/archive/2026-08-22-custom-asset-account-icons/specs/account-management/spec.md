## MODIFIED Requirements

### Requirement: Display account overview
The system SHALL display a list of all accounts with their current balances and last update dates, plus a total liquid assets summary. The account list SHALL use the shared Card and ListItem components from the UI component library. Each account card SHALL display a Lucide icon — using the account's custom icon if set, otherwise falling back to the account type default icon. The total balance hero card SHALL use the shared Card component with the theme's primary color background. The total balance amount SHALL be tappable to open the balance update history. Each individual account card SHALL NOT display a standalone "更新余额" button; instead the account balance value SHALL be tappable to open the balance update dialog.

#### Scenario: View account with custom icon
- **WHEN** user opens the Accounts tab and an account has a custom icon set (e.g., "Building2" for a WeChat account used as company account)
- **THEN** the account card SHALL display the "Building2" icon instead of the default "MessageCircle" icon for the WeChat type

#### Scenario: View account with default icon
- **WHEN** user opens the Accounts tab and an account has no custom icon set (icon is null)
- **THEN** the account card SHALL display the default icon for its type (e.g., "MessageCircle" for WeChat, "Wallet" for Alipay)

#### Scenario: Tap total balance to view history
- **WHEN** user taps the total balance amount on the hero card
- **THEN** the BalanceHistorySheet SHALL open showing balance update history

#### Scenario: Tap account balance to update
- **WHEN** user taps the balance value displayed on an individual account card
- **THEN** the UpdateBalanceSheet SHALL open for that account

#### Scenario: Account card has no standalone update button
- **WHEN** an account card renders in the account list
- **THEN** the card SHALL NOT contain a separate "更新余额" AppButton

#### Scenario: Account list in dark mode
- **WHEN** user views the account list in dark mode
- **THEN** all account cards SHALL use the dark theme's surface color, text colors SHALL use the dark theme tokens, and the total balance card SHALL use the dark-adapted primary color

### Requirement: Add and manage accounts
The system SHALL allow users to add accounts with name, type, and optional custom icon using a Bottom Sheet modal. The add/edit forms SHALL use the shared TextInput, Button, and Chip components. Account type selection SHALL use a grid of Chip components with Lucide icons. A "自定义图标" button SHALL be displayed after the type selection, allowing the user to open an IconPickerSheet to select a custom icon.

#### Scenario: Add account with custom icon
- **WHEN** user taps the "自定义图标" button in the add account form and selects an icon (e.g., "Building2") from the IconPickerSheet
- **THEN** the account SHALL be created with `icon: "Building2"`, and the account card SHALL display "Building2" instead of the type default icon

#### Scenario: Add account without custom icon
- **WHEN** user creates an account without selecting a custom icon
- **THEN** the account SHALL be created with `icon: null`, and SHALL display the default icon for its type

#### Scenario: Edit account icon
- **WHEN** user long-presses an account card to open the edit form
- **THEN** the form SHALL display the current icon (custom or default) and allow changing it via the IconPickerSheet

#### Scenario: Clear custom icon on account
- **WHEN** user selects "使用默认图标" in the IconPickerSheet while editing an account
- **THEN** the account's icon SHALL be set to null, and the account SHALL display the default icon for its type

### Requirement: Account icon resolution
The system SHALL provide a `resolveAccountIcon` utility function that takes an account's `icon` and `type` fields and returns the icon name to display. The resolution order SHALL be: custom icon (if non-null and valid) → type default icon → "CreditCard" fallback.

#### Scenario: Resolve with custom icon
- **WHEN** `resolveAccountIcon` is called with `icon: "Building2"` and `type: "wechat"`
- **THEN** it SHALL return `"Building2"`

#### Scenario: Resolve with null custom icon
- **WHEN** `resolveAccountIcon` is called with `icon: null` and `type: "wechat"`
- **THEN** it SHALL return `"MessageCircle"` (the default for WeChat type)

#### Scenario: Resolve with invalid custom icon
- **WHEN** `resolveAccountIcon` is called with `icon: "NonExistentIcon"` and `type: "wechat"`
- **THEN** it SHALL return `"MessageCircle"` (the default for WeChat type) because the icon name is not in the registry
