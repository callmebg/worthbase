## 1. 环境搭建与依赖安装

- [x] 1.1 安装新依赖: `react-native-paper`, `lucide-react-native`, `react-native-reanimated`, `react-native-gesture-handler`, `@gorhom/react-native-bottom-sheet`
- [x] 1.2 配置 `babel.config.js` 添加 `react-native-reanimated/plugin` (必须在最后)
- [x] 1.3 在 `_layout.tsx` 中导入 `react-native-gesture-handler` 并配置 `GestureHandlerRootView`

## 2. 设计 Token 系统 (Design System)

- [x] 2.1 创建 `src/theme/tokens.ts` — 定义间距、圆角、阴影的 token 常量 (spacing scale: xs=4, sm=8, md=16, lg=24, xl=32; radius scale: sm=8, md=12, lg=16, xl=20)
- [x] 2.2 创建 `src/theme/colors.ts` — 定义浅色/深色主题的完整颜色映射, 将现有 COLORS/DARK_COLORS 转换为 Paper MD3 主题格式, 支持 4 种用户可选主题色 (purple/blue/green/orange) 的 primary 色值映射
- [x] 2.3 创建 `src/theme/typography.ts` — 定义字体层级: display, headline, title, body, label, 每个级别包含 fontSize, fontWeight, lineHeight
- [x] 2.4 创建 `src/theme/build-theme.ts` — 实现 `buildTheme(themeColor, isDark)` 函数, 合并 colors + typography + tokens 为完整的 Paper theme 对象
- [x] 2.5 创建 `src/theme/ThemeProvider.tsx` — 实现 `ThemeProvider` 组件, 读取 settings-store 的 themeColor/darkMode + 系统 useColorScheme, 调用 buildTheme 生成主题, 包裹 PaperProvider + GestureHandlerRootView
- [x] 2.6 在 `app/_layout.tsx` 中用 ThemeProvider 包裹整个应用, 替换现有硬编码的 themeColor 传递
- [x] 2.7 将 `src/utils/format.ts` 中的 `COLORS` 常量标记为 deprecated, 添加 `useAppTheme()` hook 作为 `useTheme()` 的封装, 保持向后兼容

## 3. 共享 UI 组件库

- [x] 3.1 创建 `src/components/ui/Button.tsx` — 封装 Paper Button, 支持 variants: primary/secondary/text/icon, 默认 border radius, 集成 haptic feedback (可选)
- [x] 3.2 创建 `src/components/ui/Card.tsx` — 封装 Paper Card, 使用 token 的 radius/surface/elevation, 支持 onPress 和 selected 状态
- [x] 3.3 创建 `src/components/ui/BottomSheet.tsx` — 封装 @gorhom/react-native-bottom-sheet, 提供统一的 backdrop, snap points, gesture dismiss 配置
- [x] 3.4 创建 `src/components/ui/TextInput.tsx` — 封装 Paper TextInput, outlined 模式, 支持 error message 和 helperText
- [x] 3.5 创建 `src/components/ui/Chip.tsx` — 封装 Paper Chip, 支持 selected/unselected 状态切换, 可嵌入 Lucide 图标
- [x] 3.6 创建 `src/components/ui/ListItem.tsx` — 封装 Paper List.Item, 支持 Lucide 左图标, title/description, right element (chevron/switch/text)
- [x] 3.7 创建 `src/components/ui/EmptyState.tsx` — 包含 Lucide 图标, 主文本, 副文本, 可选操作按钮
- [x] 3.8 创建 `src/components/ui/FAB.tsx` — 封装 Paper FAB, 支持 Lucide 图标和可选文字标签
- [x] 3.9 创建 `src/components/ui/index.ts` — 统一导出所有 UI 组件

## 4. 图标系统迁移

- [x] 4.1 创建 `src/theme/icons.ts` — 定义 Tab 图标映射 (总览→LayoutDashboard, 账户→Wallet, 资产→Package, 设置→Settings), 账户类型图标映射, 资产类别图标映射, 操作图标映射
- [x] 4.2 创建 `src/components/ui/Icon.tsx` — 封装 Lucide 图标组件, 接受 name/color/size props, 自动适配主题颜色
- [x] 4.3 更新 `src/types/enums.ts` — 移除 `AccountTypeIcons`, `AssetCategoryIcons` 等 emoji 映射 (或标记 deprecated), 指向新的 Lucide 图标映射

## 5. 总览页面重新设计 (Dashboard)

- [x] 5.1 重构净资产卡片: 使用渐变背景 (LinearGradient 或 Paper Surface 加深色), display 级字体显示金额, 改进 breakdown 行的布局
- [x] 5.2 实现资产分类可视化: 添加按比例显示的 bar 列表, 每行包含 Lucide 类别图标 + 名称 + 百分比 + 金额
- [x] 5.3 改进趋势图表: 使用主题色渲染 LineChart, 改进轴标签样式, 时间范围切换改用 Chip 组件
- [x] 5.4 重构持有成本卡片: 使用 Card 组件, 改进 per-asset breakdown 行的比例条和 Lucide 图标
- [x] 5.5 重构快捷操作区: 使用 Card + Lucide 图标 (Wallet/PackagePlus/Download), 添加按压反馈动效
- [x] 5.6 确保 pull-to-refresh 使用主题色的 RefreshControl

## 6. 账户页面 UI 升级

