## Requirements

### Requirement: Display account overview
The system SHALL display a list of all accounts with their current balances and last update dates, plus a total liquid assets summary. The account list SHALL use the shared Card and ListItem components from the UI component library. Each account card SHALL display a Lucide icon for the account type instead of an emoji. The total balance hero card SHALL use the shared Card component with the theme's primary color background. The total balance amount SHALL be tappable to open the balance update history. Each individual account card SHALL NOT display a standalone "更新余额" button; instead the account balance value SHALL be tappable to open the balance update dialog.

#### Scenario: View account overview
- **WHEN** user opens the Accounts tab
- **THEN** system displays all accounts sorted by type, each rendered as a Card component showing Lucide icon (Wallet/CreditCard/Smartphone/Banknote/TrendingUp/MoreHorizontal), name, type label, current balance in headline typography (tappable to update balance), plus a themed total balance Card at the top with a tappable balance amount

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
- **WHEN** user taps the balance value on an account card
- **THEN** a Bottom Sheet SHALL slide up showing the account name, current balance, a TextInput for the new balance (decimal-pad keyboard), and Cancel/Save Button components

### Requirement: View balance update history
The system SHALL display balance update history in a Bottom Sheet modal. Each history entry SHALL show the date and the total balance calculated as the sum of all active accounts' latest balances as of that date (not only accounts updated on that exact date). The history SHALL use the shared ListItem component for each entry.

#### Scenario: View balance history
- **WHEN** user taps "Balance History" button
- **THEN** a Bottom Sheet SHALL slide up showing a list of history entries, each displaying the date and the total balance as of that date (sum of all active accounts' most recent balance on or before that date), sorted by date descending

#### Scenario: Balance history consistency with account total
- **WHEN** the most recent history entry's date matches the current date
- **THEN** that entry's total balance SHALL equal the "Account Balance Total" shown on the account overview hero card

#### Scenario: Balance history after partial update
- **WHEN** user has multiple accounts but only updates one account's balance on a given day
- **THEN** the history entry for that day SHALL still include the latest known balances of ALL other active accounts, not just the updated one
