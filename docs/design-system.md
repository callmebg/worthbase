# WorthBase（家底）设计系统文档

> 版本 1.3.1 · 最后更新：2026-07-15

---

## 一、设计哲学

WorthBase 的设计系统建立在三个核心理念之上：

### 1. Material Design 3 为基础

所有组件基于 `react-native-paper` 的 MD3 主题体系构建，通过 `buildTheme()` 函数将自定义 design tokens（间距、圆角、阴影、颜色）注入 Paper 主题对象，确保视觉语言一致且可扩展。

### 2. 隐私优先（Privacy-First）

- 数据本地存储（SQLite + SecureStore），无云端同步
- 生物识别锁屏（`expo-local-authentication`）
- 界面不展示敏感数据的明文提示，所有金额以用户本地货币格式化

### 3. 安静、克制的美学（Calm & Quiet Aesthetic）

- **低饱和度配色**：主色柔和，避免刺眼的纯色块
- **大量留白**：通过 `spacing.md`（16px）和 `spacing.lg`（24px）保证呼吸感
- **克制用色**：语义色仅用于趋势指示（涨/跌/中性），不滥用彩色
- **圆角柔和**：卡片使用 `radius.lg`（16px），按钮使用 `radius.md`（12px），视觉亲和而不幼稚

---

## 二、颜色系统

### 2.1 主题色结构

颜色系统通过 `src/theme/colors.ts` 的 `buildColors()` 函数构建，输出符合 Paper MD3 规范的颜色对象。

#### 核心色彩角色

| 角色 | 说明 | 亮色默认值 | 暗色默认值 |
|------|------|-----------|-----------|
| `primary` | 品牌主色，按钮、链接、强调 | 随主题色变化 | 随主题色变化（更亮） |
| `onPrimary` | primary 上的文字/图标色 | `#FFFFFF` | `#1A1A2E` |
| `primaryContainer` | 浅底色，用于 Chip 选中态、提示框 | 随主题色变化 | 随主题色变化（深色底） |
| `onPrimaryContainer` | primaryContainer 上的文字 | `#2D3436` | `#ECEFF1` |
| `surface` | 卡片、底部弹窗背景 | `#FFFFFF` | `#16213E` |
| `onSurface` | surface 上的主要文字 | `#2D3436` | `#ECEFF1` |
| `surfaceVariant` | 次级背景（输入框、公式框） | `#F0F0F0` | `#1E2A3A` |
| `onSurfaceVariant` | 辅助文字、占位符 | `#636E72` | `#B0BEC5` |
| `background` | 页面背景 | `#F5F5F5` | `#1A1A2E` |
| `onBackground` | 页面背景上的文字 | `#2D3436` | `#ECEFF1` |
| `outline` | 边框、分割线 | `#DFE6E9` | `#2D3748` |
| `outlineVariant` | 次级边框 | `#B2BEC3` | `#4A5568` |
| `error` | 错误、危险操作 | `#E17055` | `#FF7675` |
| `onError` | error 上的文字 | `#FFFFFF` | `#1A1A2E` |
| `secondary` | 次要操作、辅助信息 | `#636E72` | `#B0BEC5` |
| `tertiary` | 三级信息（百分比、次要标签） | `#B2BEC3` | `#78909C` |

#### 自定义语义色

以下颜色通过 `theme.colors` 访问，用于特定场景：

| 角色 | 亮色 | 暗色 | 用途 |
|------|------|------|------|
| `success` | `#00B894` | `#55EFC4` | 成功提示、正值指标 |
| `warning` | `#FDCB6E` | `#FFEAA7` | 警告提示、维护费用 |
| `info` | `#74B9FF` | `#74B9FF` | 信息提示、Toast |
| `primaryLight` | 主色亮变体 | 主色暗变体 | 渐变、辅助强调 |

#### 高程色（Elevation Levels）

| 级别 | 亮色 | 暗色 | 用途 |
|------|------|------|------|
| `level0` | `transparent` | `transparent` | 无高程 |
| `level1` | `#FFFFFF` | `#16213E` | 卡片、列表 |
| `level2` | `#FAFAFA` | `#1C2640` | 浮层 |
| `level3` | `#F5F5F5` | `#202D45` | 弹窗 |
| `level4` | `#EEEEEE` | `#25334D` | 对话框 |
| `level5` | `#E8E8E8` | `#2A3A55` | 最高层级 |

### 2.2 明暗模式

明暗模式通过 `ThemeProvider`（`src/theme/ThemeProvider.tsx`）管理：

```
用户设置 darkMode
    ├── 'light' → 始终亮色
    ├── 'dark'  → 始终暗色
    └── 'system' → 跟随系统 useColorScheme()
```

暗色模式设计原则：
- **不是简单反色**：暗色主色比亮色主色更亮、更柔和（如 `#6C5CE7` → `#A29BFE`）
- **降低对比度**：暗色模式的文字对比度略低于亮色，减少视觉疲劳
- **深层背景**：背景使用深蓝灰（`#1A1A2E`）而非纯黑，更舒适
- **保持语义**：`success`、`warning`、`error` 在两种模式下含义一致

### 2.3 可选主题色

用户可在设置中选择 4 种主题色，通过 `THEME_COLOR_MAP` 映射：

| 主题名 | Hex 值 | 用途 |
|--------|--------|------|
| `purple` | `#6C5CE7` | 默认主题，品牌色 |
| `blue` | `#0984E3` | 冷静、专业 |
| `green` | `#00B894` | 自然、财务 |
| `orange` | `#E17055` | 温暖、活力 |

