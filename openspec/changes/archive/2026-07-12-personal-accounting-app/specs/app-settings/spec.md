## ADDED Requirements

### Requirement: App security lock
The system SHALL provide an optional app lock using PIN code and biometric authentication (Face ID / Touch ID / fingerprint). When enabled, the app requires authentication on launch and on foreground from background.

#### Scenario: Enable app lock
- **WHEN** user enables "App Lock" in Settings and sets a PIN
- **THEN** system stores the PIN as a SHA-256 hash in expo-secure-store (not plain text), and requires PIN or biometric authentication every time the app is launched from background

#### Scenario: Biometric fallback to PIN
- **WHEN** biometric authentication fails or is unavailable
- **THEN** system falls back to PIN code entry

#### Scenario: Auto-lock on foreground
- **WHEN** app returns from background to foreground and app lock is enabled
- **THEN** system displays the lock screen requiring PIN or biometric authentication before showing any app content

### Requirement: Theme and appearance
The system SHALL support light/dark mode via dynamic useColorScheme switching (not static color constants) and multiple theme colors. All COLORS used throughout the app SHALL respond to the current color scheme in real-time.

#### Scenario: Switch theme color
- **WHEN** user selects "Blue" as the theme color in Settings
- **THEN** system applies the blue color scheme to all UI elements immediately

#### Scenario: Dark mode dynamic switching
- **WHEN** the device switches between light and dark mode while the app is running and appearance is set to "Follow System"
- **THEN** system dynamically updates all screen colors in real-time without requiring app restart

### Requirement: Currency symbol
The system SHALL allow users to configure the currency symbol displayed throughout the app.

#### Scenario: Change currency
- **WHEN** user changes the currency symbol from "¥" to "$"
- **THEN** all monetary values throughout the app display with the "$" prefix

### Requirement: Net worth goal configuration
The system SHALL allow users to set and modify a net worth target amount in Settings.

#### Scenario: Set net worth goal
- **WHEN** user enters ¥500,000 as the net worth target in Settings
- **THEN** system saves the target and the dashboard trend chart displays a goal line and progress percentage
