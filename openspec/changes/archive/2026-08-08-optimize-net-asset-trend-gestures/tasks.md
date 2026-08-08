## 1. 移除总览手势提示文案

- [x] 1.1 在 `app/index.tsx` 中删除 line 432 附近的手势提示 `<Text>` 元素（"左右滑动平移 · 双指缩放 · 点击查看详情"）及其 `gestureHint` 样式定义
- [x] 1.2 验证总览趋势卡片渲染正常，无残留间距或空白

## 2. 升级 InteractiveTrendChart 手势到新 Gesture Builder API

- [x] 2.1 将 `InteractiveTrendChart.tsx` 中现有的 `PanGestureHandler`、`PinchGestureHandler`、`TapGestureHandler` 旧 API 替换为 `Gesture.Pan()`、`Gesture.Pinch()`、`Gesture.Tap()` 新 API
- [x] 2.2 使用 `Gesture.Simultaneous()` 组合三个手势，替代旧的 `simultaneousHandlers` ref 模式
- [x] 2.3 将手势状态管理从 `onHandlerStateChange` 事件迁移到 `onBegin`/`onUpdate`/`onEnd` 回调
- [x] 2.4 验证平移、缩放、点击 tooltip 三个基础手势在新 API 下正常工作

## 3. 添加 mode prop 区分总览/全屏模式

- [x] 3.1 在 `InteractiveTrendChart` 的 Props 接口中添加 `mode?: 'overview' | 'fullscreen'` 属性
- [x] 3.2 总览模式（默认）保持现有手势行为不变
- [x] 3.3 全屏模式启用增强手势配置：更大的手势灵敏度、实时日期更新

## 4. 全屏平移手势——操控时间起止日期

- [x] 4.1 在全屏模式下，将平移偏移量转换为日期偏移（基于数据点的时间间隔），实时平移可见时间窗口
- [x] 4.2 平移过程中使用 ref 跟踪快照 + React state 更新（SVG 渲染在 JS 线程，无需 `useSharedValue`）
- [x] 4.3 约束平移范围：不能超出数据的起止日期边界
- [x] 4.4 平移时实时更新 X 轴日期标签和可见时间范围指示器

## 5. 全屏双指缩放手势——缩放时间范围

- [x] 5.1 在全屏模式下，双指缩放以触点（pinch center）为中心对称缩放可见时间范围
- [x] 5.2 pinch-out（张开）缩小时间范围（zoom in），最小 3 个数据点；pinch-in（捏合）扩大时间范围（zoom out），最大全部数据点
- [x] 5.3 缩放过程中实时更新 X 轴标签和数据窗口

## 6. 手势组合与边界情况

- [x] 6.1 确保平移和缩放手势可连续交替操作，每个手势基于前一个手势结束后的窗口状态
- [x] 6.2 处理横屏坐标系方向——`react-native-gesture-handler` v2 自动处理屏幕方向坐标转换
- [x] 6.3 手势结束后确保最终状态（windowStart、windowSize）稳定，不产生抖动或回弹

## 7. 测试与验证

- [ ] 7.1 在真机上测试全屏模式：左右滑动平移时间窗口流畅
- [ ] 7.2 在真机上测试全屏模式：双指缩放时间范围流畅
- [x] 7.3 验证总览卡片无手势提示文案显示
- [ ] 7.4 验证总览卡片的手势交互（平移/缩放/tooltip）仍正常工作
- [ ] 7.5 验证全屏模式下时间范围预设按钮（3m/6m/1y 等）仍可正常使用