每种主题色都有对应的 `primaryLight` 和 `primaryContainer` 变体，在亮色和暗色模式下分别适配。

### 2.4 语义色（Semantic Colors）

定义在 `src/theme/tokens.ts`，用于非主题色场景（如趋势指示器）：

```typescript
import { semanticColors } from '@/theme/tokens';

// 收益/增长
semanticColors.positive  // '#00B894'

// 亏损/下降
semanticColors.negative  // '#EA3943'

// 中性信息
semanticColors.neutral   // '#636E72'
```

> **注意**：语义色是静态值，不随明暗模式变化。对于需要适配明暗模式的场景，使用 `theme.colors.success` / `theme.colors.error`。

### 2.5 颜色使用指南

#### ✅ 应该

- 通过 `useAppTheme()` 获取颜色，确保响应主题切换
- 使用 Paper 语义色名（如 `onSurface`、`primaryContainer`）而非硬编码 hex
- 用 `semanticColors` 表示趋势方向（涨/跌）
- 用 `theme.colors.success` 表示正值（如经常性支出分类）
- 用 `theme.colors.warning` 表示维护费用分类
- 用 `theme.colors.primary + '12'`（加透明度后缀）创建浅色背景

#### ❌ 不应该

- 不要直接使用已废弃的 `COLORS` 常量（标记为 `@deprecated`）
- 不要在 StyleSheet 中硬编码颜色值
- 不要假设某个颜色在亮色/暗色模式下是固定的
- 不要用 `semanticColors` 替代 `theme.colors.success` 来做 UI 元素背景

---

## 三、间距系统

定义在 `src/theme/tokens.ts`，基于 4px 倍数：

```typescript
import { spacing } from '@/theme/tokens';

spacing.xs   // 4px  — 极小间距（图标与文字间距）
spacing.sm   // 8px  — 小间距（紧凑元素间距）
spacing.md   // 16px — 中等间距（默认内边距、卡片间距）
spacing.lg   // 24px — 大间距（区域分隔）
spacing.xl   // 32px — 超大间距（页面顶部/底部）
spacing.xxl  // 48px — 巨大间距（EmptyState 上下间距）
```

### 使用场景

| Token | 典型场景 |
|-------|---------|
| `xs` (4) | 标签与输入框间距、图标与文字间距、圆点与文字间距 |
| `sm` (8) | 列表项间距、Chip 间距、导航按钮间距 |
| `md` (16) | 卡片内边距、表单字段间距、区块分隔、BottomSheet 内边距 |
| `lg` (24) | 页面级区块分隔 |
| `xl` (32) | BottomSheet 内容底部安全间距 |
| `xxl` (48) | EmptyState 上下留白 |

#### ✅ 应该

- 始终使用 `spacing` token 而非硬编码数值
- 在 `StyleSheet.create` 中引用 `spacing.md` 等常量

#### ❌ 不应该

- 不要使用奇数或非 4 倍数的间距（如 `padding: 13`）
- 避免混用 token 和硬编码值

---

## 四、圆角系统

定义在 `src/theme/tokens.ts`：

```typescript
import { radius } from '@/theme/tokens';

radius.sm    // 8px   — Chip、小元素
radius.md    // 12px  — 按钮、输入框、公式框、提示框
radius.lg    // 16px  — 卡片
radius.xl    // 20px  — BottomSheet 顶部圆角
radius.full  // 9999px — 圆形（FAB、图标容器、圆点）
```

### 使用场景

| Token | 典型场景 |
|-------|---------|
| `sm` (8) | AppChip、小标签 |
| `md` (12) | AppButton、AppTextInput、公式框（formulaBox）、提示框（tipBox）、方法卡片（methodCard） |
| `lg` (16) | AppCard |
| `xl` (20) | AppBottomSheet 背景圆角 |
| `full` (9999) | AppFAB（实际用 `size/2`）、EmptyState 图标容器（44px 半径）、趋势圆点（4px 半径） |

#### ✅ 应该

- 使用 `radius` token 保持全局一致性
- 大容器（BottomSheet）用更大的圆角

#### ❌ 不应该

- 不要给同一个元素在不同地方设置不同的圆角值
- 避免使用 `borderRadius: 0`（除非是全屏分割线）

---

## 五、阴影与高程系统

定义在 `src/theme/tokens.ts`，映射到 Paper 的 elevation 体系：

```typescript
import { shadows } from '@/theme/tokens';

shadows.none  // elevation: 0  — 无阴影（平面元素）
shadows.sm    // elevation: 1  — 轻微阴影（普通卡片）
shadows.md    // elevation: 3  — 中等阴影（浮动元素）
shadows.lg    // elevation: 6  — 较大阴影（弹窗）
shadows.xl    // elevation: 10 — 最大阴影（FAB）
```

### 高程层级

| 层级 | Elevation | 用途 |
|------|-----------|------|
| 0 | 无阴影 | 输入框、平面元素 |
| 1 | 轻微 | AppCard（默认）、列表项 |
| 3 | 中等 | 浮出卡片 |
| 6 | 较大 | BottomSheet（elevation: 8） |
| 10 | 最大 | FAB（elevation: 4，实际使用自定义阴影） |

### 自定义阴影

FAB 和 BottomSheet 使用自定义 `shadowColor` / `shadowOffset` / `shadowOpacity` / `shadowRadius` 而非 Paper elevation，以避免 Surface 渲染问题。

