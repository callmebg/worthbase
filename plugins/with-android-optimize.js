/**
 * Expo Config Plugin: Android APK Size Optimization (SDK 55)
 *
 * Runs automatically after `npx expo prebuild --platform android`:
 *   1. gradle.properties  → arm64-only + R8 + shrinkResources + legacy packaging
 *   2. proguard-rules.pro → keep rules for all native modules
 *
 * Usage in app.json:
 *   "plugins": ["./plugins/with-android-optimize.js"]
 */

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GRADLE_PROPS_APPEND = `
# ── APK size optimization (injected by with-android-optimize.js) ────────────
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
expo.useLegacyPackaging=true
`;

const PROGUARD_APPEND = `
# ── APK size optimization (injected by with-android-optimize.js) ────────────

# React Native core
-keep,includecode class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }
-dontwarn com.facebook.react.**

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# react-native-screens / gesture-handler
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# expo modules
-keep class expo.modules.** { *; }
-dontwarn tech.sqlclub.**

# react-native-svg / safe-area-context
-keep class com.horcrux.svg.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# OkHttp / Kotlin / annotations
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn kotlin.**
-dontwarn javax.annotation.**
-dontwarn org.jspecify.**
`;

function withAndroidOptimize(config) {
  return withDangerousMod(config, [
    'android',
    (exportedConfig) => {
      const projectRoot = exportedConfig.modRequest.projectRoot;

      // ── 1. gradle.properties: arm64-only + R8 + shrink + legacy packaging ──
      const gradlePropsPath = path.join(projectRoot, 'android', 'gradle.properties');
      if (fs.existsSync(gradlePropsPath)) {
        let content = fs.readFileSync(gradlePropsPath, 'utf8');
        content = content.replace(
          /^reactNativeArchitectures=.*$/m,
          'reactNativeArchitectures=arm64-v8a'
        );
        if (!content.includes('android.enableMinifyInReleaseBuilds')) {
          content = content.trimEnd() + '\n' + GRADLE_PROPS_APPEND;
        }
        fs.writeFileSync(gradlePropsPath, content, 'utf8');
        console.log('[android-optimize] Patched gradle.properties → arm64 + R8 + shrink + legacy packaging');
      }

      // ── 2. proguard-rules.pro: append keep rules ───────────────────────────
      const proguardPath = path.join(projectRoot, 'android', 'app', 'proguard-rules.pro');
      if (fs.existsSync(proguardPath)) {
        let content = fs.readFileSync(proguardPath, 'utf8');
        if (!content.includes('injected by with-android-optimize')) {
          content = content.trimEnd() + '\n' + PROGUARD_APPEND;
          fs.writeFileSync(proguardPath, content, 'utf8');
          console.log('[android-optimize] Appended ProGuard keep rules');
        }
      }

      return exportedConfig;
    },
  ]);
}

module.exports = withAndroidOptimize;
