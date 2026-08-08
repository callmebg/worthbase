## Context

当前净资产趋势图表组件 `InteractiveTrendChart`（`src/components/InteractiveTrendChart.tsx`，~541行）是一个基于 `react-native-svg` 的自定义 SVG 图表，已在两个场景中使用：

1. **总览卡片**（`app/index.tsx` ~359-466行）：嵌入 ScrollView 中，高度固定 200px，下方有手势提示文案 "左右滑动平移 · 双指缩放 · 点击查看详情"（line 432）
2. **全屏模式**（`app/index.tsx` ~642-706行）：通过 Modal 展示，锁定横屏，使用 `flex: 1` 布局

现有手势实现使用 `react-native-gesture-handler` v2.30.0 的**旧 API**（`PanGestureHandler`、`PinchGestureHandler`、`TapGestureHandler` 三层嵌套 + `simultaneousHandlers`），手势在两个场景中完全相同——没有针对全屏模式做专门优化。

项目根布局（`app/_layout.tsx`）已包裹 `GestureHandlerRootView`，基础设施就绪。

## Goals / Non-Goals

**Goals:**
- 移除总览趋势卡片上的手势提示文案，保持视觉简洁
- 将全屏模式的手势交互升级为 RN-GH v2 新 Gesture Builder API，获得更好的原生手势性能和更灵活的组合控制
- 全屏平移手势直接操控时间窗口的起止日期（而非数据索引偏移）
- 全屏双指缩放以触点为中心对称缩放时间范围
- 手势组合流畅：平移和缩放可连续交替操作

**Non-Goals:**
- 不改动总览卡片中的手势行为（保持现状或也一并升级均可，但核心目标是全屏体验）
- 不修改趋势数据的计算逻辑、数据源或持久化
- 不引入新的图表库
- 不改动时间范围预设按钮（3m/6m/1y/YTD/all）的功能

## Decisions

### Decision 1: 使用 RN-GH v2 Gesture Builder API 替代旧 API

**选择**: 使用 `Gesture.Pan()`、`Gesture.Pinch()`、`Gesture.Tap()` 配合 `Gesture.Simultaneous()` 组合器

**理由**:
- 新 API 提供更好的原生线程手势处理，减少 JS 线程桥接延迟
- `Gesture.Simultaneous()` 比旧 API 的 `simultaneousHandlers` ref 更直观
- 支持 `onUpdate` 回调实现实时响应（而非旧 API 的 event-based 模式）
- 与现有 `GestureHandlerRootView` 完全兼容

**替代方案**: 保持旧 API 不变 → 手势功能已可用，但性能和代码可维护性不如新 API

### Decision 2: 全屏手势在 InteractiveTrendChart 组件内实现，通过 prop 区分模式

**选择**: 给 `InteractiveTrendChart` 添加 `mode` prop（`'overview' | 'fullscreen'`），全屏模式下启用增强手势

**理由**:
- 避免创建重复的全屏专用组件
- 共享 SVG 渲染逻辑、坐标计算、数据窗口等核心代码
- 手势差异仅在于参数配置和响应方式，不影响渲染层

**替代方案**: 创建独立的 `FullscreenTrendChart` 组件 → 代码重复度高，维护成本翻倍

### Decision 3: 平移手势使用 useSharedValue 驱动，实时更新日期标签

**选择**: 使用 `useSharedValue` 和 `useAnimatedStyle` 存储手势状态，平移时通过 `runOnJS` 回调更新 React state 中的起止日期

**理由**:
- `useSharedValue` 在 UI 线程运行，手势响应零延迟
- 平移偏移量通过 `runOnJS` 桥接回 React state，触发日期标签重渲染
- 保持 SVG 重渲染在 JS 线程（SVG 不支持 worklet），但手势跟踪仍在 UI 线程

### Decision 4: 简单移除提示文案，不添加替代 UI

**选择**: 直接删除 `app/index.tsx` line 432 的手势提示 `<Text>` 元素

**理由**:
- 图表交互本身已足够直观（拖拽/缩放是移动端用户的自然行为）
- 减少视觉噪音，符合极简设计理念
- 全屏模式提供完整的交互探索空间

**替代方案**: 改为首次使用时显示的引导气泡 → 增加复杂度，收益有限

## Risks / Trade-offs

- **[风险] 新 Gesture API 与 ScrollView 手势冲突** → 全屏模式在独立 Modal 中运行，不受外层 ScrollView 影响；总览模式保持现有手势不变
- **[风险] SVG 重渲染性能** → SVG 不支持 worklet 渲染，平移时会有 JS 线程延迟。缓解：使用 `requestAnimationFrame` 节流状态更新，确保每帧最多一次重渲染
- **[风险] 横屏模式下 pinch 手势的方向感知** → 横屏时坐标系可能旋转。缓解：使用 `react-native-gesture-handler` 的内置坐标转换，它会自动处理屏幕方向
- **[权衡] 平移精度 vs 性能** → 实时平移需要频繁 state 更新，可能对低端设备造成卡顿。缓解：平移过程中用动画值驱动视觉反馈（轻量），手指抬起后才提交最终状态（重量）
