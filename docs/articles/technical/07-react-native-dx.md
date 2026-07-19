[TOC]

# React Native / Expo 开发体验：项目结构、跨平台适配与构建发布

> 一个独立开发者的 Expo 实战手册。

## 项目结构

```
worthbase/
├── app/                    # Expo Router 页面（文件系统路由）
│   ├── _layout.tsx         # 根布局：DB初始化 + Tab导航 + 自动备份 + 应用锁
│   ├── index.tsx           # 总览 Dashboard (782行，最复杂的页面)
│   ├── accounts.tsx        # 账户列表
│   ├── assets.tsx          # 资产列表
│   └── settings.tsx        # 设置（隐藏Tab，通过齿轮图标进入）
│
├── src/
│   ├── engine/             # 纯计算逻辑（无UI依赖，可独立测试）
│   ├── db/                 # SQLite + Repository 模式
│   ├── stores/             # Zustand 状态管理（3个store）
│   ├── services/           # 业务服务（备份、导入导出、认证）
│   ├── components/         # UI组件
│   │   └── ui/             # 基础组件（Button, Card, Chip, TextInput...）
│   ├── theme/              # 主题系统（颜色、token、暗色模式）
│   ├── hooks/              # 自定义Hooks
│   ├── types/              # TypeScript类型和枚举
│   └── utils/              # 工具函数（格式化、校验、加密）
│
├── __tests__/              # Jest测试（engine.test.ts, service.test.ts）
├── assets/                 # 静态资源
├── app.json                # Expo配置
├── eas.json                # EAS Build配置
├── babel.config.js
├── jest.config.js
└── tsconfig.json
```

**分层原则**：
- `engine/` 不依赖任何 React/RN 模块 → 可以用纯 Jest 测试
- `db/` 只依赖 `expo-sqlite` → Repository 模式隔离数据层
- `stores/` 连接数据层和 UI → Zustand 的 `set` 触发重渲染
- `components/` 只关心 UI 渲染 → 通过 store 获取数据

## Expo 开发工作流

### 开发环境

```bash
npx expo start            # 启动开发服务器
# 手机扫 Expo Go 二维码即可预览
```

Expo Go 的限制：不支持自定义原生模块。WorthBase 用到的 `expo-sqlite`、`expo-file-system`、`expo-local-authentication` 都是 Expo 官方模块，Expo Go 直接支持。

如果需要自定义原生模块，用 **Development Build**：

```bash
npx expo run:android      # 构建并安装到 Android 设备/模拟器
npx expo run:ios          # 构建并安装到 iOS 设备/模拟器
```

### 热更新

修改代码后设备自动刷新，不需要重新构建。这对 UI 调优特别有用——改一个颜色、调一个间距，秒级看到效果。

### 调试

```bash
# Chrome DevTools
# 在设备上摇一摇 → 选 "Debug Remote JS"

# 或者用 React DevTools
npx react-devtools
```

### 常见坑

**坑 1：`AppState` 在 iOS 模拟器上的行为不一致**

`AppState` 从 `active` 到 `background` 的触发时机在模拟器和真机上不同。自动备份功能在模拟器上可能不触发，必须在真机上测试。

**坑 2：SQLite 在热更新后的状态**

Expo 热更新不会重新初始化 SQLite 连接。如果你改了 `schema.ts`（比如加了一张表），需要完全重启 App（不是热更新），或者用 migration 处理。

**坑 3：Gesture Handler 的版本兼容**

`react-native-gesture-handler` 的新旧 API 差异较大。WorthBase 用的是旧版 API（`onHandlerStateChange` + `onGestureEvent`），因为 `InteractiveTrendChart` 开发时新 API 还不够稳定。

## 跨平台适配

### Platform.select

大部分情况下，React Native 的 Flexbox 布局在 Android 和 iOS 上表现一致。但有几个场景需要平台适配：

