## Why

UI 大重构（ui-big-update）引入了 React Native Paper + Lucide 图标系统，但由于 Paper 组件的 icon prop 接口与 Lucide 图标名称不兼容、expo-file-system v57 API 破坏性变更、以及 BottomSheet 键盘适配不完整，导致多处 UI 功能失效和数据服务完全不可用。需要立即修复以恢复应用基本功能。

## What Changes

- 修复 AppChip 和 AppButton 的 icon prop：当前将 Lucide 图标名作为字符串传给 Paper 的 icon prop（期望 Material Community Icons 名称），导致图标不渲染。改为在组件内部渲染自定义 Icon 组件
- 修复设置页主题颜色选择器：Paper Button 的 buttonColor 覆盖了 inline backgroundColor，导致色块始终显示为 Paper 默认色。改用 TouchableOpacity + 圆形样式 + Check 图标
- 修复货币符号列表重复：CURRENCY_OPTIONS 数组中 `¥` 出现两次（index 0 和 5），替换为不同货币符号
- 修复 BottomSheet 内键盘遮挡输入框：AppTextInput 使用标准 Paper TextInput，BottomSheet 的键盘管理无法感知。改用 BottomSheetTextInput
- 修复 expo-file-system v57 API 兼容性：v57 彻底改变了 API（旧的 documentDirectory/writeAsStringAsync 等不再从主入口导出），导出/导入/备份三个服务全部失效。改用 `expo-file-system/legacy` 子路径
- 修复总览页趋势图表：确认 LineChart 宽度计算是否正确适配 AppCard 容器内边距

## Capabilities

### New Capabilities
（无新增能力）

### Modified Capabilities
- `ui-components`: AppChip、AppButton 的 icon 渲染机制变更；AppTextInput 在 BottomSheet 中的键盘适配；AppBottomSheet 需要支持 BottomSheetTextInput 的导出和使用模式
- `app-settings`: 主题颜色选择器从 Paper Button 改为自定义色块组件；货币符号选项修正重复值
- `data-management`: export-service、import-service、backup-service 的 expo-file-system 导入路径迁移到 legacy 子路径

## Impact

- **代码影响**: `src/components/ui/Chip.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/TextInput.tsx`, `src/components/ui/BottomSheet.tsx`, `app/settings.tsx`, `src/services/export-service.ts`, `src/services/import-service.ts`, `src/services/backup-service.ts`
- **依赖变更**: 无新依赖，仅修改 expo-file-system 的导入路径
- **破坏性变更**: 无。所有修复都是内部实现变更，不影响公共 API
- **测试影响**: 需要更新 jest.setup.ts 中的 expo-file-system mock 路径
