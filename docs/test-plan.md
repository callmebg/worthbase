# WorthBase (家底) — 测试计划

> 基线盘点日期：2026-10-04　|　对应版本：1.6.0（commit `eda855c`）
> 本文是测试的**单一事实来源**：分层策略、用例矩阵、执行方式、发布门禁。

---

## 1. 现状基线

### 1.1 已有自动化测试

| 文件 | 用例 | 覆盖对象 | 层次 |
|---|---:|---|---|
| `engine.test.ts` | 53 | 4 种折旧策略、策略工厂、经常性支出区间与周期归一、结算、维护分摊、投影、净资产、摊销推荐 | L1 单元 |
| `engine-boundary.test.ts` | 29 | 零购入价、空寿命、负残值、闰年、跨年、UTC 日期 | L1 边界 |
| `repository.test.ts` | 52 | 账户/余额快照/资产/估值/设置仓储、hardDelete、退役原因、初始使用次数、余额历史 as-of、经常性支出 frequency | L2 集成（sql.js 真 SQLite） |
| `validation.test.ts` | 27 | 输入校验 | L1 |
| `store.test.ts` | 23 | 3 个 Zustand store | L2 |
| `metal-price.test.ts` | 21 | 折算数学、汇率合理性区间、四级源回落链、缓存与降级 | L2 |
| `auth-service.test.ts` | 16 | PIN/生物识别鉴权 | L2 |
| `service.test.ts` | 16 | ExportService / ImportService / BackupService | L2 |
| `ui-components.test.tsx` | 12 | OnboardingView、HoldingCostBreakdown、ValuationChart、LockScreen | L3 |
| **合计** | **249** | | |

**值得肯定的基建**：`__tests__/helpers/mock-database.ts` 用 sql.js（Emscripten 编译的真 SQLite）模拟 expo-sqlite，仓储测试是**真 SQL 集成测试**而非 mock 断言 —— 这是本项目最扎实的资产，新增仓储用例应复用它。

### 1.2 覆盖缺口

| # | 缺口 | 现状 | 风险 |
|---|---|---|---|
| G1 | **屏幕层零测试** | `app/index.tsx`、`accounts.tsx`、`assets.tsx`、`settings.tsx` 无任何测试 | 路由、数据装配、空态/加载态全靠手测 |
| G2 | **12/16 功能组件无测试** | AddAssetModal、AssetDetailModal、SettlementModal、IconPickerSheet、InteractiveTrendChart、TimeRangeSheet、ConfirmSheet、DatePickerField、4 个 Explainer | 弹窗表单是主要交互入口，回归靠人肉 |
| G3 | **10/10 UI 原语无测试** | Button、Chip、Card、Icon、TextInput、Toast、BottomSheet、ListItem、FAB、EmptyState | 设计系统改动无护栏 |
| G4 | **Icon 注册表无完整性测试** | ~305 个图标映射；`eb48f26` 曾因 lucide 更名（BarChart3→ChartBar）导致 4 个测试崩溃，靠人工发现 | 升级 lucide 即可能静默坏图标 |
| G5 | **迁移无测试** | v1→v10 十级迁移、幂等性（CLAUDE.md 要求幂等但无测试强制） | 老用户升级即数据风险 |
| G6 | ~~CI 不在 push/PR 触发~~ **已修** | `ci.yml` 现为 `push` + `pull_request` + `workflow_dispatch`，并加 concurrency 取消旧任务 | — |
| G7 | ~~CI 吞掉构建失败~~ **已修** | 删掉 `\|\| exit 0`；gradlew 缺失改为硬失败；新增「APK 是否真的产出」校验；artifact `if-no-files-found: error` | — |
| G8 | ~~无 lint / typecheck 门禁~~ **已修** | 新增 `typecheck` / `lint` / `lint:ci` / `test:coverage` / `check:version` / `verify`；eslint flat config 就位；2 处历史 TS 错误已修，`tsc` 退出码 0 | — |
| G9 | **E2E 自动化刚起步** | 已落地 `scripts/adb-ui-test.sh`（doctor / backup-db / goto / open / texts / assert / metal / log），但仅覆盖贵金属 4 条用例，且只能在本地连着设备跑，未进 CI | 发布前验证仍大面积依赖手工 |
| G10 | ~~require cycle~~ **已修** | 抽出 `src/hooks/toast-context.ts`，依赖变为单向 `toast-context ← Toast.tsx ← useToast.tsx`；真机实测 Require cycle 计数 0，LogBox 横幅消失，底部导航点击不再被吃 | — |
| G11 | **无覆盖率阈值** | 已有 `npm run test:coverage`，但 jest 未配阈值 | 无法防止覆盖率滑坡 |

