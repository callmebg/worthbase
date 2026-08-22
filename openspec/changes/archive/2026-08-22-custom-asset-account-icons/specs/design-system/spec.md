## MODIFIED Requirements

### Requirement: Icon rendering in shared components
The AppChip component SHALL render Lucide icons using the project's `Icon` component instead of passing icon name strings to Paper's `icon` prop. The icon SHALL be displayed to the left of the chip label. The AppButton component SHALL render Lucide icons using the project's `Icon` component, passed as a React element to Paper's `icon` prop. The `Icon` component SHALL support rendering any icon registered in the `ICON_REGISTRY` by name string, with graceful fallback (rendering nothing and logging a warning in dev mode for unknown icon names).

#### Scenario: Chip renders Lucide icon
- **WHEN** an AppChip is rendered with `icon="Wallet"`
- **THEN** the Chip SHALL display the Wallet Lucide icon to the left of its label text

#### Scenario: Unknown icon name handled gracefully
- **WHEN** the Icon component receives a `name` that is not in the ICON_REGISTRY
- **THEN** the Icon SHALL render nothing, and in `__DEV__` mode SHALL log a warning to the console

### Requirement: Icon registry with extended icon set
The `ICON_REGISTRY` in the `Icon` component SHALL include a medium set of approximately 250 Lucide icons. No taste curation is required — all Lucide icons share a consistent line-style visual language (strokeWidth=2), so users can freely choose any icon. The registry SHALL cover a broad range of categories including but not limited to: common actions, finance, vehicles, electronics, home, lifestyle, nature, and symbols. The registry SHALL be the single source of truth for available icons — both the icon renderer and the icon picker SHALL reference it.

#### Scenario: Extended registry includes diverse icons
- **WHEN** the icon picker requests the full list of available icons from the registry
- **THEN** the registry SHALL return approximately 250 icon entries covering a broad range of categories

#### Scenario: New icons added to registry are available everywhere
- **WHEN** a new Lucide icon is added to the `ICON_REGISTRY`
- **THEN** it SHALL be immediately available for rendering via the `<Icon>` component and for selection in the `IconPickerSheet`

## ADDED Requirements

### Requirement: Icon category metadata
The `icons.ts` module SHALL export an `ICON_CATEGORIES` constant that organizes icon names into named groups for the icon picker's category browsing feature. Each category SHALL have a display label (four-character Chinese, matching the app's tag style) and an array of icon names that exist in the `ICON_REGISTRY`. There SHALL be exactly 12 categories: 常用精选 (popular/frequently used icons, displayed first), 交通出行, 建筑房产, 科技数码, 家居家电, 穿戴配饰, 金融财务 (covers both account types and asset categories like precious metals), 餐饮美食, 运动户外, 文娱休闲, 工具器械, 自然杂项.

#### Scenario: Icon categories available for picker
- **WHEN** the IconPickerSheet loads category data
- **THEN** it SHALL receive exactly 12 categories, each with a four-character Chinese label and a list of icon names that are valid entries in the ICON_REGISTRY, with the first category being 常用精选

#### Scenario: All categorized icons exist in registry
- **WHEN** the ICON_CATEGORIES constant is validated against the ICON_REGISTRY
- **THEN** every icon name in every category SHALL be a valid key in the ICON_REGISTRY

### Requirement: Icon resolution utilities
The `icons.ts` module SHALL export `resolveAssetIcon` and `resolveAccountIcon` utility functions. These functions SHALL implement the fallback chain: custom icon (if non-null and registered) → type/category default icon → hardcoded fallback. The functions SHALL validate that the custom icon name exists in the ICON_REGISTRY before using it.

#### Scenario: Custom icon resolved when valid
- **WHEN** `resolveAssetIcon({ icon: "Bike", category: "vehicle" })` is called and "Bike" is in the ICON_REGISTRY
- **THEN** it SHALL return `"Bike"`

#### Scenario: Default icon used when custom is invalid
- **WHEN** `resolveAssetIcon({ icon: "RemovedIcon", category: "vehicle" })` is called and "RemovedIcon" is NOT in the ICON_REGISTRY
- **THEN** it SHALL return `"Car"` (the vehicle category default)

#### Scenario: Account icon resolution with custom icon
- **WHEN** `resolveAccountIcon({ icon: "Building2", type: "wechat" })` is called and "Building2" is in the ICON_REGISTRY
- **THEN** it SHALL return `"Building2"`