#### ✅ 应该

- 卡片默认使用 `elevation: 1`
- 弹窗和 BottomSheet 使用较高阴影
- 对需要精确阴影控制的场景（FAB），使用自定义阴影属性

#### ❌ 不应该

- 不要给非浮动元素添加阴影
- 避免使用超过 `elevation: 10` 的值

---

## 六、字体排版

定义在 `src/theme/typography.ts`，遵循 MD3 字体层级：

### 字体层级一览

| 变体名 | 字号 | 字重 | 行高 | 字间距 | 用途 |
|--------|------|------|------|--------|------|
| `displayLarge` | 32 | 700 | 40 | 0 | 超大标题（极少使用） |
| `displayMedium` | 28 | 700 | 36 | 0 | 大标题 |
| `displaySmall` | 24 | 600 | 32 | 0 | 中等标题 |
| `headlineLarge` | 22 | 600 | 28 | 0 | 页面级标题 |
| `headlineMedium` | 20 | 600 | 26 | 0 | HoldingCostExplainer 标题 |
| `headlineSmall` | 18 | 600 | 24 | 0 | NetWorthExplainer 标题 |
| `titleLarge` | 18 | 500 | 24 | 0 | 区块标题 |
| `titleMedium` | 16 | 500 | 22 | 0.15 | 卡片标题 |
| `titleSmall` | 14 | 500 | 20 | 0.1 | 小标题 |
| `bodyLarge` | 16 | 400 | 24 | 0.5 | 正文（大） |
| `bodyMedium` | 14 | 400 | 20 | 0.25 | 正文（标准） |
| `bodySmall` | 12 | 400 | 16 | 0.4 | 辅助文字 |
| `labelLarge` | 14 | 500 | 20 | 0.1 | 按钮标签 |
| `labelMedium` | 12 | 500 | 16 | 0.5 | 小标签 |
| `labelSmall` | 11 | 500 | 16 | 0.5 | 极小标签 |

### 实际使用模式

组件中通常不直接引用 `typography` 对象，而是通过 Paper 的 `Text` 组件 `variant` 属性或直接在 `StyleSheet` 中设置：

```tsx
// 方式 1：Paper Text variant
<Text variant="titleMedium">标题</Text>

// 方式 2：直接 StyleSheet（更常见于自定义组件）
title: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: spacing.md,
}
```

#### ✅ 应该

- 页面标题使用 18–20px、fontWeight `600`–`700`
- 正文字号不小于 13px，行高不低于 20px
- 辅助文字使用 `onSurfaceVariant` 颜色

#### ❌ 不应该

- 不要在同一层级使用多种字号
- 避免字号小于 11px（可读性差）

---

## 七、UI 组件

所有组件位于 `src/components/ui/`，通过 `src/components/ui/index.ts` 统一导出。

### 7.1 AppButton

**文件**：`src/components/ui/Button.tsx`

封装 Paper Button，提供统一的变体和样式。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | 必填 | 按钮文字 |
| `variant` | `'primary' \| 'secondary' \| 'text' \| 'icon' \| 'danger'` | `'primary'` | 按钮变体 |
| `icon` | `string` | — | Lucide 图标名（左侧） |
| `onPress` | `() => void` | 必填 | 点击回调 |
| `disabled` | `boolean` | `false` | 禁用状态 |
| `loading` | `boolean` | `false` | 加载状态 |
| `compact` | `boolean` | `false` | 紧凑模式 |
| `style` | `object` | — | 自定义样式 |
| `labelStyle` | `object` | — | 自定义标签样式 |

#### 变体说明

| 变体 | Paper mode | 视觉 | 用途 |
|------|-----------|------|------|
| `primary` | `contained` | 实心填充主色 | 主操作（确认、保存、添加） |
| `secondary` | `outlined` | 描边 1.5px | 次操作（取消、筛选） |
| `text` | `text` | 纯文字 | 内联操作、链接 |
| `icon` | `text` | 纯文字 + 图标 | 工具栏操作 |
| `danger` | `contained` | 实心 error 色 | 危险操作（删除） |

#### 示例

```tsx
import { AppButton } from '@/components/ui';

// 主操作
<AppButton title="保存" onPress={handleSave} />

// 带图标的主操作
<AppButton title="添加账户" icon="Plus" onPress={handleAdd} />

// 次操作
<AppButton title="取消" variant="secondary" onPress={handleCancel} />

// 危险操作
<AppButton title="删除" variant="danger" icon="Trash2" onPress={handleDelete} />

// 加载中
<AppButton title="保存中…" loading onPress={() => {}} />

// 紧凑模式
<AppButton title="编辑" variant="text" compact onPress={handleEdit} />
```

#### ✅ 应该

- 每个操作区域最多一个 `primary` 按钮
- 使用 `danger` 变体处理所有删除/不可逆操作
- 异步操作时设置 `loading` 状态

#### ❌ 不应该

- 不要同时展示两个 `primary` 按钮
- 不要用 `primary` 做取消操作
- 不要在非 `text` / `icon` 变体下省略 `title`

---

### 7.2 AppCard

**文件**：`src/components/ui/Card.tsx`

封装 Paper Card，提供统一的圆角、阴影和选中态。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `ReactNode` | 必填 | 卡片内容 |
| `onPress` | `() => void` | — | 点击回调（使卡片可点击） |
| `onLongPress` | `() => void` | — | 长按回调 |
| `selected` | `boolean` | `false` | 选中态（显示 primary 边框） |
| `elevation` | `number` | `1` | 阴影层级（0–5） |
| `style` | `ViewStyle` | — | 自定义样式 |

