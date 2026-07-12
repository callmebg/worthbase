## ADDED Requirements

### Requirement: Shared button component
The system SHALL provide a shared Button component wrapping React Native Paper's Button with project-level defaults (border radius, typography, haptic feedback). Buttons SHALL support variants: primary (filled), secondary (outlined), text (text-only), and icon (icon-only). All existing `TouchableOpacity` button patterns SHALL be replaced with this component.

#### Scenario: Primary button renders with theme color
- **WHEN** a primary Button is rendered
- **THEN** it SHALL display with the current theme's primary color as background, white text, and the theme's `md` border radius

#### Scenario: Disabled button state
- **WHEN** a Button's `disabled` prop is true
- **THEN** the button SHALL display at reduced opacity and SHALL NOT respond to press events

### Requirement: Shared card component
The system SHALL provide a Card component wrapping Paper's Card with project-level defaults (border radius `lg`, surface color, elevation shadow). Cards SHALL support an optional `onPress` handler for tappable cards and a `selected` state for selection UI.

#### Scenario: Card with press handler
- **WHEN** a Card with `onPress` is tapped
- **THEN** it SHALL trigger the handler and provide visual press feedback (slight scale or opacity change)

#### Scenario: Card in dark mode
- **WHEN** a Card renders in dark mode
- **THEN** it SHALL use the dark theme's surface color for background and appropriate shadow/border for visibility

### Requirement: Bottom sheet modal
The system SHALL provide a BottomSheet component based on `@gorhom/react-native-bottom-sheet` for all modal interactions (add forms, edit forms, detail views, confirmation dialogs). Bottom sheets SHALL support gesture-based dismiss, backdrop overlay, snap points, and keyboard-aware content.

#### Scenario: Open bottom sheet with gesture dismiss
- **WHEN** user triggers a bottom sheet (e.g., taps "Add Account")
- **THEN** the sheet SHALL slide up from the bottom with backdrop overlay, and SHALL dismiss when user swipes down or taps the backdrop

#### Scenario: Bottom sheet with form content
- **WHEN** a bottom sheet contains a TextInput and the keyboard opens
- **THEN** the sheet SHALL adjust its height to keep the input visible above the keyboard

### Requirement: Shared text input component
The system SHALL provide a TextInput component wrapping Paper's TextInput with project-level defaults (outlined variant, consistent label styling, error state display). Inputs SHALL support `error` message display, `helperText`, and consistent focus styling using the theme color.

#### Scenario: Input with validation error
- **WHEN** an input has an `error` message set
- **THEN** the input border SHALL turn red (error color) and the error message SHALL display below the input

#### Scenario: Input focus state
- **WHEN** user taps an input to focus it
- **THEN** the input border and label SHALL change to the theme's primary color

### Requirement: Icon system with Lucide
The system SHALL use `lucide-react-native` as the icon library for all icons throughout the app. All emoji icons SHALL be replaced with appropriate Lucide icons. Icons SHALL accept a `color` prop and `size` prop, defaulting to the theme's `onSurface` color and size 24.

#### Scenario: Tab bar icons use Lucide
- **WHEN** the tab bar renders its icons
- **THEN** each tab SHALL display a Lucide icon: 总览→LayoutDashboard, 账户→Wallet, 资产→Package, 设置→Settings; active tab SHALL use the theme's primary color

#### Scenario: Asset category icons use Lucide
- **WHEN** an asset card displays its category icon
- **THEN** each category SHALL display a Lucide icon (vehicle→Car, real-estate→Home, electronics→Monitor, etc.) instead of the current emoji

#### Scenario: Account type icons use Lucide
- **WHEN** an account card displays its type icon
- **THEN** each type SHALL display a Lucide icon (微信→MessageCircle, 支付宝→Smartphone, 银行卡→CreditCard, 现金→Banknote, 基金→TrendingUp, 其他→MoreHorizontal)

### Requirement: Empty state component
The system SHALL provide a reusable EmptyState component for displaying when lists have no data. It SHALL include an icon (Lucide), a primary message, and an optional secondary message and action button.

#### Scenario: Empty asset list
- **WHEN** the asset list has no items
- **THEN** an EmptyState SHALL display with a Package icon, text "暂无资产", subtext "点击下方按钮添加第一个资产", and no action button (FAB handles the action)

### Requirement: List item component
The system SHALL provide a ListItem component wrapping Paper's List.Item with project-level defaults for use in settings lists and history lists. It SHALL support left icon, title, description, right element (chevron, switch, text), and press handler.

#### Scenario: Settings list item with chevron
- **WHEN** a settings ListItem is rendered with a right chevron
- **THEN** it SHALL display the title, optional description, and a right-facing chevron icon in the tertiary text color

### Requirement: Chip and filter component
The system SHALL provide a Chip component for filter selections (asset status filters, time range toggles). Chips SHALL support selected/unselected states with theme-aware colors.

#### Scenario: Filter chip selection
- **WHEN** user taps an unselected filter chip
- **THEN** the chip SHALL become selected with primary color background and white text; tapping again SHALL deselect it

### Requirement: FAB component
The system SHALL provide a FAB (Floating Action Button) component wrapping Paper's FAB for primary actions (add asset, add account). It SHALL use the theme's primary color and display a Lucide icon with optional label text.

#### Scenario: Add asset FAB
- **WHEN** the asset list screen displays the FAB
- **THEN** it SHALL show a "+" icon with "添加资产" label, positioned at the bottom of the screen, using the theme's primary color