---

## 2. 分层策略

```
L0 静态门禁   tsc --noEmit + eslint + 版本一致性     ← 秒级，每次 push
L1 单元       engine / utils / validation            ← 纯函数，无 mock
L2 集成       repository(sql.js) / service / store   ← 真 SQL、真状态机
L3 组件       RNTL 渲染 + 交互                        ← 表单校验、空态、回调
L4 屏幕       导航 + 数据装配 + 加载/空/错误态
L5 设备 E2E   adb / Maestro                          ← 真机真网络真 SQLite
L6 非功能     迁移、备份恢复、性能、安全、兼容性
```

**原则**：能在 L1/L2 覆盖的绝不上移到 L5；L5 只验证"跨进程/跨网络/真 SQLite/真手势"才成立的行为。本次贵金属 bug 就是反例 —— 单测全绿（mock 的 fetch 永远成功），真机却因 DNS 污染完全不可用。

---

## 3. 用例矩阵

优先级：**P0** = 发布必测，**P1** = 每迭代，**P2** = 有余力。

### 3.1 计算引擎（L1）

| ID | 用例 | 优先级 | 现状 |
|---|---|---|---|
| ENG-01 | 四种折旧策略（直线/预期寿命/残值/不折旧）各自边界与公式 | P0 | ✅ 已覆盖 |
| ENG-02 | 零价、空寿命、负残值、闰年、跨年、UTC 边界 | P0 | ✅ 已覆盖 |
| ENG-03 | 经常性支出 frequency：月/季/年折算 ÷1/÷3/÷12，非法值回落 monthly | P0 | ✅ 已覆盖 |
| ENG-04 | 维护分摊：amortize 开关、跨月分摊、与持有成本叠加 | P0 | ✅ 已覆盖 |
| ENG-05 | 结算：净支出 = 购入+维护−卖价，日均成本、持有天数 | P0 | ✅ 已覆盖 |
| ENG-06 | 投影：达成日期、负进度、目标为 0/null | P1 | ✅ 已覆盖 |
| ENG-07 | **金额精度**：浮点累加误差（0.1×N）、四舍五入口径一致性、大数（>1e9） | P1 | ❌ 缺 |
| ENG-08 | **时区/夏令时**：设备时区非 UTC+8 时持有天数、月末归属 | P1 | 部分（有 UTC 用例） |
| ENG-09 | 使用成本：initialUseCount 参与计算、次数为 0 时不除零 | P1 | 部分 |

### 3.2 数据库与迁移（L2 / L6）

| ID | 用例 | 优先级 | 现状 |
|---|---|---|---|
| DB-01 | 各仓储 CRUD、软删除、as-of 查询 | P0 | ✅ 已覆盖 |
| DB-02 | **迁移逐级升级**：从 v1…v9 各自起点升到 v10，数据不丢 | P0 | ❌ 缺（G5） |
| DB-03 | **迁移幂等**：同一版本重复执行不报错、不重复加列 | P0 | ❌ 缺 |
| DB-04 | **降级/越级**：DB 版本高于 CURRENT_VERSION 时的行为 | P1 | ❌ 缺 |
| DB-05 | settings 未知 key 不进备份导出、不被 saveAll 清除 | P1 | 部分（本次手工验证） |
| DB-06 | 并发写入（快速连点保存）不产生重复行 | P2 | ❌ 缺 |

### 3.3 服务（L2）

| ID | 用例 | 优先级 | 现状 |
|---|---|---|---|
| SVC-01 | 导出/导入往返一致（含 frequency 等新增字段） | P0 | ✅ 已覆盖 |
| SVC-02 | **旧备份兼容**：缺字段/非法值回落默认（frequency→monthly、weightGrams→null） | P0 | ✅ 已覆盖 |
| SVC-03 | 备份文件损坏/截断/非 JSON 时的错误处理 | P1 | 部分 |
| SVC-04 | 鉴权：PIN 哈希、错误次数、生物识别开关组合 | P0 | ✅ 已覆盖 |
| SVC-05 | 金属价：四级源回落、汇率区间校验、缓存 TTL、解耦降级 | P1 | ✅ 已覆盖（本次新增 12 例） |
| SVC-06 | **导入恶意数据**：超长字符串、负数金额、SQL 片段 | P1 | ❌ 缺 |

### 3.4 状态管理（L2）

| ID | 用例 | 优先级 | 现状 |
|---|---|---|---|
| ST-01 | 三个 store 的 action 与派生状态 | P0 | ✅ 已覆盖 |
| ST-02 | store 与仓储失败时的一致性（写入失败不应留下乐观状态） | P1 | ❌ 缺 |

