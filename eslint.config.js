// WorthBase (家底) — ESLint flat config
// 文档：https://docs.expo.dev/guides/using-eslint/
// 注意：本项目 package.json 无 "type": "module"，故此文件用 CommonJS。
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // 构建产物与原生工程不参与 lint
    ignores: [
      'dist/**',
      'android/**',
      'ios/**',
      'node_modules/**',
      '.expo/**',
      'coverage/**',
      'scripts/**',
    ],
  },
  {
    rules: {
      // 本项目 UI 文案与注释为中文，组件文件名多为 PascalCase 且被 expo-router 约定，
      // 不强制文件名风格
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ── 降级为 warn 的 React Compiler 系规则（登记为技术债 T13，见 docs/test-plan.md）──
      // set-state-in-effect：本项目所有屏幕/弹窗都用「effect 内异步读 SQLite → setState」
      // 这一标准 RN 模式加载数据（实测 12 处）。该规则要求改成 render 期派生或 Suspense，
      // 属跨 8 个文件的架构重构，不应塞进「让 lint 能当门禁」这一步里。
      // 降为 warn 保留可见性，而不是 off 装作不存在。
      'react-hooks/set-state-in-effect': 'warn',
      // preserve-manual-memoization：仅表示 React Compiler 跳过了该处优化（3 处，
      // 均在 TimeRangeSheet），不是正确性问题，不影响运行时行为。
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    // jest.setup.ts 里全是为原生模块（svg / reanimated / gesture-handler / bottom-sheet）
    // 造的 mock 组件工厂，不是发布进 app 的组件；其中一处已在工厂内动态赋 displayName，
    // eslint 无法静态识别。真实组件仍受该规则约束（ListItem 的两处已正经补上）。
    files: ['jest.setup.ts'],
    rules: {
      'react/display-name': 'off',
    },
  },
  {
    // 测试文件刻意把 import 放在 jest.mock 之后（ts-jest 下常见写法）。
    // import/first 的自动修复会把 import 提到 jest.mock 之上，于是 mock 工厂在被
    // require 的瞬间就执行，引用到仍处于 TDZ 的 const →
    //   ReferenceError: Cannot access 'mockShare' before initialization
    // 整个套件无法运行。实测 service.test.ts 因此静默丢掉 16 个用例（249 → 233）。
    files: ['__tests__/**/*.{ts,tsx}'],
    rules: {
      'import/first': 'off',
    },
  },
]);
