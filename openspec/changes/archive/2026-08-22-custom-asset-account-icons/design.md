## Context

WorthBase 是一个个人资产管理应用，资产（Asset）和账户（Account）是两大核心实体。当前图标系统采用"类型/分类决定图标"的硬编码策略：

- **Account**：数据库已有 `icon TEXT` 列，TypeScript 模型有 `icon: string | null` 字段，但 UI 层（添加/编辑表单）始终传入 `null`，渲染层始终使用 `ACCOUNT_TYPE_ICONS[account.type]`
- **Asset**：数据库和模型均无 `icon` 字段，渲染层始终使用 `ASSET_CATEGORY_ICONS[asset.category]`
- **Icon 组件**：`<Icon>` 组件基于一个约 55 个 Lucide 图标的注册表，通过 name 字符串查找渲染

这意味着用户无法为同一分类下的不同资产/账户设置不同的视觉标识。

## Goals / Non-Goals

**Goals:**
- 用户可以在添加/编辑资产和账户时，从 Lucide 图标库中选择一个自定义图标
- 自定义图标优先于类型/分类默认图标显示，未设置时自动回退到默认
- 图标选择器组件可复用，支持搜索过滤和分类浏览
- 保持图标选择为可选操作——不选择则使用默认图标，对现有数据零影响

**Non-Goals:**
- 不支持用户上传自定义图片/SVG 作为图标（仅使用 Lucide 图标库）
- 不引入图标包管理或动态加载远程图标
- 不改变资产分类（category）或账户类型（type）的枚举值
- 不重构现有的 `<Icon>` 组件架构

## Decisions

### Decision 1: Asset 新增 `icon` 字段 vs 复用分类映射

**选择**：为 `assets` 表新增 `icon TEXT` 列（可空），与 Account 模型保持一致的 `icon: string | null` 模式。

**理由**：
- 与 Account 模型一致，API 对称
- `null` 表示"使用分类默认图标"，语义清晰
- 不需要迁移现有数据（新列默认 `null`，所有现有资产继续使用分类默认图标）

**替代方案**：
- 创建一个独立的 `icon_overrides` 表：过度设计，增加查询复杂度
- 在分类枚举中新增更多选项：无法解决同一分类下不同资产需要不同图标的问题

### Decision 2: 图标选择器组件设计——BottomSheet 网格 + 搜索

**选择**：创建 `IconPickerSheet` 组件，使用 `AppBottomSheet` 展示图标网格，顶部带搜索框。

**理由**：
- 复用现有的 `AppBottomSheet` 和 `AppTextInput` 组件，风格一致
- 网格布局（4列）紧凑展示图标，点击即选中
- 搜索框支持中英文关键词过滤，快速定位
- 图标按 12 个分类组织（常用精选 + 11 个领域分类），默认展示"常用精选"
- 分类采用四字中文命名，与 App 现有标签风格一致
- 分类列表：常用精选、交通出行、建筑房产、科技数码、家居家电、穿戴配饰、金融财务、餐饮美食、运动户外、文娱休闲、工具器械、自然杂项

**替代方案**：
- 内嵌在当前表单中：表单已经很复杂（3步向导），再加图标网格会过于拥挤
- 弹出式 Modal：BottomSheet 更符合应用现有交互模式

### Decision 3: 图标注册表扩展策略——中等集合 ~250 个 + 分类元数据

**选择**：在 `Icon.tsx` 的 `ICON_REGISTRY` 中扩展到约 250 个 Lucide 图标（中等集合），并在 `icons.ts` 中新增图标分类元数据常量 `ICON_CATEGORIES`，供图标选择器使用。不做"品味筛选"——所有 Lucide 图标视觉风格天然一致（线框、strokeWidth=2），用户可自由选择任意图标。

**理由**：
- Lucide 图标库本身保证了视觉一致性（统一线框风格），不需要人工策展来维持风格统一
- ~250 个图标覆盖绝大多数用户能想到的资产/账户相关概念，搜索体验流畅
- 分类浏览 + 搜索双通道发现机制，250 个图标在 4 列网格中约 60 行，可接受
- 图标注册表是单一真相源，选择器和渲染器共用同一个注册表
- 分类元数据与注册表分离，不增加渲染路径的复杂度

**替代方案**：
- 精选小集 ~100 个：限制用户自由度，与"Lucide 天然一致"的判断不符
- 大集合 ~500 个：bundle 影响翻倍（~1MB），但覆盖的长尾场景收益递减
- 全量导入 ~1400 个：bundle 体积过大（~2.8MB），不可接受
- 从 JSON 文件加载图标列表：增加运行时复杂度和 IO 开销

### Decision 4: 渲染优先级——自定义图标 > 默认图标

**选择**：引入 `resolveIcon` 工具函数，统一解析图标名称：

```typescript
// 资产：自定义图标 → 分类默认图标 → 'Package'
resolveAssetIcon(asset: Pick<Asset, 'icon' | 'category'>): string

// 账户：自定义图标 → 类型默认图标 → 'CreditCard'
resolveAccountIcon(account: Pick<Account, 'icon' | 'type'>): string
```

**理由**：
- 集中管理回退逻辑，避免各处重复 `||` 链
- 函数签名使用 `Pick<>` 类型，不依赖完整模型对象，灵活且可测试
- 所有渲染点调用同一函数，保证行为一致

### Decision 5: 表单中的图标选择入口——独立按钮行

**选择**：在资产/账户表单的分类/类型选择区域之后，添加一个"自定义图标"按钮行。点击后打开 `IconPickerSheet`，选中后在按钮旁显示预览。未选择时显示"使用默认图标"和当前默认图标预览。

**理由**：
- 不干扰现有的分类/类型选择流程（主流程不变）
- 按钮形式简洁，不增加表单复杂度
- 预览让用户立即看到效果
- "使用默认图标"选项允许撤销自定义

## Risks / Trade-offs

**[Bundle 体积增长]** 图标注册表从 ~55 个扩展到 ~250 个 Lucide 图标。每个 Lucide 图标约 1-3 KB（SVG path data），预计增加 ~500 KB 未压缩。→ **Mitigation**: React Native 的 Metro bundler 会对 lucide-react-native 做 tree-shaking，但由于图标选择器需要展示所有图标，它们都会被引用。~500 KB 对移动端应用可接受，且 Lucide 图标是轻量 SVG path，渲染性能无影响。

**[图标名称变更]** 如果未来 Lucide 图标库重命名或移除某些图标，已存储的自定义图标名称可能失效。→ **Mitigation**: `resolveIcon` 函数已包含回退逻辑——未知图标名称会降级为默认图标。同时在 `Icon` 组件中对 `__DEV__` 模式输出警告。

**[用户体验复杂度]** 增加图标选择步骤可能让简单操作变复杂。→ **Mitigation**: 图标选择完全是可选的。快速模式下不展示图标选择入口，仅在完整模式/编辑模式下可见。默认行为不变。

**[数据库 Migration]** `assets` 表新增列需要 SQLite migration。→ **Mitigation**: `ALTER TABLE ADD COLUMN` 是安全的非破坏性操作，不影响现有数据。新增列默认 `NULL`，所有现有资产自动使用分类默认图标。