### 3.5 组件与 UI（L3）

| ID | 用例 | 优先级 | 现状 |
|---|---|---|---|
| UI-01 | Onboarding / LockScreen / ValuationChart / HoldingCostBreakdown | P1 | ✅ 已覆盖 |
| UI-02 | **AddAssetModal**：快速模式 vs 完整三步、分类切换显隐字段（贵金属→克数）、校验拦截、编辑态回填 | P0 | ❌ 缺（G2） |
| UI-03 | **AssetDetailModal**：三态渲染（有价/失败空态/未填克数提示）、按金价填入、结算与退役流程 | P0 | ❌ 缺（G2） |
| UI-04 | **Icon 注册表完整性**：遍历所有映射，断言每个 name 在 lucide 中真实存在 | P0 | ❌ 缺（G4） |
| UI-05 | UI 原语快照 + 交互（Button 禁用态、Chip 选中、TextInput 错误文案、Toast 自动消失） | P1 | ❌ 缺（G3） |
| UI-06 | 深色模式 / 主题色切换下无硬编码颜色 | P2 | ❌ 缺 |
| UI-07 | 无障碍：accessible label、点击区 ≥48dp、屏幕阅读器可读 | P2 | ❌ 缺 |

### 3.6 屏幕与导航（L4）

| ID | 用例 | 优先级 | 现状 |
|---|---|---|---|
| SCR-01 | 四个 tab 深链可达（`worthbase://`、`/assets`、`/accounts`、`/settings`） | P1 | ❌ 缺 |
| SCR-02 | 空数据首启 → Onboarding；有数据 → 总览 | P1 | ❌ 缺 |
| SCR-03 | 开启应用锁后冷启动必经 LockScreen | P0 | ❌ 缺 |
| SCR-04 | 加载态/错误态（DB 打开失败）不白屏 | P1 | ❌ 缺 |

### 3.7 设备端到端（L5，adb 可自动化）

执行方式见 §4。

| ID | 用例 | 优先级 | 现状 |
|---|---|---|---|
| E2E-01 | 冷启动无 FATAL / AndroidRuntime / RN 红屏 | P0 | 待执行 |
| E2E-02 | 新增资产 → 列表出现 → 详情字段与输入一致 | P0 | 待执行 |
| E2E-03 | 编辑资产 → 各字段回填正确 → 保存后不丢字段 | P0 | 待执行 |
| E2E-04 | 退役 / 恢复 / 卖出结算全流程 | P1 | 待执行 |
| E2E-05 | 记录使用次数 → 次均成本变化 | P1 | 待执行 |
| E2E-06 | 账户余额修改 → 快照入历史 → 趋势图出新点 | P1 | 待执行 |
| E2E-07 | 导出备份 → 清库 → 导入 → 数据一致 | P0 | 待执行 |
| E2E-08 | 应用锁：PIN 错误拦截、生物识别解锁 | P0 | 待执行 |
| E2E-09 | 贵金属实时参考价（本次 10 条，见 §4.3） | P1 | 部分已验证 |
| E2E-10 | 断网/飞行模式下全 App 可用（金属价降级不阻塞） | P1 | 待执行 |
| E2E-11 | 深色模式、系统字体放大 200% 不截断 | P2 | 待执行 |
| E2E-12 | 低端机/小屏（≤5"）与平板布局 | P2 | 待执行 |

### 3.8 非功能（L6）

| ID | 用例 | 优先级 | 现状 |
|---|---|---|---|
| NFR-01 | 冷启动 ≤2s（中端机）、tab 切换 ≤300ms | P1 | ❌ 缺 |
| NFR-02 | 大数据量：1000 资产 / 5000 估值点下列表与图表不卡 | P1 | ❌ 缺 |
| NFR-03 | 内存：反复开关弹窗 50 次无泄漏 | P2 | ❌ 缺 |
| NFR-04 | 安全：PIN 不明文落库、备份不含 pinHash、DB 文件权限 | P1 | 部分 |
| NFR-05 | 版本一致性：package.json / app.json / build.gradle 三处同步（bump 脚本保证） | P0 | ❌ 缺自动化校验 |

---

## 4. adb 设备测试执行方案

### 4.1 为什么需要它

单测的 fetch/DB 全是 mock，**无法发现环境类缺陷**。本次贵金属 bug 的三层根因（DNS 污染、all-or-nothing、静默 catch）单测全绿，只有真机能暴露。

### 4.2 方法论（本次已验证可行）

