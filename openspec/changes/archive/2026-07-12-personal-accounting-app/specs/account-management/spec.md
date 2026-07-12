## ADDED Requirements

### Requirement: Add and manage accounts
The system SHALL allow users to add accounts with name, type (微信/支付宝/银行卡/现金/基金/其他), and optional icon. Users SHALL be able to edit and delete accounts.

#### Scenario: Add a new account
- **WHEN** user taps "Add Account", enters name "微信支付", selects type "微信", confirms
- **THEN** system creates the account with zero balance and displays it in the account list

#### Scenario: Delete an account
- **WHEN** user deletes an account that has balance history
- **THEN** system shows a confirmation dialog and only deletes after user confirms; all related balance snapshots are also deleted

#### Scenario: Edit an existing account
- **WHEN** user long-presses an account and selects "Edit"
- **THEN** system shows an edit form pre-filled with the account's current name and type, and updates the account on save

### Requirement: Manually update account balance
The system SHALL allow users to manually update the balance of any account at any time. Each update SHALL be stored as a balance snapshot with a timestamp.

#### Scenario: Update balance
- **WHEN** user taps "Update" on the "微信支付" account, enters new balance ¥2,500, confirms
- **THEN** system stores a balance snapshot {account_id, balance: 2500, snapshot_date: today} and updates the displayed balance

#### Scenario: Update multiple accounts at once
- **WHEN** user selects "Update all" and enters new balances for multiple accounts
- **THEN** system stores a snapshot for each account with the same timestamp

### Requirement: Display account overview
The system SHALL display a list of all accounts with their current balances and last update dates, plus a total liquid assets summary.

#### Scenario: View account overview
- **WHEN** user opens the Accounts tab
- **THEN** system displays all accounts sorted by type, each showing name, current balance, last update date, and an update button, plus a total balance at the top

### Requirement: View balance update history
The system SHALL display a historical table of balance updates showing date, per-account balances, and total.

#### Scenario: View balance history
- **WHEN** user scrolls to the balance history section
- **THEN** system displays a table with columns for date and each account's balance at that date, plus the total, sorted by date descending
