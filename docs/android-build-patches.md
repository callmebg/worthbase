# Android 构建补丁与优化记录

> 适用于：Expo SDK 54 + React Native 0.81.5
> 最后更新：2026-07-15

## 背景

原始 arm64 APK 体积 45MB，需要缩小。在优化过程中发现 Expo SDK 54 的 prebuild 模板和 RN 0.81.5 之间存在多处不兼容，逐一修复并记录如下。

---

## 一、APK 体积优化

### 修改文件

| 文件 | 修改方式 |
|------|---------|
| `android/gradle.properties` | 由 config plugin 自动注入 |
| `android/app/proguard-rules.pro` | 由 config plugin 自动追加 |

### 优化项

| 配置项 | 原值 | 优化后 | 预估节省 |
|--------|------|--------|---------|
| `reactNativeArchitectures` | `armeabi-v7a,arm64-v8a,x86,x86_64` | `arm64-v8a` | ~15-20 MB |
| `android.enableMinifyInReleaseBuilds` | `false` | `true` | ~5-8 MB（R8 代码压缩） |
| `android.enableShrinkResourcesInReleaseBuilds` | `false` | `true` | ~1-3 MB |
| `expo.useLegacyPackaging` | `false` | `true` | ~2-4 MB（压缩 .so） |

### ProGuard Keep 规则

为以下模块添加了 keep 规则（防止 R8 误删）：
- React Native 核心 / Hermes / JNI
- react-native-reanimated / screens / gesture-handler
- expo-sqlite / secure-store / local-authentication / modules-core
- react-native-svg / safe-area-context
- OkHttp / Kotlin / JSR305 注解

---

## 二、Expo Prebuild 模板修复

`npx expo prebuild` 会重新生成整个 `android/` 目录。以下问题通过 **config plugin** (`plugins/with-android-optimize.js`) 在 prebuild 后自动修复。

### Patch 1：gradle.properties 优化注入

**问题**：prebuild 生成的 `gradle.properties` 不含任何优化配置。

**修复**：plugin 自动修改 `reactNativeArchitectures=arm64-v8a`，追加 R8 / shrink / legacy packaging 开关。

### Patch 2：proguard-rules.pro 追加

**问题**：prebuild 生成的 proguard 文件只有 reanimated 的 keep 规则，不足以覆盖所有模块。

**修复**：plugin 自动追加完整的 keep 规则列表。

### Patch 3：build.gradle hermesCommand 路径

**问题**：prebuild 模板引用了不存在的 `hermes-compiler` npm 包：
```groovy
// 模板生成（错误）：
hermesCommand = ... require.resolve('hermes-compiler/package.json', ...) ...
```
RN 0.81.5 的 hermesc 实际在 `react-native/sdks/hermesc/`。

**修复**：plugin 替换为正确路径：
```groovy
hermesCommand = ... require.resolve('react-native/package.json') .../sdks/hermesc/%OS-BIN%/hermesc
```

### Patch 4：MainApplication.kt 重写

**问题**：prebuild 模板生成了两个不存在的 API：
- `ExpoReactHostFactory.getDefaultReactHost()` — Expo SDK 54 只有 `createFromReactNativeHost()`
- `ReactNativeApplicationEntryPoint.loadReactNative(this)` — RN 0.81.5 不存在此类
- 使用了 `reactHost` 属性，但 `ReactApplication` 接口要求的是 `reactNativeHost`

**修复**：plugin 检测到错误模板后，用以下正确实现替换整个文件：

```kotlin
class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost =
    ReactNativeHostWrapper(this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages() = PackageList(this).packages
        override fun getJSMainModuleName() = "index"
        override fun getUseDeveloperSupport() = BuildConfig.DEBUG
        override val isNewArchEnabled = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled = BuildConfig.IS_HERMES_ENABLED
      })

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }
}
```

**注意**：不调用 `DefaultNewArchitectureEntryPoint.load()`，因为 RN 0.81.5 的 `libreact_featureflagsjni.so` 已合并进 `libreactnative.so`（见 Patch 6），调用会崩溃。React Host 通过 `DefaultReactNativeHost` 自行完成初始化。

### Patch 5：MainActivity.kt fabricEnabled 替换

**问题**：模板引用 `DefaultNewArchitectureEntryPoint.fabricEnabled`，由于不调用 `load()`，该值始终为 `false`。

**修复**：plugin 将 `fabricEnabled` 替换为 `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED`，并移除对应 import。

---

## 三、RN 0.81.5 源码补丁（patch-package）

### Patch 6：libreact_featureflagsjni.so 加载失败

**问题**：RN 0.81.5 的 CMake 将 `react_featureflagsjni` 定义为 `OBJECT` 库并通过 `target_merge_so()` 合并进 `libreactnative.so`，不会产生独立的 .so 文件。但 Kotlin 代码仍在尝试加载：

```kotlin
// ReactNativeFeatureFlagsCxxInterop.kt init block
SoLoader.loadLibrary("react_featureflagsjni")  // ← 崩溃
```

Expo 的 `ReactActivityDelegateWrapper.onCreate()` 也会触发这条路径，因此仅修改 app 代码无法解决。

**修复**：`patches/react-native+0.81.5.patch`

```kotlin
init {
  try {
    SoLoader.loadLibrary("react_featureflagsjni")
  } catch (_: Throwable) {
    // RN 0.81.5: merged into libreactnative.so
    SoLoader.loadLibrary("reactnative")
  }
}
```

**自动应用**：`package.json` 已添加 `"postinstall": "patch-package"`，每次 `npm install` 后自动生效。

---

## 四、文件清单

| 文件 | 用途 |
|------|------|
| `plugins/with-android-optimize.js` | Config plugin，prebuild 后自动注入 Patch 1-5 |
| `plugins/with-china-mirror.js` | Config plugin，替换 Gradle 下载源为腾讯镜像 |
| `patches/react-native+0.81.5.patch` | patch-package 补丁，修复 Patch 6 |
| `app.json` → `plugins` 数组 | 注册了上述两个 config plugin |
| `package.json` → `postinstall` | 运行 `patch-package` 自动应用 patches |

---

## 五、构建流程

```bash
# 1. 安装依赖（自动应用 patch-package 补丁）
npm install

# 2. 生成原生项目（自动运行 config plugins）
npx expo prebuild --platform android

# 3. 构建 Release APK
cd android && ./gradlew assembleRelease
```

输出位置：`android/app/build/outputs/apk/release/`

---

## 六、已知问题

- R8 (`minifyEnabled=true`) 暂未验证通过，确认基础功能正常后再开启
- `expo.useLegacyPackaging=true` 暂未验证通过，确认基础功能正常后再开启
- 如需构建全架构（模拟器测试），临时修改 `gradle.properties` 中 `reactNativeArchitectures`