| 手段 | 命令 | 用途 |
|---|---|---|
| 深链直达 | `adb shell am start -a android.intent.action.VIEW -d "worthbase://assets"` | 绕开手势导航，稳定进入目标页 |
| UI 断言 | `uiautomator dump` + 解析 `text="..."` | 断言渲染值，而非截图比对 |
| 节点点击 | 从 dump 取 `bounds="[x1,y1][x2,y2]"` 算中心 | 无 content-desc 时的兜底 |
| 网络真值 | `adb shell curl`（设备自带 `/system/bin/curl`） | 区分"代码 bug"与"网络不通" |
| DNS 对比 | 设备 `ping -c1 <host>` vs PC `curl -w %{remote_ip}` | 识别 DNS 污染 |
| 日志 | `adb logcat -d \| grep ReactNativeJS` | 抓 warn/error |
| 数据兜底 | `adb exec-out run-as <pkg> cat files/SQLite/worthbase.db > backup` | 改数据前必备份（debug 包可 run-as） |

**已踩坑记录**（写进 helper 避免重犯）：
- `adb pull` 的本地路径必须用**相对路径**；Windows 版 adb 不认 `/g/...` 这类 MSYS 绝对路径
- Git Bash 会把 `/sdcard/x` 转成 Windows 路径 → 需 `export MSYS_NO_PATHCONV=1`
- LogBox 告警横幅 bounds `[33,2382][1168,2537]` 与底部导航可点区 `[800,2460][1200,2657]` **重叠会吃掉点击** → 先关掉它（这也印证 G10 必须修）
- bottom-sheet 内滚动要**慢速短距**（`swipe 600 2100 600 1400 900`），快速 fling 会被识别为关闭手势
- `uiautomator dump` **只含视口内节点**，断言前必须先滚到目标区

### 4.3 贵金属参考价的 10 条设备用例

harness 已固化为 `scripts/adb-ui-test.sh`，执行：`./scripts/adb-ui-test.sh metal`

| ID | 用例 | 改数据 | 结果（2026-10-04 实测） |
|---|---|---|---|
| M-01 | 正常路径渲染（金/银单价、双市值、时间、汇率） | 否 | ✅ PASS 六项元素全在 |
| M-02 | 数值合理性（金 300~2000、银 3~50、市值=单价×克数） | 否 | ✅ PASS 金 892.85、银 13.05、汇率 6.7050，市值=单价×1g 精确相等 |
| M-03 | 10 分钟内缓存命中，时间戳不变 | 否 | ✅ PASS 重开仍为 `15:47`，未重复联网 |
| M-04 | 非贵金属资产不显示区块 | 否 | ✅ PASS 滚遍「尼康z5」全弹窗 8 屏，`实时参考价` absent |
| M-05 | 断网 + 无缓存 → 空态 + 重试按钮 | 清缓存 | ⏳ 待执行（需改数据，见 §4.4） |
| M-06 | 断网 + 有缓存 → 「缓存于…（当前无法联网）」 | 否 | ⏳ 待执行 |
| M-07 | 恢复网络点重试 → 回到实时价 | 否 | ⏳ 待执行 |
| M-08 | 贵金属未填克数 → 可点击提示进编辑态 | 是（还原） | ⏳ 待执行（需改数据） |
| M-09 | 估值弹窗「按金价填入」= 金价×克数（只取消不保存） | 否 | ⏳ 待执行 |
| M-10 | 全流程本 app 无崩溃 / RN 错误 | 否 | ⚠️ 崩溃 0 ✅，但发现 1 处未处理 Promise 拒绝，见 F-02 |

数据库已备份至 `/tmp/wb-backup/worthbase.db`（176KB，含 `metal_price_cache`/`fx_rate_cache`/`tencent`，校验为有效 SQLite），M-05/M-08 的数据改动有兜底。

### 4.4 首轮执行发现（2026-10-04）

**F-01｜logcat 是全系统的，崩溃断言必须按包名归属**（已修，harness 内置）

首轮 M-10 报 `FATAL/AndroidRuntime=120` 而判 FAIL。追查后 120 条全部来自 `com.android.commands.uiautomator`（20）与 `com.android.internal.os`（20）等系统进程 —— **`uiautomator dump` 自身就会刷 AndroidRuntime 日志**。按包名过滤后本 app 崩溃数为 **0**。
→ 教训：任何基于 logcat 的断言都必须 `-s <tag>:<level>` + 包名归属，否则自动化跑得越多噪音越大，最终必然误报。

**F-02｜expo-sqlite teardown 竞态导致未处理 Promise 拒绝**（低频，未修）

```
E ReactNativeJS: Uncaught (in promise) Call to function 'NativeStatement.finalizeAsync' has been rejected.
→ The 2nd argument cannot be cast to type expo.modules.sqlite.NativeDatabase (received class java.lang.Integer)
→ Cannot use shared object that was already released
```

