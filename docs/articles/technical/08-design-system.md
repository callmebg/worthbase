[TOC]

# UI 组件库与设计系统：Token 驱动 + 暗色模式 + 4 种主题色

> 一个人的项目也需要设计系统——不然 UI 会越改越乱。

## 组件层次

```
┌─────────────────────────────────────────────┐
│  页面组件 (app/*.tsx)                        │
│  Dashboard / Accounts / Assets / Settings    │
├─────────────────────────────────────────────┤
│  复合组件 (src/components/)                  │
│  InteractiveTrendChart / HoldingCostBreakdown│
│  AddAssetModal / SettlementModal / LockScreen│
│  NetWorthExplainer / TimeRangeSheet          │
├─────────────────────────────────────────────┤
│  基础组件 (src/components/ui/)               │
│  AppButton / AppCard / AppChip / AppTextInput│
│  Icon / ListItem / FAB / EmptyState / Toast  │
│  BottomSheet / DatePickerField               │
├─────────────────────────────────────────────┤
│  设计 Token (src/theme/)                     │
│  colors.ts / tokens.ts / typography.ts       │
│  icons.ts / ThemeProvider.tsx                │
└─────────────────────────────────────────────┘
```

**分层原则**：
- 基础组件 `ui/` 只封装 Paper 组件 + 项目默认样式，不含业务逻辑
- 复合组件组合基础组件，处理特定场景的交互
- 页面组件编排复合组件，连接 Store 数据

## 设计 Token

### 间距（4 的倍数）

```typescript
// src/theme/tokens.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
```

所有组件的 `margin`、`padding`、`gap` 都用这些值，不允许写硬编码数字。

### 圆角

```typescript
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
```

### 阴影

```typescript
export const shadows = {
  none: { elevation: 0 },
  sm: { elevation: 1 },
  md: { elevation: 3 },
  lg: { elevation: 6 },
  xl: { elevation: 10 },
} as const;
```

### 语义色（非主题色）

```typescript
export const semanticColors = {
  positive: '#00B894',  // 收益、增长 → 绿色
  negative: '#EA3943',  // 亏损、下降 → 红色
  neutral: '#636E72',   // 中性信息 → 灰色
} as const;
```

这些颜色不随主题色切换而变化——涨永远是绿色，跌永远是红色。

## 颜色系统：4 种主题色 × 明暗模式

用户可以选 4 种主题色：紫色、蓝色、绿色、橙色。每种在明暗模式下有不同的色值：

```typescript
// src/theme/colors.ts
const THEME_PRIMARIES = {
  purple: { primary: '#6C5CE7', primaryLight: '#A29BFE', primaryContainer: '#E8E5FD' },
  blue:   { primary: '#0984E3', primaryLight: '#74B9FF', primaryContainer: '#D6ECFA' },
  green:  { primary: '#00B894', primaryLight: '#55EFC4', primaryContainer: '#D0F5EC' },
  orange: { primary: '#E17055', primaryLight: '#FAB1A0', primaryContainer: '#FDE8E2' },
};

const THEME_PRIMARIES_DARK = {
  purple: { primary: '#A29BFE', primaryLight: '#6C5CE7', primaryContainer: '#2D2654' },
  blue:   { primary: '#74B9FF', primaryLight: '#0984E3', primaryContainer: '#0A3A5C' },
  green:  { primary: '#55EFC4', primaryLight: '#00B894', primaryContainer: '#0A3D33' },
  orange: { primary: '#FAB1A0', primaryLight: '#E17055', primaryContainer: '#4A2520' },
};
```

**暗色模式不是简单反转颜色**——主色和浅色互换，Container 色用深色低饱和度版本。

### buildColors 函数

```typescript
export function buildColors(themeColorHex: string, isDark: boolean) {
  const key = THEME_COLOR_MAP[themeColorHex] ?? 'purple';
  const primaries = isDark ? THEME_PRIMARIES_DARK[key] : THEME_PRIMARIES[key];
  const shared = isDark ? SHARED_DARK : SHARED_LIGHT;

  return {
    primary: primaries.primary,
    onPrimary: isDark ? '#1A1A2E' : '#FFFFFF',
    primaryContainer: primaries.primaryContainer,
    background: shared.background,
    surface: shared.surface,
    onSurface: shared.onSurface,
    error: shared.error,
    // ... 完整的 MD3 色板
  };
}
```

