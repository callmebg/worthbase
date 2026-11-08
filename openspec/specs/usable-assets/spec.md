# usable-assets Specification

## Purpose

回答一个问题：**指定日期 D，用户手上能拿出多少钱。**

净资产告诉你「你值多少」，可用资金告诉你「那天你能花多少」——两者可以差很远：公积金取不出来，定期没到期也取不出来。本能力定义账户流动性分桶（可用 / 受限 / 负债，由类型与到期日携带语义，不设任何用户开关）、定期到期的解锁规则，以及日期到金额的合成口径。

三条铁律：受限资金永不计入（无论日期多远）；负债不计入；定期只算本金，App 不采集利率、不计算利息——页面上每个数字都必须是用户亲手录入的。

## Requirements
### Requirement: Account liquidity classification

The system SHALL classify every active account into exactly one bucket — **available** (freely spendable), **restricted** (part of net worth but not freely spendable), or **liability** (negative balance) — using one shared rule applied consistently by the accounts list, the dashboard and the net worth calculation:

1. type in `LIABILITY_ACCOUNT_TYPES` → liability
2. else type in `RESTRICTED_ACCOUNT_TYPES` → restricted
3. else `maturityDate` is set and later than today → restricted
4. else → available

Restricted therefore means "cannot be spent **today**": 公积金 is permanently restricted, an unmatured fixed deposit is temporarily restricted. Type membership SHALL be driven by `ReadonlySet` constants structurally identical to the existing liability precedent. The system SHALL NOT expose any per-account toggle for including or excluding an account from net worth.

#### Scenario: Provident fund is restricted

- **WHEN** an account of type `provident_fund` has a latest balance of ¥80,000
- **THEN** it SHALL be classified as restricted, SHALL contribute ¥80,000 to net worth, and SHALL NOT contribute to available liquid assets

#### Scenario: Bank card is available

- **WHEN** an account of type `bank_card` has a latest balance of ¥50,000 and no maturity date
- **THEN** it SHALL be classified as available and SHALL contribute ¥50,000 to both available liquid assets and net worth

#### Scenario: Unmatured deposit is restricted, not available

- **WHEN** an account of type `bank_card` with a balance of ¥100,000 has `maturityDate = 2027-06-30` and today is `2026-11-08`
- **THEN** it SHALL be classified as restricted, SHALL contribute ¥100,000 to net worth, and SHALL NOT contribute to available liquid assets

#### Scenario: The same deposit becomes available on its maturity date

- **WHEN** today reaches `2027-06-30`
- **THEN** that account SHALL be classified as available and SHALL contribute to available liquid assets

#### Scenario: Accounts list and dashboard agree

- **WHEN** the accounts list groups accounts into 可用 / 受限 / 负债 and the dashboard reports `availableLiquid` / `restrictedLiquid` / `liabilities` for the same day
- **THEN** each section's subtotal SHALL equal the corresponding dashboard figure

#### Scenario: Credit card is a liability

- **WHEN** an account of type `credit_card` has a latest balance of −¥5,000
- **THEN** it SHALL be classified as liability and SHALL contribute −¥5,000 to net worth, and SHALL NOT contribute to available liquid assets

#### Scenario: No inclusion toggle exists

- **WHEN** user opens the add/edit account form
- **THEN** the form SHALL NOT contain any switch, checkbox, or setting labelled as including/excluding the account from net worth

### Requirement: Account maturity date

An account SHALL support an optional maturity date (`maturityDate`, `YYYY-MM-DD`). Before the maturity date the account's balance SHALL count toward net worth but NOT toward usable assets; on and after the maturity date it SHALL count toward both. The system SHALL NOT compute, store, or display any interest, interest rate, or accrued yield for the account.

#### Scenario: Deposit not yet matured

- **WHEN** today is `2026-11-08` and an account has a balance of ¥100,000 with `maturityDate = 2027-06-30`
- **THEN** the ¥100,000 SHALL be included in net worth and SHALL be excluded from usable assets as of today

#### Scenario: Deposit matured at the target date

- **WHEN** the same account is evaluated for target date `2027-06-30`
- **THEN** the ¥100,000 SHALL be included in usable assets for that date

#### Scenario: Maturity date is inclusive

- **WHEN** an account's `maturityDate` equals the target date exactly
- **THEN** the account SHALL count as matured

#### Scenario: No interest is ever computed

- **WHEN** an account with a maturity date is displayed anywhere in the app
- **THEN** the balance shown SHALL be exactly the latest user-entered snapshot value, and no interest, rate, or accrued-yield field SHALL be rendered or stored

#### Scenario: Principal-only labelling

- **WHEN** a matured deposit contributes to the usable-assets figure
- **THEN** the contribution SHALL be labelled as principal (本金) so the user knows interest is not included