#### 示例

```tsx
import { AppCard } from '@/components/ui';

// 静态卡片
<AppCard>
  <Text>账户余额</Text>
  <Text>¥12,345.67</Text>
</AppCard>

// 可点击卡片
<AppCard onPress={() => navigation.navigate('detail')}>
  <Text>查看详情</Text>
</AppCard>

// 选中态卡片（用于列表选择）
<AppCard selected={isSelected} onPress={() => setSelected(true)}>
  <Text>选项 A</Text>
</AppCard>

// 无阴影卡片
<AppCard elevation={0}>
  <Text>嵌入式内容</Text>
</AppCard>
```

#### ✅ 应该

- 默认使用 `elevation: 1`
- 需要选中反馈时传入 `selected`
- 传入 `onPress` 使整个卡片可交互

#### ❌ 不应该

- 不要在卡片内再嵌套卡片
- 不要给 `elevation` 超过 5 的值

---

### 7.3 AppChip

**文件**：`src/components/ui/Chip.tsx`

封装 Paper Chip，用于筛选标签和分类选择。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `label` | `string` | 必填 | 标签文字 |
| `selected` | `boolean` | `false` | 选中状态 |
| `onPress` | `() => void` | — | 点击回调 |
| `icon` | `string` | — | Lucide 图标名 |
| `disabled` | `boolean` | `false` | 禁用状态 |
| `compact` | `boolean` | `false` | 紧凑模式 |
| `style` | `object` | — | 自定义样式 |

#### 示例

```tsx
import { AppChip } from '@/components/ui';

// 筛选标签组
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  <AppChip label="全部" selected={filter === 'all'} onPress={() => setFilter('all')} />
  <AppChip label="车辆" icon="Car" selected={filter === 'vehicle'} onPress={() => setFilter('vehicle')} />
  <AppChip label="电子设备" icon="Smartphone" selected={filter === 'electronics'} onPress={() => setFilter('electronics')} />
</View>
```

#### ✅ 应该

- 在筛选场景中使用 Chip 组
- 选中态搭配 `icon` 增强辨识度
- 使用 `flexWrap: 'wrap'` 让 Chip 自动换行

#### ❌ 不应该

- 不要用 Chip 做按钮（Chip 用于选择/筛选，Button 用于操作）
- 不要在 Chip 中放过多文字

---

### 7.4 AppTextInput

**文件**：`src/components/ui/TextInput.tsx`

封装 Paper TextInput，支持 outlined 模式、错误提示和 BottomSheet 内使用。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `label` | `string` | 必填 | 输入框标签 |
| `value` | `string` | 必填 | 当前值 |
| `onChangeText` | `(text: string) => void` | 必填 | 值变化回调 |
| `placeholder` | `string` | — | 占位文字 |
| `keyboardType` | `string` | `'default'` | 键盘类型 |
| `error` | `string` | — | 错误消息（显示红色边框和消息） |
| `helperText` | `string` | — | 帮助文字（无错误时显示） |
| `secureTextEntry` | `boolean` | `false` | 密码模式 |
| `disabled` | `boolean` | `false` | 禁用 |
| `right` | `ReactNode` | — | 右侧装饰（如清除按钮） |
| `autoFocus` | `boolean` | `false` | 自动聚焦 |
| `maxLength` | `number` | — | 最大长度 |
| `multiline` | `boolean` | `false` | 多行输入 |
| `bottomSheet` | `boolean` | `false` | BottomSheet 模式 |

#### BottomSheet 模式

当 `bottomSheet={true}` 时，组件使用 `@gorhom/bottom-sheet` 的 `BottomSheetTextInput` 替代 Paper TextInput，确保键盘在 BottomSheet 内正确处理。此模式下使用自定义标签渲染而非 Paper 的浮动标签。

#### 示例

```tsx
import { AppTextInput } from '@/components/ui';

// 基本输入
<AppTextInput
  label="名称"
  value={name}
  onChangeText={setName}
  placeholder="请输入名称"
/>

// 带错误提示
<AppTextInput
  label="金额"
  value={amount}
  onChangeText={setAmount}
  keyboardType="decimal-pad"
  error={amountError || undefined}
  helperText="请输入购买金额"
/>

// BottomSheet 内使用
<AppTextInput
  label="备注"
  value={note}
  onChangeText={setNote}
  multiline
  bottomSheet
/>
```

#### ✅ 应该

- 始终提供 `helperText` 说明输入要求
- 表单验证错误通过 `error` prop 内联展示
- 在 BottomSheet 内务必设置 `bottomSheet={true}`
- 数字输入使用 `keyboardType="decimal-pad"`

#### ❌ 不应该

- 不要同时显示 `error` 和 `helperText`（error 优先）
- 不要在 BottomSheet 内使用普通 TextInput（键盘会遮挡）

---

### 7.5 AppBottomSheet

**文件**：`src/components/ui/BottomSheet.tsx`

封装 `@gorhom/react-native-bottom-sheet`，提供统一的底部弹窗体验。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `snapPoints` | `(string \| number)[]` | `['50%', '90%']` | 停靠点 |
| `visible` | `boolean` | 必填 | 是否可见 |
| `onClose` | `() => void` | 必填 | 关闭回调 |
| `children` | `ReactNode` | 必填 | 内容 |
| `dismissOnBackdrop` | `boolean` | `true` | 点击背景关闭 |
| `title` | `string` | — | 标题文字 |
| `enableKeyboardHandling` | `boolean` | `true` | 键盘处理 |