输出是一个完整的 Material Design 3 色板对象，直接传给 `react-native-paper` 的 `PaperProvider`。

## 暗色模式实现

### 三种模式：跟随系统 / 手动浅色 / 手动深色

```typescript
// src/theme/ThemeProvider.tsx
export function ThemeProvider({ children }) {
  const themeColor = useSettingsStore((s) => s.themeColor);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const systemScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (darkMode === 'dark') return true;
    if (darkMode === 'light') return false;
    return systemScheme === 'dark';  // 'auto' 模式：跟随系统
  }, [darkMode, systemScheme]);

  const theme = useMemo(() => buildTheme(themeColor, isDark), [themeColor, isDark]);

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
```

### 关键设计点

1. **`useMemo` 缓存**：主题对象只在 `themeColor` 或 `darkMode` 变化时重建，避免每次渲染都重新创建
2. **`useColorScheme` 监听**：系统深色模式切换时自动响应
3. **设置持久化**：`darkMode` 存在 SQLite 的 `settings` 表里，重启后保持用户选择

## 基础组件示例

### AppButton：5 种变体

```typescript
// src/components/ui/Button.tsx
type ButtonVariant = 'primary' | 'secondary' | 'text' | 'icon' | 'danger';

export function AppButton({ title, variant = 'primary', icon, onPress, ... }) {
  const getPaperMode = () => {
    switch (variant) {
      case 'primary':
      case 'danger':  return 'contained';
      case 'secondary': return 'outlined';
      case 'text':
      case 'icon':    return 'text';
    }
  };

  return (
    <PaperButton
      mode={getPaperMode()}
      buttonColor={variant === 'danger' ? theme.colors.error : undefined}
      style={[styles.button, style]}
      {...props}
    >
      {title}
    </PaperButton>
  );
}
```

**设计决策**：`danger` 不是 Paper 的原生变体，而是通过 `buttonColor={theme.colors.error}` 实现的。这保持了组件 API 的简洁——调用方只需传 `variant="danger"`。

### AppCard：可点击 + 选中态

```typescript
// src/components/ui/Card.tsx
export function AppCard({ children, onPress, selected = false, elevation = 1, style }) {
  const cardStyle = {
    borderRadius: radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: selected ? 2 : 0,
    borderColor: selected ? theme.colors.primary : 'transparent',
  };

  if (onPress) {
    return (
      <PaperCard mode="elevated" onPress={onPress} style={[cardStyle, { elevation }]}>
        <PaperCard.Content>{children}</PaperCard.Content>
      </PaperCard>
    );
  }

  return (
    <PaperCard mode="elevated" style={[cardStyle, { elevation }]}>
      <PaperCard.Content>{children}</PaperCard.Content>
    </PaperCard>
  );
}
```

**设计决策**：`selected` 态用 `primary` 色 2px 边框表示，而不是改背景色——因为在暗色模式下改背景色容易和 `surface` 色混淆。

## 3 个可复用模式

### 模式 1：Token 驱动样式

```typescript
// 不要这样：
const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, margin: 8 }
});

// 要这样：
import { spacing, radius } from '@/theme/tokens';
const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.md, margin: spacing.sm }
});
```

**好处**：全局调整间距只需要改 `tokens.ts` 一个文件。

### 模式 2：组件包装 Paper + 项目默认值

```typescript
// 不要每个页面都重复写 Paper 配置
<PaperCard mode="elevated" style={{ borderRadius: 16, backgroundColor: theme.colors.surface }}>

// 包装一次，全项目复用
<AppCard elevation={1}>
```

**好处**：统一修改 Card 的默认圆角、颜色时，只改 `AppCard` 一个文件。

### 模式 3：ThemeProvider + useMemo 缓存

```typescript
// 主题对象创建成本高（颜色映射、对象组合），用 useMemo 避免重复创建
const theme = useMemo(() => buildTheme(themeColor, isDark), [themeColor, isDark]);
```

**好处**：主题切换时只重建一次，不会因为父组件 re-render 而反复创建。

🔗 **源码**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase) | [theme/](https://github.com/callmebg/worthbase/tree/main/src/theme) | [ui/](https://github.com/callmebg/worthbase/tree/main/src/components/ui)

---

> **CSDN 标签**: `设计系统` `组件化` `暗色模式` `React Native` `UI`
> **掘金话题**: `前端` `设计系统` `组件化` `React Native`
