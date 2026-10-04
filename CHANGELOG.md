# Changelog / 更新日志

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.7.1] - 2026-10-04

### Changed
- CI 的 android-build 改用 runner 镜像自带的 Android SDK，不再自装第二份：修掉 `ANDROID_HOME` 与 `ANDROID_SDK_ROOT` 指向不同路径导致的 Gradle 构建失败（AGP “Several environment variables ... contain different paths to the SDK”），构建恢复绿色并正常产出 APK
- GitHub Actions 升级到 node24 运行时（checkout / setup-node / setup-java / cache v4→v5、upload-artifact v4→v6），消除 “Node.js 20 is deprecated” 与 “setup-java v4 is deprecated” 告警
- CI runner 由 `ubuntu-latest` 固定为 `ubuntu-24.04`（latest 将于 2026-10-19 迁到 Ubuntu 26），锁定构建环境、清掉迁移通知
- release APK 产物重命名为 `WorthBase-<短commit>-<北京时间>.apk`，artifact 名与文件名一致，便于区分不同构建
- ESLint 告警从 64 清零，`lint:ci` 棘轮 `--max-warnings` 64→0：删未用 import 与死代码、测试 `require()` 改顶层 import、`plugins/**` 关 no-console、修正 4 处 exhaustive-deps
- `react-hooks/set-state-in-effect`、`preserve-manual-memoization` 由 warn 改 off（前者是本项目标准 RN「effect 内异步读库→setState」数据加载/表单重置写法、UI 无测试覆盖、重构风险高；后者仅表示 React Compiler 跳过优化、非正确性问题）

### Removed
- `app/index.tsx` 中算出来却从不渲染的分类占比死代码链（`catBreakdown → categoryBreakdown → totalCatValue`），及未被调用的 `downsamplePreservingExtrema` 函数

## [1.7.0] - 2026-10-04

### Added
- 经常性支出支持周期：月付 / 季付 / 年付（新增 `frequency` 字段，migration v10，默认月付）；月度持有成本按 ÷1 / ÷3 / ÷12 折算，累计成本按月折算
- 支出表单增加周期选择 Chip，列表金额后缀显示 /月 /季 /年
- 贵金属实时参考价：资产详情页新增「实时参考价」区块，显示国际现货折算的金 / 银价（元/克）、按克重的参考市值，并标注所用汇率与更新时间
- 估值弹窗支持「按金价填入 / 按银价填入」（价格 × 克数，可手改后保存）
- 贵金属未填克数时给出可点击提示直达编辑态；取价失败时显示空态 + 重试按钮（不再整块静默消失）
- 项目测试计划 `docs/test-plan.md`：现状盘点、11 项覆盖缺口、分层策略、8 大模块用例矩阵、9 条发布门禁
- 设备端 E2E harness `scripts/adb-ui-test.sh`：doctor / backup-db / restore-db / verify-data / metal / log 等子命令；恢复演练已实测数据零丢失
- 版本一致性校验 `scripts/check-version.sh`（支持 `--strict`），已挂到 CI
- npm scripts：`typecheck` / `lint` / `lint:ci` / `test:coverage` / `check:version` / `verify`

### Changed
- 汇率数据源改为国内优先的四级回落链：腾讯 `qt.gtimg.cn` → 新浪 `hq.sinajs.cn` → `open.er-api.com` → `frankfurter.dev`；金银价与汇率解耦并行获取、各自独立缓存，汇率源全挂时回落汇率缓存
- 新增汇率合理性校验（3~15），拒绝解析错位产生的离谱数值污染估值
- 取价失败不再静默：全部 `console.warn`，UI 给出可见错误态
- CI 改为 push / pull_request 触发，拆分为 `gates`（版本 + tsc + lint + test）与 `android-build` 两个 job
- 引入 ESLint（eslint-config-expo flat config）作为门禁：0 error，warning 设 64 上限棘轮（只减不增）
- `BottomSheet` 移除失效的 `enableKeyboardHandling` 属性（@gorhom/bottom-sheet v5 无此 prop，且全仓无调用方）
- 断开 `useToast ↔ Toast` 循环依赖：抽出 `src/hooks/toast-context.ts`，既有引用路径全部保持可用
- 测试从 237 增至 249

