## 1. 项目初始化

- [x] 1.1 使用 `npx create-expo-app@latest worthbase` 创建 Expo 项目（TypeScript 模板）
- [x] 1.2 安装核心依赖：expo-sqlite, zustand, react-native-chart-kit, expo-local-authentication, expo-secure-store, expo-file-system, expo-sharing
- [x] 1.3 配置项目目录结构（app/, src/components, src/stores, src/engine, src/db, src/services, src/types, src/hooks, src/utils）
- [x] 1.4 配置 tsconfig.json（路径别名 @/ → src/）
- [x] 1.5 定义 TypeScript 类型模型（src/types/models.ts: Account, BalanceSnapshot, Asset, RecurringExpense, MaintenanceRecord, ValuationHistory, Settings）
- [x] 1.6 定义枚举（src/types/enums.ts: AccountType, AssetCategory, AmortizationType, AssetStatus）

## 2. 数据库层

- [x] 2.1 编写建表 SQL（src/db/schema.ts: accounts, balance_snapshots, assets, recurring_expenses, maintenance_records, valuation_history, settings）
- [x] 2.2 创建 SQLite 客户端封装（src/db/client.ts: 初始化连接、执行迁移、关闭连接）
- [x] 2.3 实现数据库迁移机制（src/db/migrations.ts: 版本表 + 逐版本迁移函数）
- [x] 2.4 实现 AccountRepository（CRUD + 余额查询）
- [x] 2.5 实现 BalanceSnapshotRepository（存快照、按日期范围查询、获取历史）
- [x] 2.6 实现 AssetRepository（CRUD + 按状态/分类查询）
- [x] 2.7 实现 RecurringExpenseRepository（CRUD + 按生效区间查询）
- [x] 2.8 实现 MaintenanceRepository（CRUD + 按资产查询）
- [x] 2.9 实现 ValuationRepository（CRUD + 按资产查询历史）
- [x] 2.10 实现 SettingsRepository（key-value JSON 读写）

## 3. 计算引擎层

- [x] 3.1 定义分摊策略接口（src/engine/strategies/AmortizationStrategy.ts: calculateMonthlyCost, calculateAccumulated, calculateRemaining）
- [x] 3.2 实现 SimpleLinearStrategy（购入价 ÷ 已持有月数）
- [x] 3.3 实现 ExpectedLifespanStrategy（购入价 ÷ 预期使用月数）
- [x] 3.4 实现 ResidualValueStrategy（(购入价 - 残值) ÷ 预期使用月数）
- [x] 3.5 实现 NoAmortizationStrategy（返回 0）
- [x] 3.6 实现分摊策略工厂（根据 amortization_type 返回对应策略实例）
- [x] 3.7 实现 RecurringExpenseCalculator（getForMonth: 查询当月生效的经常性支出并求和）
- [x] 3.8 实现 MaintenanceCalculator（getAmortizedMonthly: 纳入分摊的维护费÷剩余月数；getNonAmortizedTotal: 未纳入分摊的维护费合计）
- [x] 3.9 实现 HoldingCostCalculator（组合分摊+经常性+维护，返回月成本、日成本、累计成本、剩余未分摊）
- [x] 3.10 实现 NetWorthCalculator（流动资产 + 资产估值 - 未分摊购入成本）
- [x] 3.11 实现 SettlementCalculator（卖出结算：购入价+累计持有成本-卖价=真实净支出，日均成本=净支出÷持有天数）
- [x] 3.12 编写引擎单元测试（覆盖4种分摊方式、经常性支出区间、维护分摊、卖出结算）

## 4. 状态管理层

- [x] 4.1 实现 accountStore（Zustand: accounts[], currentBalances, actions: addAccount, updateBalance, deleteAccount, loadAccounts）
- [x] 4.2 实现 assetStore（Zustand: assets[], filter, actions: addAsset, editAsset, deleteAsset, markRetired, recordSale, updateValuation, loadAssets）
- [x] 4.3 实现 settingsStore（Zustand: theme, darkMode, currency, netWorthGoal, appLock, actions: update, loadSettings）

