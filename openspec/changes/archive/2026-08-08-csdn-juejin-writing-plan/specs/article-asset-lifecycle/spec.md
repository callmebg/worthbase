## ADDED Requirements

### Requirement: Article documents asset state machine design
The article SHALL present the asset lifecycle as a state machine: `active` → `retired` or `sold`, including valid transitions, what triggers each transition, and what side effects occur (e.g., final valuation snapshot).

#### Scenario: State machine is visualized
- **WHEN** article is published
- **THEN** it includes a state diagram (text-based or image) showing all valid asset states and transitions

### Requirement: Article explains the sell settlement algorithm
The article SHALL detail the sell settlement calculation: purchase price, sell price, depreciation amount, cumulative holding cost, true net cost, and daily cost. Include the actual calculation code.

#### Scenario: Settlement algorithm is traceable
- **WHEN** reader reviews the settlement section
- **THEN** they see the complete formula with variable names matching the source code

### Requirement: Article covers the 8 asset categories
The article SHALL list all 8 asset categories (车辆、房产、电子产品、数码、家居、奢侈品、贵金属、其他) and explain how categorization affects behavior (e.g., default depreciation rates, icon mapping).

#### Scenario: All categories are documented
- **WHEN** article is published
- **THEN** all 8 categories are listed with their characteristics

### Requirement: Article shows valuation history tracking
The article SHALL explain how asset valuation snapshots are stored over time and how the valuation curve is generated, including whether interpolation is used between data points.

#### Scenario: Valuation history is explained
- **WHEN** reader reviews valuation section
- **THEN** they understand how a valuation history array is built and rendered

### Requirement: Article includes real asset example
The article SHALL walk through creating, tracking, and eventually selling a real-world asset example (e.g., iPhone or MacBook), showing data at each lifecycle stage.

#### Scenario: End-to-end example is complete
- **WHEN** reader follows the example
- **THEN** they see asset data at creation, during ownership (valuation update), and at sale with final settlement