#### Ref 方法

```typescript
interface AppBottomSheetRef {
  open: () => void;
  close: () => void;
}
```

#### 示例

```tsx
import { AppBottomSheet } from '@/components/ui';
import type { AppBottomSheetRef } from '@/components/ui';

// 基本用法（受控模式）
<AppBottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
  <Text>内容</Text>
</AppBottomSheet>

// 多段式 snap points
<AppBottomSheet
  visible={showSheet}
  onClose={() => setShowSheet(false)}
  snapPoints={['30%', '70%', '95%']}
>
  <Text>可拖拽到不同高度</Text>
</AppBottomSheet>

// 不可通过背景关闭
<AppBottomSheet
  visible={showSheet}
  onClose={() => setShowSheet(false)}
  dismissOnBackdrop={false}
>
  <Text>必须点击内部按钮关闭</Text>
</AppBottomSheet>

// 使用 ref 控制
const sheetRef = useRef<AppBottomSheetRef>(null);
<AppBottomSheet ref={sheetRef} visible={showSheet} onClose={handleClose}>
  <AppButton title="关闭" onPress={() => sheetRef.current?.close()} />
</AppBottomSheet>
```

#### ✅ 应该

- 简单信息展示使用 `['50%']` 单 snap point
- 复杂表单使用 `['50%', '90%']` 允许用户展开
- 全屏说明（如 HoldingCostExplainer）使用 `['85%']`
- BottomSheet 内的输入框使用 `AppTextInput` 的 `bottomSheet` 模式

#### ❌ 不应该

- 不要在 BottomSheet 内放过多层级导航（使用多页模式代替，参考 HoldingCostExplainer）
- 不要用 BottomSheet 做全屏页面（那是 Navigator 的职责）
- 避免 `snapPoints` 中包含 `100%`（留一点空间让用户看到背景）

---

### 7.6 AppFAB（浮动操作按钮）

**文件**：`src/components/ui/FAB.tsx`

自定义 TouchableOpacity 实现，避免 Paper Surface elevation 渲染问题。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `icon` | `string` | 必填 | Lucide 图标名 |
| `label` | `string` | — | 可选标签文字 |
| `onPress` | `() => void` | 必填 | 点击回调 |
| `small` | `boolean` | `false` | 小尺寸变体（40px vs 56px） |
| `style` | `object` | — | 自定义样式 |

#### 示例

```tsx
import { AppFAB } from '@/components/ui';

// 标准 FAB（右下角添加按钮）
<AppFAB icon="Plus" onPress={handleAdd} />

// 带标签的 FAB
<AppFAB icon="Plus" label="添加" onPress={handleAdd} />

// 小尺寸 FAB
<AppFAB icon="Plus" small onPress={handleAdd} />
```

#### 位置

FAB 默认使用绝对定位：`right: 16, bottom: 80`（避免遮挡底部 Tab Bar）。

#### ✅ 应该

- 每个页面最多一个 FAB
- FAB 用于当前页面的主操作（添加、创建）
- 使用 Lucide 图标而非自定义图片

#### ❌ 不应该

- 不要用 FAB 做导航操作
- 不要在没有明确主操作的页面使用 FAB
- 不要修改 FAB 的默认定位（除非有特殊布局需求）

---

### 7.7 EmptyState

**文件**：`src/components/ui/EmptyState.tsx`

空状态占位组件，包含居中图标、标题、描述和可选操作按钮。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `icon` | `string` | 必填 | Lucide 图标名 |
| `title` | `string` | 必填 | 主标题 |
| `description` | `string` | — | 描述文字 |
| `actionLabel` | `string` | — | 操作按钮文字 |
| `onAction` | `() => void` | — | 操作按钮回调 |
| `style` | `object` | — | 自定义样式 |

#### 示例

```tsx
import { EmptyState } from '@/components/ui';

// 空列表
{items.length === 0 ? (
  <EmptyState
    icon="Package"
    title="还没有资产"
    description="点击下方按钮添加你的第一个资产"
    actionLabel="添加资产"
    onAction={handleAdd}
  />
) : (
  <FlatList data={items} renderItem={renderItem} />
)}

// 搜索结果无匹配
<EmptyState
  icon="Search"
  title="没有找到匹配项"
  description="尝试更换搜索关键词"
/>
```

#### ✅ 应该

- 始终提供有意义的图标（与当前页面概念相关）
- 提供描述说明为什么是空的
- 提供操作按钮让用户能快速执行操作
- 使用 `secondary` 变体的按钮（不抢主操作视觉权重）

#### ❌ 不应该

- 不要用 EmptyState 做错误页面（错误用 ErrorBoundary）
- 不要省略 `icon`（图标是视觉锚点）

---

### 7.8 Icon

**文件**：`src/components/ui/Icon.tsx`

基于 Lucide React Native 的主题感知图标组件。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | `string` | 必填 | 图标名称（必须在注册表中） |
| `size` | `number` | `24` | 尺寸（px） |
| `color` | `string` | `onSurface` | 颜色：主题色键名或原始 hex 值 |
| `strokeWidth` | `number` | `2` | 描边宽度 |

#### 颜色解析逻辑

`color` prop 首先尝试作为 `theme.colors` 的键名解析：