## 5. UI - 账户管理 (Tab 2)

- [x] 5.1 实现 AccountsTab 主页面（账户列表 + 流动资产总计 + 余额更新历史表格）
- [x] 5.2 实现 AccountCard 组件（显示名称、类型图标、当前余额、上次更新日期、更新按钮）
- [x] 5.3 实现 BalanceUpdateSheet 底部弹窗（输入新余额、日期、保存快照）
- [x] 5.4 实现添加账户表单（名称、类型选择、图标选择）
- [x] 5.5 实现编辑/删除账户功能（带确认对话框）
- [x] 5.6 实现余额更新历史表格（按日期倒序、每行各账户余额+总计）

## 6. UI - 资产管理 (Tab 3)

- [x] 6.1 实现 AssetsTab 主页面（资产总览卡片 + 分类分组列表 + 状态筛选 + 排序）
- [x] 6.2 实现 AssetCard 组件（名称、状态标签、购入信息、当前估值+变化指示器、月持有成本+日均）
- [x] 6.3 实现添加资产3步表单 - 步骤1: 基础信息（名称、分类选择网格、购入日期、购入金额、图片拍照/选图）
- [x] 6.4 实现添加资产3步表单 - 步骤2: 持有成本设置（4种分摊方式单选+条件输入、估值追踪开关、一次性维护处理方式选择）
- [x] 6.5 实现添加资产3步表单 - 步骤3: 经常性支出与维护（多条记录添加/删除、实时预览持有成本分解）
- [x] 6.6 实现资产详情页（月持有成本概览、持有成本三层分解、购入信息、估值历史图表、净资产影响、生命周期操作按钮）
- [x] 6.7 实现 HoldingCostBreakdown 组件（分摊+经常性+维护三层分解，带累计/剩余数字）
- [x] 6.8 实现估值历史折线图组件（react-native-chart-kit LineChart）
- [x] 6.9 实现资产编辑页面（复用添加表单，预填数据，修改后实时重算预览）
- [x] 6.10 实现资产退役操作（状态切换 active→retired，停止分摊和经常性支出）
- [x] 6.11 实现卖出结算页面（输入卖出日期+卖价，自动结算盈亏和真实净支出，展示日均成本）
- [x] 6.12 实现已售资产详情页（结算总览：购入/卖出/贬值/累计持有/真实净支出/日均成本）

## 7. UI - 总览面板 (Tab 1)

- [x] 7.1 实现 Dashboard 主页面布局（净资产卡片 → 资产分解 → 趋势预览 → 持有成本汇总 → 快捷操作）
- [x] 7.2 实现净资产卡片（总净资产、流动资产分解、资产估值分解、较上月变化）
- [x] 7.3 实现净资产趋势折线图（react-native-chart-kit，基于历史快照，含目标线）
- [x] 7.4 实现趋势时间范围切换（月/季/年）
- [x] 7.5 实现持有成本汇总卡片（总月成本、日成本、按资产分解列表+占比、"养你所有的东西"标签）
- [x] 7.6 实现快捷操作栏（更新余额、添加资产、导出数据按钮）

## 8. UI - 设置 (Tab 4)

- [x] 8.1 实现 SettingsTab 主页面（安全、外观、净资产目标、数据、关于 分区）
- [x] 8.2 实现应用安全锁开关（开启时设置PIN，启用expo-local-authentication生物识别）
- [x] 8.3 实现安全锁拦截页面（App启动时检查锁状态，需认证才能进入）
- [x] 8.4 实现主题颜色选择（紫/蓝/绿/橙，全局生效）
- [x] 8.5 实现深色模式切换（跟随系统/手动）
- [x] 8.6 实现货币符号配置
- [x] 8.7 实现净资产目标输入与保存

## 9. 数据服务

