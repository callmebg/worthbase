## ADDED Requirements

### Requirement: Design token system
The system SHALL define a centralized design token system covering colors, typography, spacing, border radius, and shadows. All tokens SHALL be defined as a Paper-compatible theme object, not as standalone constants. The legacy `COLORS` constant in `src/utils/format.ts` SHALL be deprecated in favor of theme-aware token access via `useTheme()`.

#### Scenario: Access design tokens in a component
- **WHEN** a component calls `useTheme()` from React Native Paper
- **THEN** the returned theme object SHALL include all color tokens (primary, secondary, background, surface, error, onSurface variants), typography presets, spacing scale, border radius scale, and shadow presets

#### Scenario: Tokens respond to theme color changes
- **WHEN** user changes the theme color from purple to blue in Settings
- **THEN** the primary color token and all derived color variants (primaryContainer, onPrimary, etc.) SHALL update immediately across all components using `useTheme()`

### Requirement: Light and dark theme support
The system SHALL provide complete light and dark theme definitions that cover every UI surface in the app. The theme SHALL be determined by the user's dark mode setting (system/light/dark) from `settings-store`. When set to "system", the theme SHALL follow the OS color scheme in real-time.

#### Scenario: Dark mode activates automatically
- **WHEN** the device switches to dark mode and the user's setting is "system"
- **THEN** all background, surface, text, and border colors SHALL switch to dark theme values without requiring app restart

#### Scenario: Manual dark mode override
- **WHEN** user selects "dark" in the dark mode setting while the device is in light mode
- **THEN** the app SHALL display dark theme colors regardless of the OS setting

#### Scenario: Light mode manual override
- **WHEN** user selects "light" in the dark mode setting while the device is in dark mode
- **THEN** the app SHALL display light theme colors regardless of the OS setting

### Requirement: Theme color customization
The system SHALL support at least 4 user-selectable accent colors (purple, blue, green, orange). The selected accent color SHALL propagate to all primary-colored UI elements including buttons, active states, progress indicators, tab bar tint, and section headers. The theme color SHALL be persisted in `settings-store`.

#### Scenario: Switch theme color to blue
- **WHEN** user selects blue (#0984E3) as the theme color
- **THEN** all primary buttons, active tab indicators, progress bars, FAB buttons, and link colors SHALL use #0984E3 or derived shades

#### Scenario: Theme color persists across app restart
- **WHEN** user selects green as the theme color, closes and reopens the app
- **THEN** the app SHALL load with green as the active theme color

### Requirement: Typography scale
The system SHALL define a typography scale with at least 5 levels: display, headline, title, body, and label. Each level SHALL specify font size, font weight, and line height. The app SHALL use these presets consistently instead of ad-hoc fontSize values.

#### Scenario: Typography tokens applied to headings
- **WHEN** a component renders a section heading using the `titleMedium` typography preset
- **THEN** the text SHALL display with the theme's defined title-medium font size (e.g., 16), weight (e.g., 700), and line height

### Requirement: Spacing and layout tokens
The system SHALL define a spacing scale (e.g., xs: 4, sm: 8, md: 16, lg: 24, xl: 32) and border radius scale (e.g., sm: 8, md: 12, lg: 16, xl: 20). Components SHALL reference these tokens rather than hardcoded pixel values.

#### Scenario: Card component uses spacing tokens
- **WHEN** a Card component renders with standard padding
- **THEN** the padding value SHALL come from the spacing token `md` (16) rather than a hardcoded value

### Requirement: Theme provider at app root
The system SHALL wrap the entire app in a Paper `PaperProvider` component within `_layout.tsx`. The provider's theme SHALL be derived from `settings-store` (themeColor + darkMode) and the system color scheme. All child components SHALL have access to the theme via `useTheme()`.

#### Scenario: Theme provider initializes on app launch
- **WHEN** the app launches and settings are loaded from storage
- **THEN** the PaperProvider SHALL render with a theme matching the persisted themeColor and darkMode settings before displaying any app content