```tsx
// "primary" → theme.colors.primary
<Icon name="Wallet" color="primary" />

// "onSurfaceVariant" → theme.colors.onSurfaceVariant
<Icon name="Settings" color="onSurfaceVariant" />

// "#FF0000" → 直接使用
<Icon name="AlertCircle" color="#FF0000" />

// 不传 → 默认 theme.colors.onSurface
<Icon name="Home" />
```

#### 示例

```tsx
import { Icon } from '@/components/ui';

// 主题色图标
<Icon name="Wallet" size={24} color="primary" />

// 语义色图标
<Icon name="CheckCircle" size={16} color="success" />
<Icon name="AlertCircle" size={16} color="error" />

// 自定义颜色
<Icon name="TrendingUp" size={20} color={semanticColors.positive} />
```

#### ✅ 应该

- 使用主题色键名（如 `'primary'`、`'onSurfaceVariant'`）确保明暗模式适配
- 在组件内统一使用 `Icon` 组件而非直接导入 Lucide 图标
- 新增图标时同时更新 `icons.ts` 映射和 `Icon.tsx` 注册表

#### ❌ 不应该

- 不要直接 `import { Wallet } from 'lucide-react-native'` 后使用（绕过了主题适配）
- 不要在注册表之外使用图标名（开发环境会打印警告）

---

### 7.9 AppListItem

**文件**：`src/components/ui/ListItem.tsx`

封装 Paper List.Item，支持 Lucide 图标和灵活的右侧元素。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | 必填 | 标题 |
| `description` | `string` | — | 描述 |
| `icon` | `string` | — | 左侧 Lucide 图标名 |
| `iconColor` | `string` | `'onSurfaceVariant'` | 图标颜色 |
| `onPress` | `() => void` | — | 点击回调 |
| `rightElement` | `'chevron' \| 'switch' \| 'text' \| 'custom'` | — | 右侧元素类型 |
| `switchValue` | `boolean` | — | Switch 值 |
| `onSwitchChange` | `(value: boolean) => void` | — | Switch 切换回调 |
| `rightText` | `string` | — | 右侧文字 |
| `customRight` | `ReactNode` | — | 自定义右侧元素 |
| `disabled` | `boolean` | `false` | 禁用 |
| `style` | `object` | — | 自定义样式 |

#### 示例

```tsx
import { AppListItem } from '@/components/ui';

// 导航项（带右箭头）
<AppListItem
  title="账户管理"
  icon="Wallet"
  rightElement="chevron"
  onPress={() => navigation.navigate('accounts')}
/>

// 设置开关
<AppListItem
  title="深色模式"
  icon="Moon"
  rightElement="switch"
  switchValue={isDark}
  onSwitchChange={toggleDark}
/>

// 显示右侧文字
<AppListItem
  title="当前版本"
  icon="Info"
  rightElement="text"
  rightText="v1.3.1"
/>

// 自定义右侧元素
<AppListItem
  title="主题色"
  icon="Palette"
  rightElement="custom"
  customRight={<ColorPicker />}
/>
```

#### ✅ 应该

- 始终提供 `icon` 增强可辨识性
- 导航项使用 `rightElement="chevron"`
- 开关项使用 `rightElement="switch"`
- 展示值使用 `rightElement="text"`

#### ❌ 不应该

- 不要在 `disabled` 状态下仍传入 `onPress`
- 不要在一个列表中混用不同右侧元素类型（保持一致性）

---

### 7.10 Toast（提示通知）

**文件**：`src/hooks/useToast.tsx` + `src/components/ui/Toast.tsx`

基于 React Context 的瞬态反馈系统。

#### Toast 类型

| 类型 | 默认时长 | 背景色 | 用途 |
|------|---------|--------|------|
| `success` | 2000ms | `theme.colors.success` | 操作成功（保存、删除完成） |
| `error` | 4000ms | `theme.colors.error` | 操作失败（网络错误、验证失败） |
| `info` | 2000ms | `theme.colors.info` | 信息提示（提示、引导） |

#### 设置

1. 在应用根组件包裹 `ToastProvider`：

```tsx
import { ToastProvider } from '@/components/ui';

function App() {
  return (
    <ToastProvider>
      {/* 应用内容 */}
    </ToastProvider>
  );
}
```

2. 在组件中使用 `useToast`：

```tsx
import { useToast } from '@/components/ui';

function MyComponent() {
  const { show } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      show('保存成功', 'success');
    } catch (e) {
      show('保存失败，请重试', 'error');
    }
  };

  return <AppButton title="保存" onPress={handleSave} />;
}
```

#### API

```typescript
show(message: string, type?: 'success' | 'error' | 'info', duration?: number): void
hide(): void
```

#### ✅ 应该

- 操作成功后使用 `success` Toast
- 异步操作失败时使用 `error` Toast 并给出重试建议
- 保持消息简短（一行以内）

#### ❌ 不应该

- 不要用 Toast 做复杂交互（Toast 不支持按钮或链接）
- 不要在 Toast 中展示过长的文字
- 不要同时弹出多个 Toast

---

## 八、图标系统

### 8.1 架构

图标系统由两部分组成：

1. **`src/theme/icons.ts`** — 概念到图标名的映射表
2. **`src/components/ui/Icon.tsx`** — 图标注册表和渲染组件

### 8.2 图标映射表

`icons.ts` 将应用概念映射到 Lucide 图标名：

