## Why

当前资产和账户的图标完全由类型/分类枚举硬编码决定（`ACCOUNT_TYPE_ICONS` / `ASSET_CATEGORY_ICONS`），用户无法自定义。这导致图标含义与用户实际认知不匹配——比如把 iPad 归入"数码产品"但用户觉得应该用 Laptop 图标，或者"微信"账户实际用作公司账户但用户希望显示 Building 图标。自定义图标让用户按自己的理解选择更直观的视觉标识，提升信息识别效率。

## What Changes

- **Asset 模型新增 `icon` 字段**：SQLite `assets` 表新增 `icon TEXT` 列，TypeScript `Asset` 接口新增 `icon: string | null` 属性，用于存储用户选择的自定义 Lucide 图标名
- **Account 图标自定义**：`Account` 模型已有 `icon` 字段但从未在 UI 中暴露，需要让表单和渲染逻辑真正使用该字段
- **图标选择器组件**：新建可复用的 `IconPicker` 组件（BottomSheet 内网格展示所有可用 Lucide 图标），支持搜索过滤和分类浏览
- **表单集成**：在 `AddAssetModal` 和账户添加/编辑表单中嵌入图标选择入口，允许用户在选择分类/类型后进一步自定义图标
- **渲染逻辑更新**：所有展示资产/账户图标的地方（列表卡片、详情页、仪表盘）改为优先使用自定义图标，回退到分类/类型默认图标
- **图标注册表扩展**：`Icon.tsx` 的 `ICON_REGISTRY` 扩充更多适合财务/资产场景的 Lucide 图标，供图标选择器使用

## Capabilities

### New Capabilities
- `icon-picker`: 可复用的图标选择器组件，提供 Lucide 图标网格浏览、搜索过滤和选中预览功能

### Modified Capabilities
- `asset-management`: Asset 模型新增 icon 字段，添加/编辑表单集成图标选择，列表和详情页渲染使用自定义图标
- `account-management`: 账户表单集成图标选择（利用已有的 icon 字段），列表和详情页渲染使用自定义图标
- `design-system`: Icon 组件注册表扩展更多图标，支持动态图标名称解析

## Impact

- **数据库**：需要新增 SQLite migration 为 `assets` 表添加 `icon` 列（`accounts` 已有该列）
- **数据模型**：`Asset` 接口新增 `icon` 字段，`AssetRepository` 需更新 CRUD 操作
- **UI 组件**：新增 `IconPicker` 组件；修改 `AddAssetModal`、`accounts.tsx` 中的账户表单、`AssetDetailModal`、资产列表卡片、账户列表卡片
- **图标系统**：`ICON_REGISTRY` 从 ~55 扩展到 ~250 个 Lucide 图标（中等集合），Lucide 本身保证视觉一致性，无需人工策展
- **导入/导出**：`import-service.ts` 需兼容新增的 icon 字段
- **性能**：图标注册表从 ~55 扩展到 ~250 个（中等集合），bundle 增长约 500KB，可接受