复现数据：自动化全程**观测到 1 次**；随后针对性实验「打开贵金属详情→杀进程」×5、「冷启动 1.5s 内杀」×5、「冷启动 4s 杀」×3，**共 13 轮 0 复现**。
影响评估：不崩溃、不红屏；连杀 8 次后数据完好（资产数 13、总值 ¥2.4万、月持有成本 ¥2,408.62 与测试前逐项一致），SQLite WAL 崩溃恢复生效。
定性：**低危、非确定性竞态** —— 进程被杀时仍有 in-flight 语句，其 finalize 撞上已释放的原生 DB 对象。Android 随时可能回收后台进程，故不可完全忽略。
处置：登记入 §8，不在无稳定复现路径时盲改。若后续可复现，方向是给 DB 访问加 teardown 取消（或在 `client.ts` 暴露 close 并在 app 卸载时 await）。

**F-03｜同一轮工作里踩到三次「静默失败」**（均已修，值得记录）

| # | 位置 | 表现 | 根因 |
|---|---|---|---|
| 1 | `metal-price-service.ts` | 参考价整块消失，无日志无提示 | `catch {}` 吞掉异常 |
| 2 | harness `dismiss_logbox` | 整个测试静默中止，终端全白 | `grep -q … && {…}` 结尾，**没有 LogBox 时 grep 返回 1**，函数返回 1，`goto \|\| return 1` 直接退出 |
| 3 | harness `_sqlite_report` | 校验报告只打了 3 行就断，表清单消失 | node 脚本用 bash 单引号内联，SQL 里的 `type='table'` **提前闭合外层引号**，SQL 语法错误又被 `2>/dev/null` 吞掉 |

→ 三次是**同一类错误**：条件不满足或出错时不吭声，调用方误以为成功。
→ 规约（已写进 harness 注释）：① 以 `grep` 结尾的函数必须显式 `return 0`；② 校验/诊断类命令**禁止 `2>/dev/null`**，自身出错必须可见；③ 内嵌脚本一律写成临时文件，不用单引号内联。

**F-05｜app 自身备份目录为空**

`files/backups/` 实测 `total 0` —— 用户级备份从未做过。当前这份账本数据的唯一副本就是手机里的 `files/SQLite/worthbase.db`（测试用的 `/tmp/wb-backup/` 是易失的，重启即失）。
→ 建议：发布前用 app 内的备份导出功能做一份，并把 E2E-07（导出→清库→导入往返）列为 P0。

**F-06｜DB 备份的完整性验证方法**（本次确立，已固化进 harness）

只判断"文件存在 + 大小合理"是不够的。`backup-db` 现在会：先 `force-stop`（`journal_mode=delete` 下写入中途拷贝会得到不一致的库）→ 检测 `-journal`/`-wal`/`-shm` 兄弟文件并一并备份 → 记录 sha256 → 用 `node:sqlite` 跑 `integrity_check` / `foreign_key_check` / 逐表行数 → 写 MANIFEST 指纹清单。
`restore-db` 默认拒绝执行，必须 `--yes`；执行前自动留回滚点；push 后先比对 sha256 一致才覆盖；覆盖后重新校验并启动 app 确认可读。

**恢复演练已实际执行并通过（2026-10-04 16:10）**：

| 环节 | 结果 |
|---|---|
| 回滚点自动留存 | ✅ `pre-restore-161028.db` 176128 bytes |
| push sha256 一致才覆盖 | ✅ |
| 覆盖后权限/属主 | ✅ 仍为 `-rw-------` / `u0_a542`（app 自己的 UID，故可读回） |
| 设备库 vs 备份 | ✅ 逐字节一致 |
| `integrity_check` / FK / 9 表行数 | ✅ ok / 无违规 / assets 13、accounts 9、snapshots 281、db_version 10 |
| app 启动读库 | ✅ 进入资产页 |
| `verify-data` 业务核对 | ✅ 总值 ¥2.4万、月持有成本 ¥2,408.62、资产数 13，**与测试前基线逐项一致** |
| 恢复后贵金属功能 | ✅ 金 ¥892.85/克、银 ¥13.05/克、汇率 6.7050；缓存已过期（24min>10min TTL）故自动重取，`更新于 16:11` |
| 崩溃 / RN 错误 | ✅ 0 / 0（F-02 的 finalizeAsync 在整轮覆盖+重启中未复现） |

顺带修正：`adb push` 的**源路径**同样不能用 MSYS 绝对路径（`/tmp/...` 会被 adb.exe 当成 `<当前盘>:\tmp\...`），已用 `cygpath -w` 转换。首次演练就是因此失败并**在覆盖前中止**——安全闸按设计生效，实时库未被触碰。