| 映射表 | 用途 | 示例 |
|--------|------|------|
| `TAB_ICONS` | Tab 栏图标 | `index → 'LayoutDashboard'` |
| `ACCOUNT_TYPE_ICONS` | 账户类型图标 | `WECHAT → 'MessageCircle'` |
| `ASSET_CATEGORY_ICONS` | 资产分类图标 | `VEHICLE → 'Car'` |
| `ASSET_STATUS_ICONS` | 资产状态图标 | `ACTIVE → 'CheckCircle'` |
| `ACTION_ICONS` | 通用操作图标 | `add → 'Plus'` |

### 8.3 图标注册表

`Icon.tsx` 维护一个 `ICON_REGISTRY`，所有可用的 Lucide 图标在此注册：

```typescript
const ICON_REGISTRY: Record<string, LucideIcon> = {
  LayoutDashboard, Wallet, Package, Settings,
  // ... 所有已注册的图标
};
```

### 8.4 添加新图标

添加新图标需要 3 步：

**步骤 1**：在 `Icon.tsx` 中导入图标

```typescript
import {
  // ... 现有图标
  NewIconName,  // 新增
} from 'lucide-react-native';
```

**步骤 2**：注册到 `ICON_REGISTRY`

```typescript
const ICON_REGISTRY: Record<string, LucideIcon> = {
  // ... 现有图标
  NewIconName,  // 新增
};
```

**步骤 3**：如果是概念性图标，在 `icons.ts` 中添加映射

```typescript
export const ACTION_ICONS = {
  // ... 现有映射
  newAction: 'NewIconName',  // 新增
} as const;
```

### 8.5 当前可用图标清单

| 图标名 | 用途 |
|--------|------|
| `LayoutDashboard` | 首页 Tab |
| `Wallet` | 账户 Tab / 支付宝 |
| `Package` | 资产 Tab / 其他资产 |
| `Settings` | 设置 Tab |
| `MessageCircle` | 微信 |
| `MessageSquare` | 消息 |
| `Building2` | 银行卡 |
| `Banknote` | 现金 |
| `TrendingUp` | 基金 |
| `CreditCard` | 信用卡 |
| `HandCoins` | 贷款 |
| `Car` | 车辆 |
| `Home` | 房产 |
| `Smartphone` | 电子设备 |
| `Laptop` | 数字设备 |
| `Sofa` | 家居 |
| `Watch` | 奢侈品 |
| `Gem` | 贵金属 |
| `CheckCircle` | 活跃状态 |
| `Archive` | 已退休 |
| `DollarSign` | 已售出 |
| `Plus` | 添加 |
| `Pencil` | 编辑 |
| `Trash2` | 删除 |
| `X` | 关闭 |
| `Check` | 确认 |
| `ChevronRight` / `ChevronLeft` / `ChevronUp` / `ChevronDown` | 导航箭头 |
| `RefreshCw` / `RotateCcw` | 刷新/重置 |
| `Download` / `Upload` | 导出/导入 |
| `Filter` / `Search` | 筛选/搜索 |
| `Lock` / `Fingerprint` | 安全/生物识别 |
| `Palette` / `Moon` / `Globe` | 主题/暗色/语言 |
| `Target` | 目标 |
| `FileJson` / `FileSpreadsheet` / `FileDown` | 文件格式 |
| `HardDrive` | 存储 |
| `Info` / `AlertCircle` | 信息/警告 |
| `PieChart` / `BarChart3` | 图表 |
| `Calendar` / `Clock` | 时间 |
| `PackagePlus` | 添加资产 |
| `Maximize2` | 全屏/展开 |
| `MoreHorizontal` | 更多 |

#### ✅ 应该

- 优先使用已有图标（查看 `icons.ts` 的映射表）
- 新图标遵循 Lucide 命名规范（PascalCase）
- 确保图标在 16px–24px 尺寸下清晰可辨

#### ❌ 不应该

- 不要使用 Lucide 未提供的图标（如需自定义图标，请使用 SVG 组件）
- 不要在注册表中注册了图标但忘记在 `icons.ts` 中添加映射

---

## 九、常用模式

### 9.1 BottomSheet 模式

#### 单页信息展示

参考 `NetWorthExplainer`：

```tsx
<AppBottomSheet visible={visible} onClose={onClose} snapPoints={['50%']}>
  {/* 标题 */}
  <Text style={[styles.title, { color: theme.colors.onSurface }]}>
    标题
  </Text>

  {/* 公式框 / 核心信息 */}
  <View style={[styles.formulaBox, { backgroundColor: theme.colors.surfaceVariant }]}>
    <Text style={[styles.formulaText, { color: theme.colors.onSurface }]}>
      核心公式或信息
    </Text>
  </View>

  {/* 术语列表 */}
  <View style={styles.termList}>
    <TermItem label="术语" desc="解释" dotColor={theme.colors.primary} />
  </View>

  {/* 提示框 */}
  <View style={[styles.tipBox, { backgroundColor: theme.colors.primary + '12' }]}>
    <Icon name="Info" size={14} color={theme.colors.primary} />
    <Text style={[styles.tipText, { color: theme.colors.primary }]}>
      提示文字
    </Text>
  </View>
</AppBottomSheet>
```

#### 多页导航模式

参考 `HoldingCostExplainer`，使用内部 state 管理页面切换：

