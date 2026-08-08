## ADDED Requirements

### Requirement: Cost-per-use ranking on dashboard
The Dashboard SHALL display a "次均成本排行" section showing assets ranked by cost-per-use in descending order. Only assets with `usageTracking` enabled AND at least one recorded use (`totalUseCount > 0`) SHALL appear in the ranking. The section SHALL display up to 3 items by default with a "查看全部" link to the full assets page.

#### Scenario: Ranking shows only tracked assets with usage
- **WHEN** the Dashboard has 5 active assets but only 3 have `usageTracking` enabled and `totalUseCount > 0`
- **THEN** the ranking SHALL display only those 3 assets, sorted by cost-per-use descending

#### Scenario: Asset without usage tracking excluded
- **WHEN** an asset has `usageTracking: false` but has `initialUseCount > 0`
- **THEN** that asset SHALL NOT appear in the cost-per-use ranking

#### Scenario: Empty ranking state
- **WHEN** no assets have `usageTracking` enabled or no assets have recorded uses
- **THEN** the section SHALL display text "还没有使用记录，去资产页记录第一次使用吧"

### Requirement: Neglect badge in ranking
Each item in the cost-per-use ranking SHALL display a neglect warning badge when the asset has been unused for 90 or more days. The badge SHALL show the warning color and text "闲置X天" where X is the number of days since last use.

#### Scenario: Neglected item in ranking
- **WHEN** a ranked asset has `daysSinceLastUse >= 90`
- **THEN** the ranking row SHALL display a warning-colored badge "闲置92天" (using actual day count) next to the asset name

#### Scenario: Active item in ranking
- **WHEN** a ranked asset has `daysSinceLastUse < 90`
- **THEN** the ranking row SHALL NOT display any neglect badge

## REMOVED Requirements

### Requirement: Cost-per-use tab toggle
**Reason**: Replaced by a single ranking list that integrates neglect information inline
**Migration**: The "最贵单次" and "闲置提醒" tabs are removed; their functionality is merged into the single cost-per-use ranking with inline neglect badges
