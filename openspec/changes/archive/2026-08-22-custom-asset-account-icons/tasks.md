## 1. 数据库与数据模型

- [x] 1.1 在 `src/db/schema.ts` 的 `CREATE_TABLES_SQL` 中为 `assets` 表添加 `icon TEXT` 列
- [x] 1.2 添加数据库 migration：`ALTER TABLE assets ADD COLUMN icon TEXT`（确保在 `db.ts` 的迁移逻辑中执行）
- [x] 1.3 在 `src/types/models.ts` 的 `Asset` 接口中新增 `icon: string | null` 字段
- [x] 1.4 更新 `src/db/asset-repository.ts` 的 CRUD 操作，支持读写 `icon` 字段（create、update、getAll、getById）

## 2. 图标注册表扩展与分类元数据

- [x] 2.1 在 `src/components/ui/Icon.tsx` 中扩展 `ICON_REGISTRY` 到约 250 个 Lucide 图标（中等集合），不做品味筛选——Lucide 线框风格天然一致。覆盖交通、科技、家居、生活、自然、财务、符号等主要类别，确保用户能自由选到符合心意的图标
- [x] 2.2 在 `src/theme/icons.ts` 中新增 `ICON_CATEGORIES` 常量，定义 12 个图标分类（常用精选、交通出行、建筑房产、科技数码、家居家电、穿戴配饰、金融财务、餐饮美食、运动户外、文娱休闲、工具器械、自然杂项），四字中文命名，每个分类包含标签和图标名称数组
- [x] 2.3 确保 `ICON_CATEGORIES` 中所有图标名称都存在于 `ICON_REGISTRY` 中

## 3. 图标解析工具函数

- [x] 3.1 在 `src/theme/icons.ts` 中实现 `resolveAssetIcon(icon: string | null, category: AssetCategory): string` 函数，实现回退链：自定义图标 → 分类默认图标 → 'Package'
- [x] 3.2 在 `src/theme/icons.ts` 中实现 `resolveAccountIcon(icon: string | null, type: AccountType): string` 函数，实现回退链：自定义图标 → 类型默认图标 → 'CreditCard'
- [x] 3.3 两个解析函数需验证自定义图标名称是否存在于 `ICON_REGISTRY`，不存在时回退到默认图标

## 4. 图标选择器组件

- [x] 4.1 创建 `src/components/IconPickerSheet.tsx` 组件，使用 `AppBottomSheet` 容器，包含搜索框、分类 chip 行、4 列图标网格、预览区域、确认/取消按钮
- [x] 4.2 实现搜索过滤逻辑：按图标名称（英文）大小写不敏感过滤
- [x] 4.3 实现分类浏览逻辑：点击分类 chip 过滤网格中的图标
- [x] 4.4 实现"使用默认图标"选项，选中时返回 `null`
- [x] 4.5 实现当前图标预览，在 sheet 顶部显示当前选中的图标和名称
- [x] 4.6 在 `src/components/ui/index.ts` 中导出 `IconPickerSheet` 组件

## 5. 资产表单集成

- [x] 5.1 在 `src/components/AddAssetModal.tsx` 中添加 `customIcon` state 字段
- [x] 5.2 在 Step 1（完整模式）和快速模式的分类选择区域后添加"自定义图标"按钮行，显示当前图标预览
- [x] 5.3 点击按钮打开 `IconPickerSheet`，选中后更新 `customIcon` state
- [x] 5.4 在 `handleSave` 和 `handleQuickSave` 中将 `customIcon` 写入 asset data
- [x] 5.5 编辑模式下从 `editAsset.icon` 预填 `customIcon` 状态

## 6. 账户表单集成

- [x] 6.1 在 `app/accounts.tsx` 的 `AddAccountSheet` 中添加 `customIcon` state 字段和"自定义图标"按钮
- [x] 6.2 点击按钮打开 `IconPickerSheet`，选中后更新 `customIcon` state
- [x] 6.3 在 `onAdd` 回调中传递 `customIcon` 给 `addAccount`
- [x] 6.4 在 `EditAccountSheet` 中同样添加图标选择功能，从 `account.icon` 预填状态
- [x] 6.5 在编辑保存时传递更新的 `icon` 值给 `editAccount`

## 7. 渲染逻辑更新

- [x] 7.1 更新 `app/assets.tsx` 中资产卡片 (`AssetCardItem`) 使用 `resolveAssetIcon(asset.icon, asset.category)` 替代 `ASSET_CATEGORY_ICONS[asset.category]`
- [x] 7.2 更新 `src/components/AssetDetailModal.tsx` 中详情页头部使用 `resolveAssetIcon`
- [x] 7.3 更新 `app/accounts.tsx` 中账户卡片使用 `resolveAccountIcon(account.icon, account.type)` 替代 `ACCOUNT_TYPE_ICONS[account.type]`
- [x] 7.4 更新 `app/accounts.tsx` 中长按操作菜单的图标显示
- [x] 7.5 更新 `app/index.tsx` 仪表盘中资产和账户图标的显示（如有引用）

## 8. 导入/导出兼容

- [x] 8.1 更新 `src/services/import-service.ts` 兼容新增的 `icon` 字段（导入时保留 icon 值，缺失时默认 null）
- [x] 8.2 确认数据导出功能包含 `icon` 字段

## 9. 测试与验证

- [x] 9.1 验证新建资产带自定义图标后，列表、详情页、仪表盘均显示正确图标
- [x] 9.2 验证编辑资产可修改和清除自定义图标
- [x] 9.3 验证新建账户带自定义图标后，列表显示正确图标
- [x] 9.4 验证编辑账户可修改和清除自定义图标
- [x] 9.5 验证图标选择器的搜索和分类过滤功能正常
- [x] 9.6 验证"使用默认图标"可正确清除自定义图标
- [x] 9.7 验证数据库 migration 后现有数据不受影响（所有现有资产 icon 为 null，显示分类默认图标）
