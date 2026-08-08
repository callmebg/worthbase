## ADDED Requirements

### Requirement: Article documents the 8 account types
The article SHALL cover all 8 account types (微信、支付宝、银行卡、现金、基金、信用卡、贷款、其他), explain their characteristics, and how the type affects behavior (icon, color, balance sign handling).

#### Scenario: All account types are documented
- **WHEN** article is published
- **THEN** all 8 types are listed with their unique characteristics and visual representations

### Requirement: Article explains negative balance (liability) handling
The article SHALL document how credit card and loan accounts handle negative balances, including how negative balances are displayed, summed, and factored into net worth calculation.

#### Scenario: Liability handling is clear
- **WHEN** reader reviews liability section
- **THEN** they understand how negative balances are stored, displayed, and aggregated with positive balances

### Requirement: Article covers the snapshot mechanism
The article SHALL explain how balance snapshots work: when they're created (on manual update), what data they store, how they're used for trend calculation, and the storage format.

#### Scenario: Snapshot mechanism is explained with code
- **WHEN** article is published
- **THEN** it shows the snapshot data structure and the code that creates a new snapshot on balance update

### Requirement: Article documents multi-account aggregation
The article SHALL explain how the app aggregates balances across multiple accounts to show total balance, including how mixed positive/negative accounts are summed.

#### Scenario: Aggregation logic is documented
- **WHEN** reader reviews aggregation section
- **THEN** they see the aggregation formula and a numerical example with mixed account types

### Requirement: Article includes UI/UX design decisions
The article SHALL explain key UI decisions for the account management screen: layout choices, interaction patterns (tap to edit, pull to refresh), and why certain design patterns were chosen.

#### Scenario: UX decisions are justified
- **WHEN** article is published
- **THEN** at least 3 UI/UX decisions are explained with rationale
