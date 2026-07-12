## Why

WorthBase (家底) 的 UI 目前使用原生 StyleSheet 手写样式、emoji 图标和硬编码颜色值，各页面间样式重复且不一致。深色模式仅在设置页通过 `useColors` hook 局部支持，大部分页面仍使用静态 `COLORS` 常量。整体视觉呈现停留在原型阶段，缺乏统一的组件库、设计 token 和交互动效，影响用户体验和专业感。现在进行全面现代化，为后续功能迭代打下坚实的 UI 基础。

## What Changes

- 引入 UI 组件库（React Native Paper）作为基础组件层，替换手写的 Button、TextInput、Modal、Switch 等基础控件
- 建立统一的设计系统：design tokens（颜色、字体、间距、圆角、阴影），支持完整的浅色/深色主题切换
- 用 Lucide React Native 图标库替换所有 emoji 图标（Tab 图标、资产类别图标、操作按钮图标）
- 重新设计总览 Dashboard：改进净资产卡片布局、引入更好的图表展示、添加资产分类饼图
- 重新设计账户和资产列表页：改进卡片样式、添加滑动操作、改进空状态和加载状态
- 重新设计所有表单和弹窗：使用 Bottom Sheet 模式、改进输入组件、添加表单验证反馈
- 升级 Tab 导航：使用图标替代 emoji、改进导航栏样式和过渡动画
- 添加微交互动效（按钮反馈、页面过渡、数值变化动画）

## Capabilities

### New Capabilities
- `design-system`: 统一的设计 token 系统（颜色、字体、间距、圆角、阴影），浅色/深色主题定义，主题 Provider，替换现有 COLORS 常量和 useColors hook
- `ui-components`: 基于 React Native Paper 的共享组件库 — Button、Card、Modal/BottomSheet、TextInput、Chip/Tag、List、EmptyState 等基础组件，封装为项目级别的统一组件
- `dashboard-redesign`: 总览页面重新设计 — 改进净资产卡片（渐变背景、更好的数据层级）、资产分类可视化（饼图或进度条）、改进趋势图表交互、添加快捷操作区

### Modified Capabilities
- `account-management`: 账户列表 UI 升级 — 使用新组件库重写 AccountCard、Modal 表单，添加滑动操作（编辑/删除），改进余额更新流程
- `asset-management`: 资产列表 UI 升级 — 使用新组件库重写 AssetCard、筛选器、FAB，改进分类分组展示，添加滑动删除
- `app-settings`: 设置页 UI 升级 — 使用新组件库重写设置列表、主题选择器、PIN 设置弹窗，改进分区和视觉层级

## Impact

- **依赖变更**: 新增 `react-native-paper`、`lucide-react-native`、`react-native-reanimated`（动效）；可能需要 `react-native-gesture-handler`、`react-native-bottom-sheet`
- **代码影响**: 所有 4 个页面文件（`app/*.tsx`）、所有 8 个组件（`src/components/*.tsx`）、`src/utils/format.ts`（COLORS 常量迁移到 design tokens）、`app/_layout.tsx`（导航和主题 Provider 重构）
- **破坏性变更**: 现有 `COLORS` 常量和 `useColors` hook 将被新的 design token 系统替代，所有引用处需迁移
- **配置变更**: 需要更新 `babel.config.js`（Reanimated 插件）、`app.json`（导航主题）