```typescript
import { Platform } from 'react-native';

// 示例 1：阴影处理
const cardStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  ...Platform.select({
    android: { elevation: 6 },      // Android 用 elevation
    ios: { shadowOffset: { width: 0, height: 2 } },  // iOS 用 shadow props
  }),
};

// 示例 2：安全区域
import { SafeAreaView } from 'react-native-safe-area-context';
// 用 SafeAreaView 包裹页面，自动处理刘海屏和底部手势条
```

### 日期选择器

`@react-native-community/datetimepicker` 在 Android 和 iOS 上的 UI 完全不同：
- Android：弹窗模式（Modal）
- iOS：内联模式（inline）

需要分别处理显示逻辑。

### 手势处理差异

Android 的返回手势（边缘滑动）可能和图表的拖拽手势冲突。通过 Gesture Handler 的 `exclusive` 配置解决：

```typescript
<PanGestureHandler
  onGestureEvent={onPan}
  onHandlerStateChange={onPanStateChange}
  minDist={10}
  // 只在水平方向触发，避免和垂直滚动冲突
  activeOffsetX={[-10, 10]}
  failOffsetY={[-5, 5]}
>
```

## EAS Build 构建与发布

### 配置文件

```json
{
  "cli": {
    "version": "latest",
    "promptToConfigurePushNotifications": false
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

**三个构建环境**：

| 环境 | 用途 | Android 格式 | iOS |
|------|------|-------------|-----|
| development | 本地开发调试 | APK (development client) | Simulator |
| preview | 内部测试分发 | APK | — |
| production | 正式发布 | AAB (Google Play) | — |

### 构建命令

```bash
eas build --profile development --platform android  # 开发版 APK
eas build --profile preview --platform android       # 预览版 APK
eas build --profile production --platform android    # 正式版 AAB
```

WorthBase 目前只使用 `preview` profile 构建 APK，通过 GitHub Release 分发。

## 3 个可复用模式

### 模式 1：Repository 封装数据库操作

```typescript
// 可复用：将 SQLite 操作封装为 Repository 对象
export const AccountRepository = {
  async getAll(): Promise<Account[]> { ... },
  async create(data: CreateAccount): Promise<Account> { ... },
  async update(id: string, updates: Partial<Account>): Promise<void> { ... },
  async delete(id: string): Promise<void> { ... },  // 软删除
};
```

**好处**：页面代码不直接写 SQL，测试时可以 mock Repository。

### 模式 2：Zustand Store 同步数据库

```typescript
// 可复用：Store 的 action 先写数据库，再更新内存状态
addAsset: async (data) => {
  const asset = await AssetRepository.create(data);  // 先写DB
  set(state => ({ assets: [asset, ...state.assets] })); // 再更新状态
  return asset;
},
```

**好处**：数据持久化和 UI 状态保持同步，页面不需要关心存储细节。

### 模式 3：纯引擎函数 + 独立测试

```typescript
// 可复用：将计算逻辑抽成纯函数，不依赖任何 React/RN 模块
export const NetWorthCalculator = {
  async calculate(currentDate: Date): Promise<NetWorthResult> { ... },
};

// 测试时直接用 Jest，不需要渲染组件
test('net worth = liquid + assets', async () => {
  const result = await NetWorthCalculator.calculate();
  expect(result.netWorth).toBe(result.liquidAssets + result.assetValuations);
});
```

**好处**：核心业务逻辑可以脱离 UI 独立测试，测试速度快，覆盖面广。

🔗 **源码**: [github.com/callmebg/worthbase](https://github.com/callmebg/worthbase) | [eas.json](https://github.com/callmebg/worthbase/blob/main/eas.json) | [package.json](https://github.com/callmebg/worthbase/blob/main/package.json)

---

> **CSDN 标签**: `React Native` `Expo` `跨平台` `EAS` `最佳实践`
> **掘金话题**: `前端` `React Native` `Expo` `工程化`