- [x] 9.1 实现 BackupService（AppState监听background事件 → 复制db文件到backup目录 → 保留最近3份）
- [x] 9.2 实现 ExportService.exportJSON（导出全量数据为JSON文件到设备共享存储）
- [x] 9.3 实现 ExportService.exportCSV（导出账户/余额历史/资产为CSV文件）
- [x] 9.4 实现 ImportService.importJSON（读取JSON → 预览 → 替换/合并 → 写入DB）
- [x] 9.5 实现数据导出/导入UI入口（设置页 → 数据分区 → 按钮触发）

## 10. 应用启动与导航

- [x] 10.1 实现 RootLayout（Tab Navigator: 总览/账户/资产/设置 4个Tab）
- [x] 10.2 实现应用启动流程（初始化DB → 检查安全锁 → 加载Stores → 显示首屏）
- [x] 10.3 实现首次使用引导（无账户时引导添加第一个账户）

## 11. 测试与优化

- [x] 11.1 编写计算引擎集成测试（多资产+多分摊方式+经常性支出变更+维护记录的组合场景）
- [x] 11.2 性能优化：为SQLite关键查询添加索引（account_id, asset_id, snapshot_date, effective_from/to）
- [x] 11.3 UI优化：资产列表虚拟化（FlatList）处理大量资产场景
- [x] 11.4 在Android和iOS模拟器上分别验证所有页面和功能
- [x] 11.5 生成应用图标和启动画面
- [x] 11.6 配置EAS Build（构建配置、app.json、版本号）

## 12. 功能测试补充

- [x] 12.1 安装测试依赖（@testing-library/react-native, @testing-library/jest-native）
- [x] 12.2 引擎边界值测试（0价格、0寿命、负数残值、闰年/跨年日期计算）
- [x] 12.3 Store 层单元测试（account-store, asset-store, settings-store，mock repository 验证状态变更）
- [x] 12.4 Repository 层集成测试（内存 SQLite，CRUD + 级联删除验证）
- [x] 12.5 Service 层测试（export-service JSON/CSV 输出验证、import-service 导入验证、backup-service 备份逻辑验证）
- [x] 12.6 UI 组件基础渲染测试（OnboardingView, HoldingCostBreakdown, ValuationChart, LockScreen 渲染不崩溃）

## 13. 安全加固 (P0)

- [x] 13.1 PIN 码安全存储改用 SHA-256 哈希 + expo-secure-store，替代 btoa 明文编码
- [x] 13.2 实现应用锁屏界面（App 启动时检查锁状态，PIN 输入解锁后进入主界面）
- [x] 13.3 实现 expo-local-authentication 生物识别调用（生物识别可用时优先，失败回退 PIN）
- [x] 13.4 后台→前台时自动触发锁屏（AppState inactive→active 检查）

## 14. 核心功能补全 (P1)

- [x] 14.1 修正净资产趋势图：余额快照 + 资产估值历史（当前只含余额，名不副实）
- [x] 14.2 设置页接入 ExportService（JSON 备份导出 + CSV 可读导出两个按钮）
- [x] 14.3 设置页接入 ImportService（文件选择 → 预览 → 替换导入）
- [x] 14.4 深色模式适配：COLORS 常量改为 useColorScheme 动态切换，设置页完整支持暗色主题
- [x] 14.5 设置页接入备份恢复（查看备份列表 + 选择恢复）

## 15. 体验优化 (P2)

- [x] 15.1 安装 @react-native-community/datetimepicker，替换所有日期 TextInput（购入日期、维护日期、卖出日期）
- [x] 15.2 资产详情页增加「更新估值」入口（可随时记录新估值，写入 valuation_history）
- [x] 15.3 资产详情页增加经常性支出后期管理（添加/删除，不限于创建时）
- [x] 15.4 资产详情页增加维护记录后期管理（添加/删除，不限于创建时）
- [x] 15.5 账户编辑功能（长按→编辑名称和类型）

## 16. 健壮性 (P3)

- [x] 16.1 输入验证（价格 > 0、日期格式校验、必填项提示）
- [x] 16.2 异步操作错误处理（所有关键操作加 try/catch + Alert 用户反馈）
- [x] 16.3 退役资产恢复功能（retired → active 双向状态流转）
