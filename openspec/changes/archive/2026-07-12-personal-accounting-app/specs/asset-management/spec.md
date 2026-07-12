## ADDED Requirements

### Requirement: Add a new asset
The system SHALL allow users to add a physical asset with name, category, purchase date, purchase price, and optional image. The add form SHALL be a 3-step progressive form: (1) basic info, (2) cost calculation settings, (3) recurring expenses and maintenance.

#### Scenario: Add asset with progressive form
- **WHEN** user taps "Add Asset", fills in basic info (name, category, purchase date, price), taps "Next", selects amortization method and valuation tracking, taps "Next", adds recurring expenses and maintenance records, reviews the cost preview, and taps "Save"
- **THEN** system creates the asset with status "active" and displays the calculated monthly holding cost in the preview before saving

### Requirement: Edit an existing asset
The system SHALL allow users to edit any field of an existing asset. Changes to amortization method or recurring expenses SHALL recalculate the holding cost immediately.

#### Scenario: Change amortization method
- **WHEN** user edits an asset and changes the amortization method from "Simple Linear" to "Expected Lifespan" with 36 months
- **THEN** system recalculates the monthly amortization cost and updates the displayed holding cost breakdown

### Requirement: Delete an asset
The system SHALL allow users to delete an asset with confirmation.

#### Scenario: Delete asset with confirmation
- **WHEN** user taps delete on an asset
- **THEN** system shows a confirmation dialog and only deletes after user confirms

### Requirement: Asset lifecycle management
The system SHALL support three asset statuses: "active" (使用中), "retired" (退役), and "sold" (已售). Status transitions: active→retired, active→sold, retired→sold, and retired→active (re-activate).

#### Scenario: Mark asset as retired
- **WHEN** user marks an active asset as "retired"
- **THEN** system stops amortization calculation, stops recurring expenses, retains the current valuation, and the asset no longer contributes to the monthly holding cost summary

#### Scenario: Re-activate a retired asset
- **WHEN** user marks a retired asset as "active" again
- **THEN** system resumes amortization calculation and recurring expenses from the current month, and the asset contributes to the monthly holding cost summary again

#### Scenario: Record asset sale
- **WHEN** user records a sale with sell date and sell price for an asset
- **THEN** system calculates the settlement: net expenditure = purchase price + total accumulated holding costs - sell price, and displays the daily average cost over the ownership period

#### Scenario: View sold asset settlement
- **WHEN** user views a sold asset's detail page
- **THEN** system displays the purchase price, sell price, depreciation, accumulated recurring expenses, accumulated maintenance, total holding cost, true net expenditure, ownership duration, and daily average cost

### Requirement: Asset valuation tracking
The system SHALL optionally track asset valuation. When enabled, users can update the current valuation at any time, and the system records each update in a valuation history with a timestamp.

#### Scenario: Update asset valuation
- **WHEN** user updates the current valuation of an asset from ¥8,000 to ¥4,500
- **THEN** system records the valuation change in history, displays the percentage change, and updates the net worth calculation

#### Scenario: Update valuation from asset detail page
- **WHEN** user opens an asset detail page and taps "Update Valuation"
- **THEN** system prompts for a new valuation value, records it in valuation_history with today's date, and updates the asset's current_valuation

### Requirement: Post-creation recurring expense and maintenance management
The system SHALL allow users to add and delete recurring expenses and maintenance records for an existing asset at any time, not only during asset creation.

#### Scenario: Add recurring expense to existing asset
- **WHEN** user opens an asset detail page and adds a new recurring expense (e.g., "保险费 ¥200/月")
- **THEN** system saves the expense with effective_from set to the current month and updates the holding cost calculation

#### Scenario: Delete recurring expense from existing asset
- **WHEN** user deletes a recurring expense from an asset detail page
- **THEN** system removes it from the database and recalculates the holding cost

#### Scenario: Add maintenance record to existing asset
- **WHEN** user opens an asset detail page and adds a new maintenance record
- **THEN** system saves the record and recalculates the holding cost if the maintenance is set to be amortized

#### Scenario: View valuation history chart
- **WHEN** user views the valuation section of an asset detail page
- **THEN** system displays a line chart of valuation changes over time and a list of historical valuation records

### Requirement: Asset list view
The system SHALL display all assets grouped by category, showing 3 key metrics per asset: current valuation, monthly holding cost, and percentage of total holding cost.

#### Scenario: View asset list
- **WHEN** user opens the Assets tab
- **THEN** system displays assets grouped by category, each showing name, status badge, purchase info, current valuation with change indicator, and monthly holding cost with daily equivalent

#### Scenario: Filter assets by status
- **WHEN** user selects a status filter (All / Active / Retired / Sold)
- **THEN** system displays only assets matching the selected status

### Requirement: Monthly holding cost summary
The system SHALL display a summary of all active assets' monthly holding costs as a total, with per-asset breakdown and percentage distribution.

#### Scenario: View holding cost summary
- **WHEN** user views the holding cost summary section
- **THEN** system displays the total monthly holding cost, daily equivalent, and a breakdown list showing each asset's cost and percentage, with a label "养你所有的东西，每月要花这么多"