### Requirement: Usable assets at a target date

The system SHALL provide a calculation that, given a target date `D`, returns the amount of money the user can actually spend on that date:

```
usable(D) = availableLiquid
          + Σ balances of accounts whose maturityDate <= D
          + Σ net cash flow from today to D
```

where net cash flow sums the monthly equivalents of all cash flows and asset-attached recurring expenses effective in each month from the month **after** the current month through `D`'s month, inclusive. The current month SHALL NOT be counted, because the latest balance snapshot already reflects it. Restricted accounts SHALL NEVER contribute to `usable(D)`, regardless of how far in the future `D` is. Liability accounts SHALL NOT contribute.

#### Scenario: Date before a deposit matures

- **WHEN** the user has ¥50,000 available, a ¥100,000 deposit maturing `2027-06-30`, and no cash flows, and queries `D = 2027-01-31`
- **THEN** `usable(D)` SHALL be ¥50,000

#### Scenario: Date after a deposit matures

- **WHEN** the same user queries `D = 2027-07-31`
- **THEN** `usable(D)` SHALL be ¥150,000

#### Scenario: Restricted funds never unlock

- **WHEN** the user has an ¥80,000 provident fund account and queries `D = 2040-12-31`
- **THEN** the ¥80,000 SHALL NOT be included in `usable(D)`

#### Scenario: Cash flows accumulate to the target date

- **WHEN** today is `2026-11-08`, available liquid is ¥50,000, income is ¥20,000/month, household expenses are ¥4,500/month, asset-attached expenses are ¥800/month, and the user queries `D = 2027-02-28`
- **THEN** `usable(D)` SHALL be ¥50,000 + (¥14,700 × 3 months) = ¥94,100, counting `2026-12`, `2027-01` and `2027-02`

#### Scenario: The current month is never counted

- **WHEN** today is `2026-11-08` and the user queries `D = 2026-11-30`
- **THEN** the net cash flow component SHALL be ¥0 and `usable(D)` SHALL equal available liquid plus any deposits maturing on or before `2026-11-30`

#### Scenario: Cash flows respect effective ranges

- **WHEN** an income entry has `effective_from = 2027-03` and the user queries `D = 2027-02-28`
- **THEN** that income SHALL NOT contribute to `usable(D)`

#### Scenario: No cash flows recorded

- **WHEN** the user has no `cash_flows` entries and no asset-attached recurring expenses
- **THEN** `usable(D)` SHALL equal available liquid plus matured deposits, with the net cash flow component reported as ¥0

### Requirement: Net worth total is unchanged by liquidity classification

Introducing the available/restricted/liability split SHALL NOT change the reported net worth total for any existing data set. `netWorth` SHALL remain `availableLiquid + restrictedLiquid + liabilities + assetValuations`, numerically equal to the previous `liquidAssets + assetValuations`.

#### Scenario: Existing user sees the same net worth after upgrade

- **WHEN** a user with a bank card (¥50,000), a provident fund (¥80,000), a credit card (−¥5,000) and asset valuations (¥200,000) upgrades to this version
- **THEN** net worth SHALL be ¥325,000 both before and after the upgrade, while the breakdown SHALL now show available ¥50,000 / restricted ¥80,000 / liabilities −¥5,000 / valuations ¥200,000

#### Scenario: Historical trend does not shift

- **WHEN** the trend chart is rendered after the upgrade using pre-existing balance snapshots
- **THEN** every historical data point SHALL have the same value it had before the upgrade

### Requirement: Single-date query interface

The usable-assets feature SHALL be presented as "pick a date, get a number". The system SHALL NOT provide a timeline scrubber, a slider, or a multi-date comparison curve. Its entry point SHALL live on the Accounts screen, NOT on the Dashboard hero card and NOT in Settings.

#### Scenario: Reached from the accounts screen

- **WHEN** user opens the Accounts tab and taps 「可用资金」
- **THEN** the usable-assets view SHALL open with the date selector set to today

#### Scenario: Not reachable from Settings or the Dashboard hero

- **WHEN** user opens Settings, or looks at the Dashboard hero card
- **THEN** neither SHALL contain an entry point to the usable-assets view

#### Scenario: Query a date

- **WHEN** user opens the usable-assets view and selects `2027-06-30`
- **THEN** the system SHALL display one amount for that date together with its breakdown (available liquid / matured deposits / net cash flow)

#### Scenario: Change the date

- **WHEN** user changes the selected date
- **THEN** the displayed amount and breakdown SHALL update to reflect the new date, and no chart or slider SHALL be rendered

#### Scenario: Today is the default

- **WHEN** user opens the usable-assets view for the first time
- **THEN** the selected date SHALL default to today