- [x] 6.1 重构总余额卡片: 使用 Card 组件 + 主题色背景 + headline 字体
- [x] 6.2 重构 AccountCard: 使用 Card 组件 + Lucide 类型图标 + Button 组件替代 TouchableOpacity
- [x] 6.3 将 AddAccountModal 改为 BottomSheet + TextInput + Chip 网格 (含 Lucide 图标) + Button
- [x] 6.4 将 UpdateBalanceModal 改为 BottomSheet + TextInput + Button
- [x] 6.5 将 BalanceHistoryModal 改为 BottomSheet + FlatList of ListItem
- [x] 6.6 将 EditAccountModal 改为 BottomSheet + 表单组件, 底部添加 danger 色 Delete Button
- [x] 6.7 确保所有账户组件响应深色模式 (使用 useTheme 替代 COLORS)

## 7. 资产页面 UI 升级

- [x] 7.1 重构 overview 统计卡片: 使用 Card 组件 + headline/body 字体层级
- [x] 7.2 将状态筛选器改用 Chip 组件 (全部/使用中/退役/已售), 支持 selected 状态切换
- [x] 7.3 重构 AssetCard: 使用 Card 组件 + Lucide 类别图标 + Chip 状态徽章 + 改进布局
- [x] 7.4 重构分类组头部: 使用 Lucide 图标替代 emoji, 改进间距和视觉层级
- [x] 7.5 将 FAB 改用共享 FAB 组件 + Lucide Plus 图标
- [x] 7.6 重构 EmptyState: 使用共享 EmptyState 组件 (Package 图标 + 提示文字)
- [x] 7.7 更新 AddAssetModal: 将内部表单控件替换为共享 TextInput/Chip/Button/DatePickerField
- [x] 7.8 更新 AssetDetailModal: 将内部按钮替换为共享 Button 组件 (retire=warning outlined, sell=danger outlined)
- [x] 7.9 确保所有资产组件响应深色模式 (使用 useTheme 替代 COLORS)

## 8. 设置页面 UI 升级

- [x] 8.1 重构 section 布局: 使用 Card 组件包裹每个设置区块 (安全/外观/目标/数据/关于)
- [x] 8.2 将设置行替换为 ListItem 组件 + Lucide 图标 (Lock/Fingerprint/Palette/Moon/Globe/Target/FileJson/FileSpreadsheet/FileDown/HardDrive/Info)
- [x] 8.3 重构主题色选择器: 使用 Button 组件显示色块 + Check 图标表示选中状态
- [x] 8.4 重构深色模式选择器: 使用 Chip 组件 (跟随系统/浅色/深色)
- [x] 8.5 重构货币选择器: 使用 Chip 组件显示货币符号选项
- [x] 8.6 将 PIN 设置弹窗改为 BottomSheet + TextInput + Button
- [x] 8.7 将备份管理列表改为 BottomSheet + ListItem 列表
- [x] 8.8 确保设置页面在深色模式下完全适配 (已通过 useColors 部分实现, 需迁移到 useTheme)

## 9. 导航栏升级

- [x] 9.1 在 `_layout.tsx` 的 Tabs 配置中使用 Lucide 图标替代 emoji, 通过 tabBarIcon render prop 返回 Icon 组件
- [x] 9.2 配置 tabBarStyle 使用 theme tokens (背景色, 边框色), 确保深色模式适配
- [x] 9.3 配置 headerStyle 使用 theme tokens (标题颜色, 背景色)

## 10. 锁屏与引导页升级

- [x] 10.1 更新 LockScreen: 将 PIN pad 按钮替换为共享 Button 组件, 使用 design tokens 替代硬编码颜色, 保持 Reanimated shake 动画
- [x] 10.2 更新 OnboardingView: 使用 Card/Button/Icon 组件重构, 使用 Lucide 图标替代 emoji 功能说明

## 11. 组件迁移与清理

- [x] 11.1 更新 HoldingCostBreakdown: 使用 Card 组件和设计 token 颜色替代硬编码样式
- [x] 11.2 更新 SettlementModal: 将内部表单替换为 BottomSheet + TextInput + Button
- [x] 11.3 更新 ValuationChart: 使用主题色渲染图表, 改进空状态显示
- [x] 11.4 更新 DatePickerField: 确保样式与设计系统一致
- [x] 11.5 清理 `src/utils/format.ts`: 移除 deprecated COLORS 常量 (确保所有引用已迁移), 保留纯工具函数 (formatCurrency, formatDate 等)
- [x] 11.6 移除所有页面中的内联 Modal 子组件 (accounts.tsx 中的 AddAccountModal/UpdateBalanceModal 等), 改为从共享组件导入

## 12. 动效与打磨

- [x] 12.1 使用 Reanimated 为 Card 组件添加按压 scale 动画 (scale: 0.98, duration: 100ms)
- [x] 12.2 为 BottomSheet 的 open/close 添加进出场过渡
- [x] 12.3 为 Dashboard 的数值显示添加数字变化动画 (countUp 效果, 可选)
- [x] 12.4 配置 Expo Router 的页面切换动画 (如 slide_from_right)

## 13. 测试与验证

- [x] 13.1 运行现有 36 个单元测试, 确保 engine 逻辑未受影响
- [x] 13.2 手动测试浅色/深色模式切换在所有页面的表现
- [x] 13.3 手动测试 4 种主题色在所有页面的表现
- [x] 13.4 测试 BottomSheet 的手势关闭、键盘适配、backdrop 点击
- [x] 13.5 测试所有表单的输入验证和错误状态显示
- [x] 13.6 测试空状态 (无账户/无资产/无余额历史) 的 EmptyState 显示