**F-04｜数据完整性通过暴力验证**（附带收获）

自动化过程中 app 被 force-stop 十余次，资产/账户数据零丢失。可作为 NFR 类的基线证据：**异常终止不损坏数据**。

---

## 5. 基建改造（P0 前置任务）

按顺序做，每项都能独立提交：

| # | 任务 | 产出 | 修的缺口 |
|---|---|---|---|
| T1 | ✅ **已完成** `package.json` 增 `typecheck` / `lint` / `lint:ci` / `test:coverage` / `check:version` / `verify` | 一条 `npm run verify` 跑完整条门禁链，实测退出码 0 | G8 |
| T2 | ✅ **已完成** 清掉 2 处历史 TS 错误（详见 §9），CLAUDE.md 的"可忽略"清单已删除、改为「tsc 必须零错误」 | `tsc --noEmit` 退出码 0 | G8 |
| T3 | ✅ **已完成** eslint 9 + eslint-config-expo 57（flat config）；31 errors → **0 errors**、64 warnings（CI 用 `--max-warnings=64` 棘轮，只许减不许增） | 风格与 hooks 门禁 | G8 |
| T4 | ✅ **已完成** 抽出 `src/hooks/toast-context.ts`，依赖变单向 | 真机 Require cycle 计数 0，LogBox 横幅消失 | G10 |
| T5 | ✅ **已完成** `ci.yml`：push+PR+手动触发、拆 `gates` / `android-build` 两 job（后者 needs 前者、PR 上不跑）、删掉吞错的 `\|\| exit 0`、gradlew 缺失改硬失败、新增 APK 产出校验、artifact `if-no-files-found: error` | CI 真正拦截 | G6、G7 |
| T6 | ✅ **已完成** `scripts/check-version.sh`（三处版本 + semver + versionCode + tag 提示）；成功/失败两条路径均实测（退出码 0 / 1） | 防漏 bump | NFR-05 |
| T7 | 引入 `@testing-library/react-native` + jsdom 环境，支撑 L3 交互测试 | 组件可测 | G2、G3 |
| T8 | Icon 注册表完整性测试（遍历断言 lucide 导出存在） | 防升级炸图标 | G4 |
| T9 | 迁移测试：用 sql.js 建 v1…v9 各版本库，逐级升到 v10 断言数据完整 + 重复执行幂等 | 升级安全 | G5 |
| T10 | jest 配 coverage 阈值（先设当前实际值，只防下滑不追高） | 防滑坡 | G11 |
| T11 | ~~把 adb helper 固化为 `scripts/adb-ui-test.sh`~~ **✅ 已完成初版**（含 §4.2 全部踩坑规避 + F-01/F-03 修正）；后续按 E2E-02~E2E-08 扩用例 | E2E 可复现 | G9 |
| T12 | 评估 Maestro 替代裸 adb（YAML flow、自动等待、CI 可跑模拟器） | E2E 上 CI | G9 |
| T13 | **新增（T3 产出）** 偿还被降级为 warn 的 react-hooks 规则：`set-state-in-effect` 16 处（8 个文件的「effect 内异步读 SQLite → setState」加载模式）、`preserve-manual-memoization` 3 处（TimeRangeSheet）。方向是改为 render 期派生状态或引入 Suspense/数据层缓存 | 消掉 19 条 warn 后把规则调回 error，并下调 `--max-warnings` 棘轮 | G8 遗留 |
| T14 | **新增（T3 产出）** 清理 64 条 warning 里的其余项：`no-unused-vars` 32、`no-require-imports` 6、`exhaustive-deps` 4、`no-console` 3 | 棘轮数字持续下调 | G8 遗留 |

---

## 6. 阶段排期

| 阶段 | 内容 | 出口 |
|---|---|---|
| ~~**P0 门禁**（1~2 天）~~ **✅ 已完成 2026-10-04** | T1–T6（执行记录见 §9） | push/PR 即跑 版本校验+tsc+lint+test，Android 构建失败真的会红 |
| **P1 补高危缺口**（3~5 天） | T7–T9、UI-02/03/04、DB-02/03、SCR-03、SVC-06、ENG-07 | 主表单与迁移有护栏，覆盖率 ≥60% |
| **P2 设备自动化**（2~3 天） | T11–T12、E2E-01~E2E-10 | 一条命令跑完真机回归 |
| **P3 非功能**（按需） | NFR-01/02、E2E-11/12、UI-06/07 | 性能基线 + 兼容性矩阵 |

---

## 7. 发布门禁（出口标准）

发版前**全部**满足才允许打 tag：