```tsx
const [page, setPage] = useState(0);
const TOTAL_PAGES = 3;

<AppBottomSheet visible={visible} onClose={handleClose} snapPoints={['85%']}>
  {page === 0 && <PageOneContent />}
  {page === 1 && <PageTwoContent />}
  {page === 2 && <PageThreeContent />}

  {/* 底部导航 */}
  <View style={styles.navRow}>
    <TouchableOpacity onPress={() => setPage(p => Math.max(p - 1, 0))}>
      <Icon name="ChevronLeft" size={20} color={theme.colors.onSurface} />
    </TouchableOpacity>

    <View style={styles.dots}>
      {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
        <View key={i} style={[
          styles.dot,
          { backgroundColor: i === page ? theme.colors.primary : theme.colors.outlineVariant }
        ]} />
      ))}
    </View>

    <TouchableOpacity onPress={() => setPage(p => Math.min(p + 1, TOTAL_PAGES - 1))}>
      <Icon name="ChevronRight" size={20} color={theme.colors.onSurface} />
    </TouchableOpacity>
  </View>
</AppBottomSheet>
```

### 9.2 Toast 通知模式

```tsx
// 成功
show('账户已添加', 'success');

// 失败（更长显示时间）
show('保存失败，请检查网络', 'error');

// 信息
show('已自动备份到本地', 'info');

// 自定义时长
show('操作完成', 'success', 3000);
```

### 9.3 表单验证模式

使用 `AppTextInput` 的 `error` prop 内联显示验证错误：

```tsx
const [name, setName] = useState('');
const [nameError, setNameError] = useState('');

const validate = () => {
  if (!name.trim()) {
    setNameError('名称不能为空');
    return false;
  }
  setNameError('');
  return true;
};

<AppTextInput
  label="名称"
  value={name}
  onChangeText={(text) => {
    setName(text);
    if (nameError) setNameError(''); // 输入时清除错误
  }}
  error={nameError || undefined}
  helperText={!nameError ? '给你的账户起个名字' : undefined}
/>
```

### 9.4 空状态模式

```tsx
{items.length === 0 ? (
  <EmptyState
    icon="Package"
    title="暂无内容"
    description="点击下方按钮创建"
    actionLabel="创建"
    onAction={() => setShowSheet(true)}
  />
) : (
  <FlatList data={items} renderItem={renderItem} />
)}
```

### 9.5 数据分解展示模式

参考 `HoldingCostBreakdown`，使用圆点 + 标签 + 百分比 + 数值行：

```tsx
<View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
  {layers.map((layer, i) => (
    <View key={i} style={styles.row}>
      <View style={[styles.dot, { backgroundColor: layer.color }]} />
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{layer.label}</Text>
      <Text style={[styles.pct, { color: theme.colors.tertiary }]}>{pct.toFixed(0)}%</Text>
      <Text style={[styles.value, { color: theme.colors.onSurface }]}>{formatCurrency(layer.value)}</Text>
    </View>
  ))}
  <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
  {/* 合计行 */}
</View>
```

### 9.6 获取主题的推荐方式

```tsx
import { useAppTheme } from '@/utils/format';

function MyComponent() {
  const theme = useAppTheme();

  // 访问颜色
  theme.colors.primary
  theme.colors.onSurface
  theme.colors.success

  // 访问 tokens
  theme.spacing.md    // 16
  theme.radius.lg     // 16
  theme.shadows.sm    // { elevation: 1 }

  // 访问字体
  theme.fonts.titleMedium

  // 暗色模式判断
  theme.dark          // boolean
}
```

---

## 十、格式化工具函数

定义在 `src/utils/format.ts`：

| 函数 | 用途 | 示例 |
|------|------|------|
| `formatCurrency(amount, symbol?)` | 格式化货币 | `formatCurrency(12345.6) → '¥12,345.60'` |
| `formatCompactCurrency(amount, symbol?)` | 紧凑货币 | `formatCompactCurrency(120000) → '¥12.0万'` |
| `formatDate(dateStr)` | 格式化日期 | `formatDate('2024-01-15') → '2024-01-15'` |
| `getCurrentMonth()` | 当前月份 | `'2026-07'` |
| `getCurrentDate()` | 当前日期 | `'2026-07-15'` |
| `getMonthsHeld(purchaseDate)` | 持有月数 | `getMonthsHeld('2024-01-15') → 18` |
| `formatDuration(months)` | 人类可读时长 | `formatDuration(26) → '2年2个月'` |

---

## 附录：完整文件结构

```
src/theme/
├── tokens.ts         # 间距、圆角、阴影、语义色
├── colors.ts         # 颜色构建（亮色/暗色 × 4 主题色）
├── typography.ts     # 字体层级定义
├── icons.ts          # 概念 → 图标名映射
├── build-theme.ts    # 主题构建器（合并所有 tokens）
├── ThemeProvider.tsx  # React 主题 Provider
└── index.ts          # 统一导出

src/components/ui/
├── Button.tsx        # AppButton
├── Card.tsx          # AppCard
├── Chip.tsx          # AppChip
├── TextInput.tsx     # AppTextInput
├── BottomSheet.tsx   # AppBottomSheet
├── FAB.tsx           # AppFAB
├── EmptyState.tsx    # EmptyState
├── Icon.tsx          # Icon（Lucide 注册表）
├── ListItem.tsx      # AppListItem
├── Toast.tsx         # ToastRenderer
└── index.ts          # 统一导出

src/hooks/
└── useToast.tsx      # Toast Context + Provider

src/utils/
└── format.ts         # useAppTheme + 格式化工具
```
