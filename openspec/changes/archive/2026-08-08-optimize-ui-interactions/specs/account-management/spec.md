## MODIFIED Requirements

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