### Fixed
- **贵金属实时参考价在国内网络下完全不可见**：汇率源 `frankfurter.dev` 被 DNS 污染，而金银价与汇率是 all-or-nothing，加上 `catch {}` 静默吞错，导致整块消失且无任何日志
- `app/index.tsx` 从 `HoldingCostResult` 上取并不存在的 `currentValuation`（导致分类占比结果恒为空；该值属死代码，无用户可见影响）
- `IconPickerSheet` 误用 `useMemo` 执行 setState（渲染期更新，有死循环风险）→ 改为 `useEffect`
- 冷启动时的 LogBox require cycle 告警：其横幅与底部导航可点区重叠，会吃掉点击
- **CI 从未成功运行过**：`react-test-renderer@19.2.7` 与 `react-dom@19.3.0` 的 peer 依赖和 Expo SDK 55 钉的 `react@19.2.0` 冲突，`npm ci` 必然失败；三者已统一为 19.2.0
- CI 的 Gradle 构建失败被 `|| exit 0` 吞掉、永远显示绿色；`gradlew` 缺失也不再静默跳过
- `scripts/bump-version.sh` 在 Git Bash 下崩溃：MSYS 路径 `/g/...` 被 node 解析成 `G:\g\...`（ENOENT）→ 改为 `cygpath` 转换 + argv 传参
- 旧备份导入兼容：`frequency` 缺失或非法时回落 monthly
- ICON_REGISTRY 补 `BarChart3 → ChartBar` 别名（lucide 更名导致 4 个测试崩溃）

## [1.6.0] - 2026-08-23

### Added
- 资产和账户支持自定义图标：用户可从 305 个 Lucide 图标中自由选择，不再受限于分类默认图标
- 图标选择器组件：支持分类浏览（12 个四字分类 + 全部图标）和英文搜索
- 图标解析回退链：自定义图标 → 分类/类型默认图标 → 硬编码兜底
- 数据库 migration v9：assets 表新增 `icon` 列
- "使用默认图标"选项：清除自定义图标，恢复分类默认

### Changed
- ICON_REGISTRY 从 ~50 个扩展到 305 个 Lucide 图标
- 图标分类体系：12 个领域导向分类（常用精选、交通出行、建筑房产、科技数码、家居家电、穿戴配饰、金融财务、餐饮美食、运动户外、文娱休闲、工具器械、自然杂项）

## [1.5.1] - 2026-08-23

### Fixed
- 净资产趋势图：某天只更新部分账户余额时，未更新账户的余额被遗漏（显示为 0），导致当天趋势下降。现在使用递进余额算法，未更新账户自动沿用最近一次已知余额
- CSV 导出：同步修复递进余额逻辑，未更新账户在导出中正确显示上次余额而非 0

### Changed
- 趋势计算从逐日精确查询（`getBalancesForDate`）改为一次全量加载 + 内存递进计算（`getAllSnapshotsChronological` + running balance），减少 N 次 DB 查询为 1 次
- 新增 `BalanceSnapshotRepository.getAllSnapshotsChronological()` 方法
- 新增 2 个单元测试覆盖递进余额场景

## [1.4.0] - 2026-07-26

### Added
- 次均成本追踪：一键记录物品使用次数，计算「购买价格 ÷ 使用次数 = 次均成本」
- 资产卡片增强：次均成本作为英雄数字，月持有成本降为辅助信息行
- 使用追踪开关：按资产独立控制，默认关闭，不用的物品不打扰
- 每日上限：同一物品每天只能记录一次，防止误触刷次数
- 使用记录管理：详情页统计卡片、+1 按钮、使用历史时间线、次均趋势变化
- 闲置提醒：90 天以上未使用的物品自动检测，仪表盘「闲置提醒」tab 汇总
- 里程碑庆祝：次均成本跌破 ¥500 / ¥200 / ¥100 / ¥50 自动 🎉 提示
- 仪表盘洞察卡片：「最贵单次」「闲置提醒」双 tab 切换
- 下拉彩蛋：总览页下拉刷新随机显示一句理财吉祥话
- 触觉反馈：+1 使用时轻触觉震动（expo-haptics）

### Changed
- 数据库新增 `usage_records` 表，schema 版本升级至 v7
- 资产表新增 `usage_tracking` 字段（按资产开关）
- 引擎层新增 `UsageCalculator`（次均成本计算 + 闲置检测）
- 资产卡片 UI 重构：信息层级从 6 个元素精简为 2 行
- README 中/英文版同步更新

## [1.0.0] - 2026-07-12

### Added
- 账户余额管理：多账户类型支持，手动更新余额 + 快照记录
- 净资产趋势：基于快照生成折线图，支持半年/一年/两年范围切换
- 净资产目标设定与进度可视化
- 实物资产管理：8 种资产分类，完整生命周期管理
- 持有成本智能计算：4 种分摊策略（简单线性/预期寿命/残值/不分摊）
- 经常性支出管理：支持生效区间设置
- 一次性维护费用：可选纳入分摊
- 卖出结算：自动计算购入价、卖价、贬值、累计成本、日均成本
- 数据安全：完全本地存储，PIN + 生物识别应用锁
- 自动备份：退出时自动备份 SQLite 数据库（保留最近 3 份）
- 数据导入/导出：JSON（完整备份）和 CSV（可读导出）
- 深色模式 + 4 种主题颜色
- 货币符号自定义
- 首次使用引导页
