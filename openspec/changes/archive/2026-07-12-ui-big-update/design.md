## Context

WorthBase (家底) is a React Native (Expo 57) personal finance app with 4 tab pages and 8 reusable components. Currently all UI is built with raw `StyleSheet.create()` — no component library, no icon system, no animation framework. Colors are defined as a flat `COLORS` object in `src/utils/format.ts` with a separate `DARK_COLORS` palette, but dark mode is only partially adopted (Settings page uses `useColors()`, other pages use static `COLORS`).

The app has 4 user-selectable theme colors (purple/blue/green/orange), 3 dark mode options (system/light/dark), and uses emoji characters as all icons (tab bar, asset categories, account types, action buttons).

Key constraints:
- **Expo SDK 57 / React Native 0.86** — libraries must be compatible
- **Chinese-first UI** — all labels in Simplified Chinese
- **Privacy-first** — no network calls, all local storage
- **Zustand for state** — theme settings managed via `settings-store`
- **Existing test suite** — 36 unit tests on engine logic must not break

## Goals / Non-Goals

**Goals:**
- Establish a unified design token system (colors, typography, spacing, radius, shadows) that fully supports light/dark mode and user-selectable theme colors
- Introduce React Native Paper as the base component library, replacing raw StyleSheet patterns for buttons, inputs, modals, cards, switches, lists
- Replace all emoji icons with Lucide React Native icons for a professional appearance
- Add micro-animations and transitions using React Native Reanimated for polished interactions
- Redesign all 4 pages (Dashboard, Accounts, Assets, Settings) with improved layout, visual hierarchy, and UX patterns
- Implement proper Bottom Sheet modals with gesture-based dismiss

**Non-Goals:**
- Changing the app's data model, calculation engine, or business logic
- Adding new functional features (new tabs, new asset types, new account types)
- Web platform support
- Internationalization beyond Chinese
- Changing the navigation structure (still 4 tabs)
- Replacing react-native-chart-kit (will style it better, not replace it)

## Decisions

### 1. Component Library: React Native Paper

**Choice**: React Native Paper v5 with its built-in theming system.

**Alternatives considered**:
- **Keep raw StyleSheet**: Zero learning curve but continues the inconsistency problem; every new page duplicates card/button/modal styles
- **React Native Elements**: Similar feature set but Paper has better theming, more polished default components, and better maintained
- **Tamagui / Gluestack**: More modern but heavier, more complex setup with Expo, smaller community

**Rationale**: Paper provides the most comprehensive set of pre-built components (Button, Card, TextInput, Modal, BottomNavigation, List, Chip, Switch, FAB, etc.) with a mature theming system that maps well to our existing `COLORS` structure. It's well-documented, widely used, and fully compatible with Expo.

### 2. Design Tokens: Paper Theme + Custom Token Extension

**Choice**: Extend Paper's `MD3LightTheme`/`MD3DarkTheme` with custom tokens (spacing scale, border radius scale, shadow presets), wrapped in a `ThemeProvider` at the root layout.

**Alternatives considered**:
- **Standalone token file (JSON/TS)**: Simple but disconnected from Paper's theming — requires manual sync
- **NativeWind (Tailwind)**: Utility-first approach but conflicts with Paper's component-level styling; adds complexity

**Rationale**: Paper's theme object already supports custom properties via `colors` extension. By making the theme reactive to `settings-store` (themeColor + darkMode), we get a single source of truth that auto-propagates to all components. The existing `COLORS`/`useColors` system will be replaced by `useTheme()` from Paper.

### 3. Icon Library: Lucide React Native

**Choice**: `lucide-react-native` for all icons.

**Alternatives considered**:
- **React Native Vector Icons (Ionicons/MaterialIcons)**: More common but heavier, requires native linking steps
- **SF Symbols / custom SVG**: Platform-specific or high maintenance cost
- **Keep emoji**: Unprofessional, inconsistent across platforms

**Rationale**: Lucide provides a clean, modern icon set that works as SVG components. It's tree-shakeable (only bundles used icons), works with Paper's theming via `color` prop, and provides consistent visual weight across all icons. Maps well to existing emoji concepts: 📊→`LayoutDashboard`, 💰→`Wallet`, 📦→`Package`, ⚙️→`Settings`.

### 4. Animation: React Native Reanimated 3

**Choice**: `react-native-reanimated` for layout animations and micro-interactions.

**Alternatives considered**:
- **Built-in `Animated` API**: Already used in LockScreen but limited — no layout animations, harder to compose
- **React Native Animated (LayoutAnimation)**: Deprecated in favor of Reanimated
- **Moti**: Nice API on top of Reanimated but adds another dependency

**Rationale**: Reanimated 3 is the de-facto standard for React Native animations, required by `@gorhom/bottom-sheet`, and enables smooth layout animations, shared element transitions, and gesture-driven interactions. It runs on the UI thread for 60fps performance.

### 5. Bottom Sheet: @gorhom/react-native-bottom-sheet

**Choice**: `@gorhom/react-native-bottom-sheet` for all modal patterns.

**Alternatives considered**:
- **Paper's built-in Modal**: Full-screen overlay, not the modern bottom sheet pattern users expect
- **Custom Modal (current approach)**: Works but inconsistent, no gesture dismiss, no snap points
- **React Native Modal**: Same issues as current approach

**Rationale**: The most popular bottom sheet library for React Native, built on Reanimated + Gesture Handler. Provides snap points, gesture dismiss, backdrop, and keyboard handling — replacing all custom `Modal` implementations with a consistent pattern.

### 6. Migration Strategy: Incremental Page-by-Page

**Choice**: Migrate in phases — foundation first (tokens + theme provider + shared components), then one page at a time.

**Rationale**: A big-bang rewrite risks breaking working functionality. By establishing the foundation layer first, each page can be migrated independently. Pages that haven't been migrated yet will continue to work with the legacy `COLORS` constant (kept as a compatibility shim that reads from the theme).

## Risks / Trade-offs

- **[Bundle size increase]** Adding Paper + Lucide + Reanimated + Bottom Sheet increases app size. → Mitigation: Paper supports tree-shaking; Lucide is already tree-shakeable; expected increase ~2-3MB which is acceptable for the UX improvement.

- **[Migration complexity]** Replacing all `COLORS` references and custom components across 4 pages + 8 components is error-prone. → Mitigation: Keep legacy `COLORS` as a compatibility shim during migration; use TypeScript compiler errors to find all references that need updating.

- **[Performance regression]** Reanimated and Paper add overhead. → Mitigation: Both libraries are optimized for production; Paper uses `React.memo` on components; Reanimated runs on UI thread. The app is not performance-critical (no large lists or complex rendering).

- **[Paper MD3 styling mismatch]** Paper's Material Design 3 defaults may not match the desired iOS-native aesthetic. → Mitigation: Override Paper's default theme colors and typography to match WorthBase's existing design language (rounded cards, soft shadows) rather than using MD3 defaults verbatim.

- **[Gesture Handler conflicts]** Bottom Sheet's gesture handler may conflict with ScrollView/FlatList gestures. → Mitigation: `@gorhom/bottom-sheet` handles this internally with proper gesture composition; well-tested pattern.
