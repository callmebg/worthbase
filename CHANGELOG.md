# Changelog / 更新日志

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.8.0] - 2026-11-08

### Added
- **未来可用资金**：选一个日期，家底告诉你那天你手上有多少钱 = 可用活期 + 已到期定期本金 + 累计净现金流。入口在 账户页 顶部（不占总览页、不占设置页）；公积金等受限资金永不计入（等得再久也取不出来），定期只算本金不算利息
- **新账户类型「公积金」**：与既有的「信用卡/贷款算负债」同构——类型携带语义，受限账户单列一栏。**没有**任何「是否计入净资产」的开关
- **账户可选「到期日」**：定期存款到期日之前不计入可用资金，到期当天及之后计入（含等于）。字段紧跟在「账户类型」Chip 网格下方，默认弹窗高度下不滚动就能看见；选信用卡/贷款/公积金时自动隐藏（这些账户不按日期解锁）。不采集利率、不计算利息，页面上每个数字都还是用户自己录进去的
- **新页面「固定收支」**（账户页顶部入口）：不依附于资产的固定支出（房租、宽带、人寿险）+ 全部固定收入（月薪、季度奖、年终奖），频率复用按月/按季/按年并折算月均。页顶有一行只读汇总「另有 N 笔资产附属支出 ¥X/月」，避免用户以为车险物业费漏记了
- 数据库 migration v11：`accounts.maturity_date` + `cash_flows` 表。**刻意不含任何改表重建**——`PRAGMA foreign_keys = ON` 遇上 migration 外层事务会让「先关外键」失效，`recurring_expenses.asset_id` 因此保持 NOT NULL，家庭现金流走新表
- 测试 258 → 317：月份运算、`cash_flows` 仓储（生效区间边界、非法值回落）、流动性分桶、到期日门控、可用资金全场景、现金流归一化、现金流感知预测四态、migration v11 从 v10 老库升级 + 幂等重入、导入导出往返

### Changed
- **目标达成预测重写**：由「最近 6 点线性回归」改为「当前净资产 + 逐月已知净现金流 + 历史残差斜率」。已知收支是主项，回归退化为残差项——年终奖这类脉冲式收入不再把斜率顶飞，历史在跌但每月有确定进账时照样给得出日期
- **负增长不再等于「算不出来」**：删掉 `slope <= 0 → return null` 的短路。预测结论显式分四态（可达 / 按当前速度达不成 / 已达成 / 数据不足），达不成时给出缺口与月度净流入，数据不足时告诉你该补什么，不再静默空白；解释面板把「已知收支」与「历史残差」拆成两行，并在这两态下给「去录入固定收支」的出口
- 净资产构成拆分为 可用 / 受限 / 资产估值（无受限账户时该项不渲染）。「受限」= 今天花不出去，所以未到期定期也归这里，账户页分组与总览页数字永远同口径。**净资产总额与历史趋势线数值一分未变**，拆的只是构成——翻开关让历史曲线平移是「App 改了我的钱」，这类信任问题不能有
- 账户页按 可用 / 受限 / 负债 分组、各带小计；未到期定期显示「定期 · 未到期」badge，到期后 badge 撤掉只留日期。余额历史与 hero 总额口径不变，仍跨三组求和
- 趋势序列的「余额结转 + 估值回落购入价」聚合从 `app/index.tsx` 收回 `NetWorthCalculator.buildTrendSeries`，UI 只负责渲染；两处并行维护必然走偏
- 导出携带 `accounts.maturityDate` 与 `cash_flows`；导入对旧备份回落 null / 空集，非法 `kind` / `frequency` 回落默认值而非报错，`importReplace` 会一并清空旧的 `cash_flows`

## [1.7.2] - 2026-11-08

### Fixed
- **卖出结算「真实净支出 / 日均成本」重复计入购入价**：累计折旧（购入价的会计分摊，上限即购入价）此前被计入「累计持有成本」，净支出又叠加购入价，已折满资产的购入价被算两次——实例：购入 ¥6,999、卖出 ¥2,400、持有 1,477 天的设备显示净支出 ¥11,598、日均 ¥7.85/天（正确应为 ¥4,599、约 ¥3.11/天）。现累计持有成本仅统计现金性成本（经常性支出 + 维护费），结算卡片满足「贬值 + 持有成本 = 净支出、净支出 ÷ 持有天数 = 日均成本」；卖出预览弹窗同口径修正（同一计算入口）
- **已售资产「已持有」持续增长到今天**：详情页「购入信息」与资产列表卡片的持有时长此前一律从购入日期算到当前日期，资产卖出多年后仍显示"已持有 7 年+"。现已售资产截止于卖出日（`getMonthsHeld` 新增可选截止日期参数），详情页与列表一致

### Changed
- 测试从 249 增至 258：结算口径回归（含用户报告实例）、`getMonthsHeld` / `formatDuration` 单测、`SettlementCalculator` sql.js 集成用例

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
