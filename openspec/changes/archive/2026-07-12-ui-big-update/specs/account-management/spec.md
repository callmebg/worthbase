## MODIFIED Requirements

### Requirement: Display account overview
The system SHALL display a list of all accounts with their current balances and last update dates, plus a total liquid assets summary. The account list SHALL use the shared Card and ListItem components from the UI component library. Each account card SHALL display a Lucide icon for the account type instead of an emoji. The total balance hero card SHALL use the shared Card component with the theme's primary color background.

#### Scenario: View account overview
- **WHEN** user opens the Accounts tab
- **THEN** system displays all accounts sorted by type, each rendered as a Card component showing Lucide icon (Wallet/CreditCard/Smartphone/Banknote/TrendingUp/MoreHorizontal), name, type label, current balance in headline typography, and an "Update" button using the shared Button component, plus a themed total balance Card at the top

#### Scenario: Account list in dark mode
- **WHEN** user views the account list in dark mode
- **THEN** all account cards SHALL use the dark theme's surface color, text colors SHALL use the dark theme tokens, and the total balance card SHALL use the dark-adapted primary color

### Requirement: Add and manage accounts
The system SHALL allow users to add accounts with name, type, and optional icon using a Bottom Sheet modal. The add/edit forms SHALL use the shared TextInput, Button, and Chip components. Account type selection SHALL use a grid of Chip components with Lucide icons.

#### Scenario: Add a new account via bottom sheet
- **WHEN** user taps "Add Account" button
- **THEN** a Bottom Sheet SHALL slide up with a form containing a TextInput for name, a grid of Chips for type selection (each with Lucide icon), and Cancel/Confirm Button components

#### Scenario: Edit an existing account via bottom sheet
- **WHEN** user long-presses an account card
- **THEN** a Bottom Sheet SHALL open with pre-filled form, including an additional "Delete" Button in danger color at the bottom

### Requirement: Manually update account balance
The system SHALL allow users to manually update the balance of any account at any time. The update form SHALL use a Bottom Sheet modal with the shared TextInput component for balance entry.

#### Scenario: Update balance via bottom sheet
- **WHEN** user taps "Update" on an account card
- **THEN** a Bottom Sheet SHALL slide up showing the account name, current balance, a TextInput for the new balance (decimal-pad keyboard), and Cancel/Save Button components

### Requirement: View balance update history
The system SHALL display balance update history in a Bottom Sheet modal using the shared ListItem component for each history entry.

#### Scenario: View balance history
- **WHEN** user taps "Balance History" button
- **THEN** a Bottom Sheet SHALL slide up showing a FlatList of history entries, each as a ListItem with date as title and total balance as right element, sorted by date descending