1. `npm test` 全绿，覆盖率不低于上次发布
2. `npm run typecheck` 零错误（不再有"可忽略"清单）
3. `npm run lint` 零 error
4. CI 的 `assembleRelease` 真实成功（不被 `exit 0` 吞）
5. 三处版本号一致，且用 `./scripts/bump-version.sh` 生成
6. P0 设备用例（E2E-01/02/03/07/08）在真机通过，logcat 无 FATAL
7. 涉及 DB 变更时：DB-02/03 迁移测试通过，且用**真实旧版本备份**验证过导入
8. 涉及网络功能时：必须在**国内网络真机**验证（本次教训 —— PC 能通不代表手机能通）
9. 打完 tag 并 push（当前 tag 停在 `1.3.1`，1.4~1.6 均缺失）

---

## 8. 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| 境外 API 在国内不可达/被污染 | 功能静默失效 | 国内源优先 + 多级回落 + 可见错误态；发布门禁第 8 条 |
| 迁移无测试 | 老用户升级丢数据 | T9；发版前用真实旧备份验证 |
| CI 不拦 push | 坏代码进 main | T5 |
| require cycle | LogBox 遮挡导航点击 | T4 |
| tag 缺失 | 无法回溯已发布 APK 对应代码 | 补打 1.4~1.6 tag |
| `any` 与 2 处历史 TS 错误 | 类型系统形同虚设 | T2 |
| **F-02** expo-sqlite teardown 竞态 | 进程被回收时未处理 Promise 拒绝；低频（1/13+），已验证不丢数据 | 登记观察；若能稳定复现则给 DB 访问加 teardown 取消 |
| **F-01** logcat 系统级噪音 | 崩溃类断言误报（实测 120 条噪音 vs 0 条真实崩溃） | harness 已按包名归属过滤；新写断言须沿用 |

---

## 9. P0 执行记录（2026-10-04）

T1~T6 全部完成。验证证据：

| 检查 | 结果 |
|---|---|
| `npx tsc --noEmit` | **退出码 0**（此前 4 个错误） |
| `npx eslint .` | **0 errors** / 64 warnings（此前 31 errors / 130 warnings） |
| `npx jest` | **249/249**，9 suites 全过 |
| `npm ci --dry-run` | **退出码 0**（此前必然失败，见下） |
| `npm run verify`（完整门禁链） | **退出码 0** |
| `./scripts/check-version.sh` | 通过路径 0 / 人为制造不一致时 1 |
| 真机回归冒烟 | 7/7 UI 断言通过（总览/账户/设置/资产/弹窗）；Require cycle 0、RN 错误 0、崩溃 0 |

### 9.1 T2 实际修的 4 个类型错误

1. `BottomSheet.tsx` — `BottomSheetDefaultBackdropProps` **未从包根导出**（v5 只导出 `BottomSheetBackdropProps`，前者是后者的超集）→ 改用公开导出的类型，多出的 `disappearsOnIndex`/`pressBehavior` 均为可选，展开合法。
2. `BottomSheet.tsx` — `enableKeyboardHandling` 在 `@gorhom/bottom-sheet` **v5 里根本不存在**（v4 遗留），传进去只会被忽略 → 删除这个失效的 API 表面（全仓无调用方），键盘行为由已有的 `keyboardBehavior="interactive"` 承担；`docs/design-system.md` 的属性表同步更正。
3. `app/index.tsx` — `currentValuation` 从 `HoldingCostResult` 上取，而该类型没有此字段 → 改用 `asset.currentValuation ?? asset.purchasePrice`，与 `app/assets.tsx:89` 的「资产总值」口径一致。
4. **澄清**：这段 `categoryBreakdown` 是**死代码**（只被 reduce 成 `totalCatValue`，而后者从未被渲染）。所以这个类型错误**没有用户可见影响**，不要把它记成"修好了一个空图表"。是否接上图表或删除，留待后续决定。

### 9.2 意外发现：`npm ci` 一直是坏的（比 G6 更严重）

原以为 CI 的问题只是"不触发"。实际上一旦触发，**第二步 `npm ci` 就会失败**：

- `react-test-renderer@19.2.7` 要 peer `react@^19.2.7`，而 Expo SDK 55 把 react 钉在 `19.2.0`
- `react-dom@19.3.0`（`@expo/metro-runtime` 的可选 peer，被自动装成最新）要 peer `react@^19.3.0`

两者都对齐到 `19.2.0` 后 `npm ci --dry-run` 退出码 0，三个 react 包版本一致。
→ 结论：**旧 CI 从未成功运行过一次**。G6（不触发）+ 本条（触发了也装不上依赖）叠加，所谓"CI 检查"完全是装饰。这也解释了为什么 `|| exit 0` 吞错长期没人发现。

