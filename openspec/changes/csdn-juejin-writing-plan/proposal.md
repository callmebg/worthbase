## Why

WorthBase 是一款功能完善的开源个人财务 App（75 源文件，11,669 行代码），但在中文开发者社区的知名度有限。通过**双轨内容计划**在 CSDN 和掘金发布文章，可以：

- **提升项目曝光度** — 3 篇营销文章触达不同读者群，带来 Star 增长和用户
- **建立技术深度认知** — 8 篇技术文档展示架构设计和核心算法，吸引贡献者
- **建立个人技术品牌** — "vibe coding + 5 天独立开发" 的叙事具有传播力

当前时机合适：App 核心功能已稳定，vibe coding 话题正热，小红书推广已有真实数据可用于复盘。

## What Changes

采用 **3+8 双轨制**：

**轨道 A — 3 篇营销文章**（CSDN + 掘金，先写后连发）
- 第一篇：技术角度 — "我花 600 元用 AI 做了一个本地优先的个人财务 App"
- 第二篇：项目管理角度 — "一个人 5 天从 0 到 1 做一个 App"
- 第三篇：市场推广复盘（仅掘金）— "三篇小红书推广开源 App 的真实数据"
- **vibe coding** 作为贯穿三篇的主线

**轨道 B — 8 篇技术深度文档**（CSDN + 掘金，独立系列）
- 覆盖架构设计、核心算法、UI 实现、开发体验
- 第一篇营销文章中放置导航链接，作为技术延伸

**双平台策略**
- CSDN 侧重搜索长尾流量（百度/谷歌持续带来访问）
- 掘金侧重社区认可（首页推荐 + 用户互动）

## Capabilities

### New Capabilities

**轨道 A — 营销文章系列：**
- `marketing-tech-article`: 技术角度文章 — 600 元成本拆解、vibe coding 实践、三个核心功能的代码展示（持有成本策略模式、净资产趋势图表、自动备份机制）
- `marketing-pm-article`: 项目管理角度文章 — 5 天时间分配、需求管理、vibe coding 工作流、单人测试策略
- `marketing-growth-article`: 市场推广复盘文章（仅掘金）— 小红书三篇笔记真实数据、平台选择教训、23w→88w 叙事分析

**轨道 B — 技术深度文档系列：**
- `article-project-overview`: 项目总览 — 定位、技术选型、架构全景
- `article-holding-cost`: 持有成本计算深度解析 — 4 种分摊算法 + 策略模式 + 智能推荐
- `article-local-first-architecture`: 本地优先架构 — SQLite 存储方案、隐私设计、AppState 自动备份
- `article-net-worth-visualization`: 净资产趋势可视化 — SVG 图表、手势交互、降采样算法、线性回归预测
- `article-asset-lifecycle`: 资产生命周期 — 状态机、卖出结算算法、估值历史追踪
- `article-react-native-dx`: React Native / Expo DX — 项目结构、跨平台适配、EAS 构建
- `article-account-balance`: 多账户余额管理 — 8 种账户类型、负债处理、快照机制
- `article-design-system`: UI 组件库与设计系统 — 组件层次、主题 token、暗色模式

### Modified Capabilities

无

## Impact

- **内容产出**: 3 篇营销文章（~2500 字/篇）+ 8 篇技术文档（~3000 字/篇）
- **发布节奏**: 营销文章先全部写好，再 Day1/3/5 连发；技术文档按每周 1-2 篇节奏发布
- **平台适配**: CSDN（`[TOC]` 语法、技术标签 SEO）vs 掘金（专栏系列、社区互动）
- **交叉链接**: 营销文章 ←→ 技术文档互相导流，三篇营销文章之间也做自引链
- **素材依赖**: 项目源码（代码片段）、App 截图（`docs/screenshots/`）、小红书后台数据
- **时间投入**: 营销文章约 1 周完成全部 3 篇；技术文档 4-6 周
