## 1. UI 组件图标渲染修复

- [x] 1.1 修复 `src/components/ui/Chip.tsx`: 不再将 `icon` 字符串传给 Paper 的 `icon` prop，改为在内部渲染 `<Icon>` 组件放在 label 左侧
- [x] 1.2 修复 `src/components/ui/Button.tsx`: 将 `icon` prop 转为 React 元素 `() => <Icon name={icon} />` 传给 Paper 的 `icon` prop
- [x] 1.3 验证所有使用 `AppChip icon=` 的地方图标正确显示（accounts AddAccountSheet, assets 筛选, settings 深色模式选择器）
- [x] 1.4 验证所有使用 `AppButton icon=` 的地方图标正确显示（accounts action buttons, dashboard quick actions, OnboardingView）

## 2. 设置页主题颜色选择器修复

- [x] 2.1 将 `app/settings.tsx` 中主题颜色选择器从 `AppButton` 改为 `TouchableOpacity` + `View` 圆形色块 + 条件 `Check` 图标
- [x] 2.2 确保色块背景色正确显示 4 种主题颜色（purple/blue/green/orange）
- [x] 2.3 确保选中状态显示白色 Check 图标，未选中状态无图标
- [x] 2.4 移除无效的 `labelStyle={{ display: 'none' }}`

## 3. 货币符号重复修复

- [x] 3.1 修复 `app/settings.tsx` 中 `CURRENCY_OPTIONS` 数组：将重复的 `¥`（index 5）替换为 `¥`（日元 U+00A5）或其他不重复的货币符号

## 4. BottomSheet 键盘遮挡修复

- [x] 4.1 在 `src/components/ui/TextInput.tsx` 中添加 `bottomSheet` boolean prop，当为 true 时使用 `BottomSheetTextInput` 替代 Paper TextInput
- [x] 4.2 更新 `src/components/ui/BottomSheet.tsx` 确保 `BottomSheetTextInput` 正确导出
- [x] 4.3 更新 `app/accounts.tsx` 中 UpdateBalanceSheet 和 AddAccountSheet 的 TextInput 添加 `bottomSheet` prop
- [x] 4.4 更新 `src/components/SettlementModal.tsx` 和 `src/components/AddAssetModal.tsx` 中的 TextInput 添加 `bottomSheet` prop
- [x] 4.5 更新 `src/components/AssetDetailModal.tsx` 中估值更新 BottomSheet 的 TextInput 添加 `bottomSheet` prop

## 5. expo-file-system v57 兼容性修复

- [x] 5.1 修改 `src/services/export-service.ts`: 将 `import * as FileSystem from 'expo-file-system'` 改为 `import * as FileSystem from 'expo-file-system/legacy'`
- [x] 5.2 修改 `src/services/backup-service.ts`: 同上修改导入路径
- [x] 5.3 修改 `src/services/import-service.ts`: 同上修改导入路径
- [x] 5.4 更新 `jest.setup.ts` 中的 expo-file-system mock: 添加 `expo-file-system/legacy` 的 mock 映射

## 6. 趋势图表宽度适配

- [x] 6.1 检查 `app/index.tsx` 中 LineChart 的 `width` 计算，确保在 AppCard 容器内正确渲染（考虑 Card 的 padding）

## 7. 测试与验证

- [x] 7.1 运行全部单元测试确保无回归
- [x] 7.2 验证 JSON 导出功能正常（文件写入 + 分享对话框）
- [x] 7.3 验证 BottomSheet 内输入框不被键盘遮挡