### 9.3 F-07｜测量工具撒谎：`grep -c $'\r'` 数的是总行数

本环境下命令文本里的 CR 字节会被传输层吃掉，`grep -c $'\r'` 的模式因此变成**空串**，于是它数的是**总行数**。据此我曾错误断言"改动的文件全是 CRLF""`bump-version.sh` 在仓库里是 CRLF、Linux CI 会 `bad interpreter`"。

用 node 逐字节重测后真相：**工作区与仓库 blob 全部是纯 LF，CR=0**。git 的警告文字（"LF will be replaced by CRLF"）其实一直在说真话，是我的测量在撒谎。

→ 教训（已内化为习惯）：**任何计数都要用一个"物理上不可能的对照值"来自检**。当时 `adb-ui-test.sh` 报 438 个 CR 却只有 376 行 —— CR 数超过行数本就不可能，那一刻就该怀疑工具而不是文件。
→ `.gitattributes`（`*.sh text eol=lf`）因此从"修问题"降级为"**防问题**"：防止协作者 `core.autocrlf=true` 时把 `.sh` 检出成 CRLF 而在 Git Bash / Linux CI 里炸。仍然保留。

### 9.4 F-08｜`eslint --fix` 静默弄坏了一个测试套件

`import/first` 的自动修复把 import 提到 `jest.mock` 之前，而 `service.test.ts` 的 mock 工厂在**被 require 的瞬间**就会执行、引用到仍处于 TDZ 的 `const mockShare`：

```
ReferenceError: Cannot access 'mockShare' before initialization
```

结果是**整个套件无法运行**，测试总数从 249 **静默掉到 233**（jest 只报 "1 failed suite"，不看总数就不会发现）。共 5 个测试文件被同样重排，只有 service 当场炸，其余是"惰性访问所以侥幸没炸"。

处置：回滚全部测试文件的自动修复；在 `eslint.config.js` 里对 `__tests__/**` 关闭 `import/first` 并写明原因。
→ 教训：**跑完 `--fix` 必须立刻跑测试，并把"测试总数"当作断言**。数量下降就是信号，哪怕全部"通过"。

### 9.5 降级与豁免清单（全部可审计，无静默关闭）

| 位置 | 处置 | 理由 |
|---|---|---|
| `react-hooks/set-state-in-effect`（16 处） | 降为 warn → T13 | 全项目统一的「effect 内异步读 SQLite → setState」加载模式，改动等于跨 8 文件架构重构 |
| `react-hooks/preserve-manual-memoization`（3 处） | 降为 warn → T13 | 仅表示 React Compiler 跳过优化，非正确性问题 |
| `jest.setup.ts` 的 `react/display-name` | off（限该文件） | 全是给原生模块造的 mock 组件工厂，非发布组件；真实组件仍受约束（ListItem 两处已正经修） |
| `__tests__/**` 的 `import/first` | off | 见 F-08 |
| `LockScreen.tsx` 的 `shakeX.value = ...` | 单行 disable | Reanimated shared value 的**唯一**官方用法，React Compiler 的 immutability 规则不理解这种可变 ref API，属误报 |

其余 error 都是**真修**而非豁免：ListItem 改具名函数表达式（同时满足 display-name 与 immutability）、IconPickerSheet 把误用的 `useMemo` 改成 `useEffect`（消除渲染期 setState 的死循环风险）、accounts/LockScreen 把 effect 移到函数定义之后（该规则按源码顺序检查、不认 hoisting）、OnboardingView 的 ASCII 引号改中文引号、LockScreen 的 `tryBiometric` 包 `useCallback` 补齐依赖。

---

## 附录：本次贵金属 bug 的复盘（为何单测全绿却完全不可用）

三层根因，单测每层都测不到：

1. **环境**：`api.frankfurter.dev` 在国内 DNS 被污染到 `182.16.61.117`（真身 Cloudflare）→ 设备 curl `HTTP 000`/15s 超时。单测的 `fetch` 是 mock，永远成功。
2. **设计**：金银价与汇率 `Promise.all` all-or-nothing，单个 `!ok` 即 throw → 本来 `HTTP 200` 可用的 gold-api 现货价被连带作废。
3. **可观测性**：`catch {}` 静默吞错，无日志、无 UI 空态 → 用户与开发者都无从判断是"不适用"还是"失败"。

修复后对应三条防线：国内源优先的四级回落链 + 汇率独立缓存；金银价与汇率解耦并行；`console.warn` + 三态 UI（正常/失败重试/未填克数提示）。

**教训写进 §7 第 8 条**：任何网络功能，PC 上 curl 通不算通，必须在国内网络真机验证。
