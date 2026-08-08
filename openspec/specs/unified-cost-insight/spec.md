## Purpose

Provide a unified cost-per-use ranking list on the Dashboard that combines cost-per-use ranking and neglect warnings into a single view, eliminating the need for tab toggling between separate views.

## Requirements

### Requirement: Unified cost-per-use ranking list
The Dashboard's cost-per-use insight section SHALL display a single unified ranking list sorted by cost-per-use in descending order. The tab toggle between "最贵单次" and "闲置提醒" SHALL NOT exist. Each row SHALL display the asset's category icon, name, cost-per-use, and usage count. The list SHALL show up to 3 items.

#### Scenario: Ranking displays top 3 by cost-per-use
- **WHEN** the Dashboard has 5 active assets with usage tracking enabled and different cost-per-use values
- **THEN** the unified list SHALL display only the top 3 assets sorted by cost-per-use descending, each showing category icon, name, "次均 {costPerUse}", and "用了{useCount}次"

#### Scenario: Empty ranking state
- **WHEN** no assets have usage tracking enabled or no assets have recorded uses
- **THEN** the section SHALL display text "还没有使用记录，去资产页记录第一次使用吧"

### Requirement: Inline neglect badge in unified list
Each row in the unified cost-per-use ranking SHALL display a neglect warning badge when the asset has been unused for 90 or more days. The badge SHALL show the warning color and text "闲置X天" where X is the number of days since last use. The badge SHALL appear inline alongside the existing cost-per-use and usage count information.

#### Scenario: Neglected item shows inline badge
- **WHEN** a ranked asset has `daysSinceLastUse >= 90`
- **THEN** the ranking row SHALL display a warning-colored badge "闲置{daysSinceLastUse}天" alongside the cost-per-use and usage count, without requiring a tab switch to see this information

#### Scenario: Active item shows no badge
- **WHEN** a ranked asset has `daysSinceLastUse < 90`
- **THEN** the ranking row SHALL NOT display any neglect badge, showing only cost-per-use and usage count
