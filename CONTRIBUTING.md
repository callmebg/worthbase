# Contributing to WorthBase / 贡献指南

感谢你考虑为 WorthBase 做出贡献！以下是参与指南。

## 如何开始

1. **Fork** 本仓库到你的 GitHub 账号
2. **Clone** 你的 Fork 到本地
   ```bash
   git clone https://github.com/YOUR_USERNAME/worthbase.git
   cd worthbase
   ```
3. **安装依赖**
   ```bash
   npm install
   ```
4. **创建分支**
   ```bash
   git checkout -b feat/your-feature-name
   ```

## 分支命名规范

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/batch-asset-edit` |
| `fix/` | Bug 修复 | `fix/holding-cost-nan` |
| `refactor/` | 重构 | `refactor/strategy-pattern` |
| `docs/` | 文档 | `docs/english-readme` |
| `test/` | 测试 | `test/settlement-calc` |
| `chore/` | 构建/工具 | `chore/update-eas-config` |

## 代码规范

- **语言**: TypeScript 严格模式，不使用 `any`（除非不可避免）
- **路径别名**: 使用 `@/` 代替 `src/`（如 `@/engine/HoldingCostCalculator`）
- **组件**: 函数式组件 + Hooks
- **状态管理**: 使用 Zustand，store 放在 `src/stores/`
- **计算逻辑**: 放入 `src/engine/`，通过策略模式扩展
- **命名**: 组件 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE

## 开发流程

1. 运行开发服务器验证改动
   ```bash
   npm start
   ```
2. 确保 TypeScript 编译通过
   ```bash
   npx tsc --noEmit
   ```
3. 确保测试通过（新功能请配套测试）
   ```bash
   npm test
   ```
4. 提交代码（使用清晰的 commit message）
   ```bash
   git commit -m "feat: add batch asset editing support"
   ```

## Commit Message 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>: <description>

[optional body]
```

**Type 可选值**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`

## 提交 Pull Request

1. Push 分支到你的 Fork
2. 在 GitHub 上创建 Pull Request，目标分支为 `main`
3. 填写 PR 模板，描述改动内容和测试方式
4. 如果 PR 涉及 UI 改动，请附上截图

### PR 审核标准

- 所有 CI 检查通过
- 代码风格一致
- 新功能有对应单元测试
- 没有引入不必要的依赖

## 架构指引

如果你要扩展计算引擎，参见 `src/engine/strategies/` 中的策略模式实现。添加新分摊方式只需：

1. 在 `src/engine/strategies/` 下创建新的策略类
2. 实现分摊接口
3. 在策略注册处注册新策略
4. 在 `__tests__/` 中添加对应的单元测试

## 问题反馈

- Bug 请使用 [Bug Report 模板](https://github.com/callmebg/worthbase/issues/new?template=bug-report.yml)
- 功能建议请使用 [Feature Request 模板](https://github.com/callmebg/worthbase/issues/new?template=feature-request.yml)
- 安全问题请参见 [SECURITY.md](./SECURITY.md)

---

再次感谢你的贡献！🎉
