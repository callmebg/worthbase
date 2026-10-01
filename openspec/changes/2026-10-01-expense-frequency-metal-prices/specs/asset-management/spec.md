## ADDED Requirements

### Requirement: Precious metal live reference price
The system SHALL display live gold and silver reference prices (CNY per gram) on the detail page of precious-metal assets that have a weight in grams. Prices are derived from international spot prices: `USD/oz × USD→CNY rate ÷ 31.1035`. Fetched prices SHALL be cached locally for 10 minutes; when the network is unavailable the system SHALL fall back to the cached price (marked as stale with its timestamp) or hide the section entirely if no cache exists. Fetching prices MUST NOT block the detail page or require any API key.

#### Scenario: View reference price on precious metal asset
- **WHEN** user opens the detail page of an active asset with category 贵金属 and weightGrams = 50
- **THEN** the page shows a "实时参考价" section with gold price/g, silver price/g, reference market values (price × 50g), and the update timestamp

#### Scenario: Offline fallback to cache
- **WHEN** the device is offline and a cached price from 1 hour ago exists
- **THEN** the section still renders the cached prices, labeled with the cache time and a note that the network is unavailable

#### Scenario: Non precious-metal asset
- **WHEN** user opens the detail page of an asset without weightGrams or of another category
- **THEN** no price fetch is triggered and no reference price section is shown

### Requirement: One-tap valuation fill from metal price
The system SHALL provide "按金价填入" and "按银价填入" quick-fill buttons in the 更新估值 sheet for assets that have weightGrams and an available reference price. Quick-fill SHALL set the valuation input to `round(price per gram × weightGrams)`; the user MAY edit the value before saving. Saving SHALL go through the existing valuation update path (writes valuation history and current valuation; net worth reflects it automatically).

#### Scenario: Fill valuation by gold price
- **WHEN** gold reference price is ¥900/g and the asset weighs 50g, and user taps "按金价填入"
- **THEN** the valuation input is prefilled with 45000 and remains editable; tapping 保存 records ¥45000 in valuation history and updates current valuation

#### Scenario: Price unavailable
- **WHEN** no reference price is available (no network and no cache)
- **THEN** the quick-fill buttons are not shown and manual valuation input works as before
