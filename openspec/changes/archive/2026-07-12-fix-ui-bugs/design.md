## Context

WorthBase 的 ui-big-update 变更引入了 React Native Paper 组件库和 Lucide 图标系统，替换了原有的手写样式和 emoji 图标。在实施过程中产生了多个集成问题：

1. **Paper icon 接口不匹配**：Paper 的 `icon` prop 期望 Material Community Icons 名称（如 `'wallet'`）或 React 元素，但我们传入的是 Lucide 图标名字符串（如 `'Wallet'`），Paper 内部无法解析，导致图标不渲染。受影响的组件：AppChip、AppButton。
2. **主题色选择器失效**：使用 AppButton 作为色块展示，但 Paper Button 内部 `buttonColor` 样式覆盖了 inline `backgroundColor`，且 `labelStyle={{ display: 'none' }}` 在 React Native 中无效。
3. **expo-file-system v57 破坏性变更**：SDK 57 将旧 API 移至 `expo-file-system/legacy` 子路径，主入口改为 class-based 新 API（File/Directory/Paths），导致 3 个数据服务完全失效。
4. **BottomSheet 键盘管理**：`@gorhom/bottom-sheet` 的键盘适配仅对 `BottomSheetTextInput` 生效，内部使用的 Paper TextInput 不在键盘管理范围内。
5. **货币符号重复**：`CURRENCY_OPTIONS` 数组中 `¥` 出现两次。

## Goals / Non-Goals

**Goals:**
- 修复所有 UI 图标渲染问题，确保 Lucide 图标在 Chip、Button 等组件中正确显示
- 修复主题颜色选择器的视觉反馈，确保色块正确显示用户选择的颜色
- 修复 expo-file-system API 兼容性，恢复 JSON 导出/导入和自动备份功能
- 修复 BottomSheet 内的键盘遮挡问题
- 修正货币符号重复

**Non-Goals:**
- 不迁移到 expo-file-system v57 的新 class-based API（使用 legacy 路径保持最小改动）
- 不重写任何页面的业务逻辑
- 不新增 UI 组件或功能

## Decisions

### 1. AppChip/AppButton icon 渲染策略

**Choice**: 在 AppChip 和 AppButton 内部，不再将 icon 字符串传给 Paper 的 `icon` prop，改为自行渲染 `<Icon>` 组件，并通过 Paper 组件的 `left`/自定义布局来放置。

**Alternatives considered**:
- 将 Lucide 图标名映射为 Material Community Icons 名称 → 维护成本高，两套图标命名不一致
- 将 Paper 的 `icon` prop 传入 React 元素（`() => <Icon name={icon} />`）→ Paper 对此支持有限，部分组件不接受函数形式的 icon

**Rationale**: 自行控制图标渲染是最可靠的方案。Chip 组件可以在 label 左侧手动放置 Icon；Button 组件可以使用 Paper 的 `icon` prop 传入 React 元素。

### 2. 主题色选择器组件方案

**Choice**: 用 `TouchableOpacity` + `View`（圆形色块）+ 条件 `Check` 图标，替代 AppButton。

**Rationale**: 主题色选择器本质上不是按钮，而是一个色块选择器。用简单的 TouchableOpacity + View 可以完全控制背景色，不受 Paper Button 内部样式干扰。

### 3. expo-file-system 迁移路径

**Choice**: 将 3 个服务的 `import * as FileSystem from 'expo-file-system'` 改为 `import * as FileSystem from 'expo-file-system/legacy'`。

**Alternatives considered**:
- 迁移到新 class-based API（`new File(path).write()`）→ 改动量大，需要重写所有文件操作代码，风险高
- 降级 expo-file-system 版本 → 与 Expo SDK 57 不兼容

**Rationale**: legacy 子路径提供了完全相同的旧 API，零代码逻辑改动。这是 Expo 官方推荐的过渡方案。

### 4. BottomSheet 键盘适配方案

**Choice**: 创建 `AppBottomSheetTextInput` 组件封装 `BottomSheetTextInput`，在 BottomSheet 内部的表单中替代 `AppTextInput`。同时让 AppTextInput 支持 `bottomSheet` prop 来自动切换。

**Rationale**: 最小改动方案。不需要修改 BottomSheet 组件本身，只需要在调用侧将 TextInput 替换为 BottomSheet 兼容版本。

## Risks / Trade-offs

- **[Legacy API 未来移除]** `expo-file-system/legacy` 是过渡方案，未来 Expo 版本可能移除 → 后续版本升级时需要迁移到新 API，但当前优先级低于功能修复
- **[AppButton icon 改动影响面]** AppButton 的 icon 渲染方式变更会影响所有使用该 prop 的地方 → 需要验证所有调用点的 icon 显示是否正常
- **[BottomSheetTextInput 兼容性]** BottomSheetTextInput 与 Paper TextInput 的样式可能不完全一致 → 需要调整样式以保持一致
