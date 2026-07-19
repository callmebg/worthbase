## ADDED Requirements

### Requirement: Article explains all 4 amortization methods
The article SHALL cover all 4 holding cost amortization methods implemented in WorthBase, including their formulas, use cases, and trade-offs. Each method SHALL have a real code snippet from the project's `HoldingCostCalculator`.

#### Scenario: All 4 methods are documented
- **WHEN** the article is published
- **THEN** it contains sections for each amortization method with formula, code, and example calculation

### Requirement: Article includes edge case handling
The article SHALL explain how the calculator handles edge cases: zero-day ownership, negative residual value, partial months, and division-by-zero scenarios.

#### Scenario: Edge cases are covered with code
- **WHEN** reader reviews edge case section
- **THEN** they see at least 3 edge case scenarios with corresponding code handling

### Requirement: Article demonstrates real calculation with example asset
The article SHALL walk through a complete calculation example using a real asset type (e.g., a laptop worth ¥8000 held for 3 years), showing each amortization method's result.

#### Scenario: Example calculation is complete
- **WHEN** reader follows the example
- **THEN** they can manually verify the calculation result matches the code output

### Requirement: Article compares this approach with industry alternatives
The article SHALL briefly compare WorthBase's holding cost approach with other methods (simple depreciation, accounting standards like straight-line/accelerated) and explain why the chosen approach fits personal use.

#### Scenario: Comparison section exists
- **WHEN** article is published
- **THEN** it includes a comparison table or list with at least 2 alternative approaches

### Requirement: Code snippets include line references
All code snippets SHALL reference the source file path and approximate line numbers so readers can find them in the repository.

#### Scenario: Code snippets are traceable
- **WHEN** reader looks at a code snippet
- **THEN** they see the file path comment (e.g., `// src/services/HoldingCostCalculator.ts:42-58`)
