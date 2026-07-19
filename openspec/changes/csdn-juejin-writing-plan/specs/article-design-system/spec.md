## ADDED Requirements

### Requirement: Article documents the component architecture
The article SHALL present WorthBase's UI component hierarchy: base components (Button, Card, Input), composite components (AccountCard, AssetItem), and screen-level components. Show the abstraction boundaries.

#### Scenario: Component hierarchy is clear
- **WHEN** reader reviews the architecture section
- **THEN** they see a component tree or list showing the layering from base to screen level

### Requirement: Article covers the theme system implementation
The article SHALL document the theme system: color tokens, spacing scale, typography, and how themes are applied across components. Include code for the theme provider and token definitions.

#### Scenario: Theme system is documented with code
- **WHEN** article is published
- **THEN** it includes the theme token definitions and at least one example of theme usage in a component

### Requirement: Article explains dark mode support
The article SHALL cover how dark mode is implemented: system preference detection, theme switching mechanism, color contrast considerations, and how to ensure consistent appearance in both modes.

#### Scenario: Dark mode implementation is explained
- **WHEN** reader reviews dark mode section
- **THEN** they understand the switching mechanism and see side-by-side screenshots of light/dark mode

### Requirement: Article shows reusable component patterns
The article SHALL extract at least 3 reusable component patterns that readers can apply to their own React Native projects (e.g., compound component pattern, render props, style composition).

#### Scenario: Reusable patterns are highlighted
- **WHEN** article is published
- **THEN** at least 3 patterns are explicitly called out with code examples and usage guidance

### Requirement: Article includes visual component catalog
The article SHALL include screenshots or a component catalog showing the main UI components in their various states (default, active, disabled, error).

#### Scenario: Component catalog is visual
- **WHEN** article is published
- **THEN** it contains at least 4 component screenshots showing different states or variants
