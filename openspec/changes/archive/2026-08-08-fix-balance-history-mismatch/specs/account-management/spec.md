## MODIFIED Requirements

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
