## Purpose

账户是「我有多少钱」这个核心问题的数据载体。本能力覆盖账户的增删改查、余额快照与历史回溯，以及按流动性（可用 / 受限 / 负债）的分组与口径——流动性由账户类型与到期日携带语义，不依赖任何用户开关。
## Requirements
### Requirement: Display account overview

The system SHALL display a list of all accounts with their current balances and last update dates, plus a total liquid assets summary. The account list SHALL use the shared Card and ListItem components from the UI component library. Each account card SHALL display a Lucide icon for the account type instead of an emoji. The total balance hero card SHALL use the shared Card component with the theme's primary color background. The total balance amount SHALL be tappable to open the balance update history. Each individual account card SHALL NOT display a standalone "更新余额" button; instead the account balance value SHALL be tappable to open the balance update dialog.

The account list SHALL be grouped into **可用** (available), **受限** (restricted) and **负债** (liability) sections using the same classification as the dashboard and the net worth calculation, each section with its own subtotal. Empty sections SHALL NOT be rendered. Accounts carrying a maturity date SHALL display that date as a secondary marker on the card, and accounts whose maturity date is in the future SHALL additionally display a "定期 · 未到期" badge.

#### Scenario: View account overview

- **WHEN** user opens the Accounts tab
- **THEN** system displays all accounts grouped into 可用 / 受限 / 负债 sections with a subtotal per section, each rendered as a Card component showing Lucide icon (Wallet/CreditCard/Smartphone/Banknote/TrendingUp/Landmark/MoreHorizontal), name, type label, current balance in headline typography (tappable to update balance), plus a themed total balance Card at the top with a tappable balance amount

#### Scenario: Provident fund appears in the restricted section

- **WHEN** the user has an account of type `provident_fund` with balance ¥80,000
- **THEN** it SHALL be rendered under the 受限 section, and the 受限 subtotal SHALL include ¥80,000

#### Scenario: Unmatured deposit is badged

- **WHEN** an account has `maturityDate = 2027-06-30` and today is `2026-11-08`
- **THEN** its card SHALL display the maturity date and a "定期 · 未到期" badge

#### Scenario: Matured deposit loses the badge

- **WHEN** today is on or after an account's `maturityDate`
- **THEN** the "定期 · 未到期" badge SHALL NOT be displayed, while the maturity date marker MAY remain

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

#### Scenario: Balance history total still spans all sections

- **WHEN** user opens the balance update history from the hero card
- **THEN** each history entry's total SHALL continue to sum the latest balances of ALL active accounts across all three sections, so that it stays consistent with the hero card total

### Requirement: Add and manage accounts

The system SHALL allow users to add accounts with name, type, optional icon, and an optional maturity date using a Bottom Sheet modal. The add/edit forms SHALL use the shared TextInput, Button, and Chip components. Account type selection SHALL use a grid of Chip components with Lucide icons, and SHALL include the `provident_fund` type labelled "公积金".

The form SHALL NOT contain any control for including or excluding the account from net worth — liquidity is determined solely by account type.

#### Scenario: Add a new account via bottom sheet

- **WHEN** user taps "Add Account" button
- **THEN** a Bottom Sheet SHALL slide up with a form containing a TextInput for name, a grid of Chips for type selection (each with Lucide icon, including 公积金), an optional maturity date picker, and Cancel/Confirm Button components

#### Scenario: Select the provident fund type

- **WHEN** user selects the 公积金 chip while adding an account
- **THEN** the account SHALL be created with `type = 'provident_fund'` and SHALL be treated as restricted without any further configuration

#### Scenario: Maturity date is visible without scrolling

- **WHEN** the add or edit account sheet opens at its default snap point
- **THEN** the maturity date field SHALL be visible without scrolling — it SHALL sit directly below the account type chip grid, above the custom-icon and balance fields

#### Scenario: Maturity date hidden where it is meaningless

- **WHEN** user selects a liability type (信用卡 / 贷款) or a permanently restricted type (公积金)
- **THEN** the maturity date field SHALL NOT be rendered, since those accounts are never gated by a date

#### Scenario: Set a maturity date

- **WHEN** user sets `maturityDate = 2027-06-30` on an account
- **THEN** the value SHALL be persisted as `YYYY-MM-DD` and SHALL be editable or clearable later from the same form

#### Scenario: Maturity date is optional

- **WHEN** user creates an account without touching the maturity date field
- **THEN** `maturityDate` SHALL be stored as null and the account SHALL be treated as immediately available (subject to its type)

#### Scenario: No net-worth inclusion control

- **WHEN** the add/edit account form is rendered
- **THEN** it SHALL NOT contain any switch, checkbox, or toggle whose effect is to include or exclude the account from net worth or from liquid assets

#### Scenario: Edit an existing account via bottom sheet

- **WHEN** user long-presses an account card
- **THEN** a Bottom Sheet SHALL open with pre-filled form including the maturity date, plus an additional "Delete" Button in danger color at the bottom

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

### Requirement: Account type registry stays the single source of liquidity semantics

Adding a new restricted account type SHALL require only adding the enum member, its label, its icon mapping, and its membership in `RESTRICTED_ACCOUNT_TYPES`. It SHALL NOT require a schema change, a migration, or a new UI control.

#### Scenario: Restricted set mirrors the liability set

- **WHEN** a developer reads `src/types/enums.ts`
- **THEN** `RESTRICTED_ACCOUNT_TYPES` SHALL be declared as a `ReadonlySet<AccountType>` in the same shape and position as the existing `LIABILITY_ACCOUNT_TYPES`

#### Scenario: Buckets are exhaustive and disjoint

- **WHEN** any `AccountType` value is classified
- **THEN** it SHALL fall into exactly one of available / restricted / liability, and an unrecognised type value SHALL fall back to available rather than throwing

#### Scenario: Labels and icons exist for every type

- **WHEN** the account type grid renders
- **THEN** every member of `AccountType` SHALL have an entry in `AccountTypeLabels` and in the icon mapping, so that no chip renders with an undefined label or icon

