## ADDED Requirements

### Requirement: Article opens with promotion results overview
The article SHALL open with a summary of the 3 小红书 posts and their outcomes within 200 words, establishing the "I tried, here's what happened" framing.

#### Scenario: Results are presented upfront
- **WHEN** reader sees the opening
- **THEN** they know: 3 posts were made, results were mixed, and real data will be shared

### Requirement: Article explains platform choice reasoning
The article SHALL dedicate ~300 words to why 小红书 was initially chosen over other platforms (user base size, content format, indie developer community presence), and why this choice turned out to be partially wrong.

#### Scenario: Platform analysis is honest
- **WHEN** reader finishes this section
- **THEN** they understand both the initial reasoning and why it didn't fully work

### Requirement: Article presents all 3 小红书 posts with complete funnel data
The article SHALL present each post with the full engagement funnel:

| 指标 | 篇1 (7/12) | 篇2 (7/14) | 篇3 (7/19) |
|------|-----------|-----------|-----------|
| 标题 | 不联网不注册！记账App——家底 | 买前算日均成本，我的冷静期App | 大厂离职结算后，我的余额从23w→88w📈 |
| 曝光 | 3,231 | 454 | 待观察 |
| 观看 | 559 | 65 | 39 |
| 封面点击率 | 16.00% | 13.20% | 待计算 |
| 点赞 | 13 | 1 | 3 |
| 评论 | 18 | 0 | 0 |
| 收藏 | 13 | 0 | 1 |
| 分享 | 4 | 0 | 1 |
| 涨粉 | 0 | 1 | — |
| 人均观看时长 | 28s | 33s | — |
| 互动总计 | 48 | 1 | 5 |

Each post SHALL include: the content angle, why that angle was chosen, the actual engagement data, and analysis of why it performed that way.

#### Scenario: Complete funnel data is presented
- **WHEN** article is published
- **THEN** the data table above (or equivalent) is included, showing the full funnel from 曝光→观看→互动

#### Scenario: Post 3 data is updated before publication
- **WHEN** the article is finalized for publishing
- **THEN** post 3's data is refreshed with at least 48h of metrics

### Requirement: Article extracts five specific lessons from the data
The article SHALL present 5 concrete lessons, each backed by specific data:

1. **"人"比"功能"有互动** — 篇1 (开发者故事) 48 个互动 vs 篇2 (功能介绍) 1 个互动。用户点进来不是因为"记账App"，而是因为"一个人花了500块用AI做了一个App"——故事，不是广告。
2. **具体数字 ≠ 共鸣** — 篇2 的 13.2% 点击率不算低（接近篇1的 16%），说明标题"买前算日均成本"有人想点。但点进去后 0 评论 0 收藏——用户看完觉得"哦，知道了"然后划走。内容没有承接住标题建立的期待。如果改成"算完我的iPhone每天花28块，我换回了千元机"，有"我的选择"和"我的改变"，用户反应会完全不同。
3. **爆款标题吸引来的人 ≠ 目标用户** — 篇3 "大厂离职23w→88w"标题吸引力强，但点进来的人想看"离职八卦"，不是"记账工具"。标题决定了谁来，内容决定了谁留下。
4. **算法惩罚链：一篇失败拖累后续内容** — 篇1 获 3,231 曝光 → 篇2 仅 454 曝光（篇1的 14%）→ 篇3 发布 24h 才 39 观看。小红书算法根据前几篇表现决定后续推流力度。篇2 的 0 互动让算法判定"上篇是运气"，导致篇3 几乎无初始曝光。教训：如果前几篇还没跑通，不要急着连续发，先调整内容策略。
5. **转化漏斗的结构性断裂** — 小红书用户（非技术为主）→ GitHub（需账号）→ 理解下载方式 → 侧载 APK，中间至少 4 步。559 次观看到实际下载估算仅 2-5 人（0.5%-1%），不是内容不好，是路径太长。

#### Scenario: All 5 lessons are backed by data
- **WHEN** reader reviews lessons section
- **THEN** each lesson references specific numbers from the data table (曝光量、互动数、转化率等)

### Requirement: Article explains the conversion funnel problem
The article SHALL articulate the structural conversion problem: 小红书 users (mostly non-technical) → GitHub (requires account) → understand Release/download → sideload APK. This 4-step funnel explains why GitHub conversion was near-zero.

#### Scenario: Conversion problem is visualized
- **WHEN** article is published
- **THEN** it includes a diagram or step-by-step breakdown showing where users dropped off

### Requirement: Article includes conversion estimate
The article SHALL include a rough conversion estimate table:

| 来源 | 观看 | 估算下载 | 转化率 |
|------|------|----------|--------|
| 篇1 | 559 | ~2-5人 | ~0.5%-1% |
| 篇2 | 65 | ~0人 | 0% |
| 篇3 | 39 | ~0-1人 | ~0%-2.5% |

And explain that 0.5%-1% is within the normal range for indie developer cold starts, but the structural funnel problem (4 steps from 小红书 to APK install) makes it uneconomical.

#### Scenario: Conversion data is quantified
- **WHEN** reader sees the conversion section
- **THEN** they have concrete numbers showing why the 小红书→GitHub path doesn't work

### Requirement: Article includes the pivot insight and continuation strategy
The article SHALL explain:

1. **The pivot**: 小红书 users (mostly non-technical) → GitHub download requires technical skills. CSDN/掘金 readers ARE developers who can complete this path. This article series IS the pivot in action.
2. **If continuing 小红书**: Don't post "功能介绍" anymore. Post real app usage records — "更新完7月净资产，离目标还差X万", "卖了台旧电脑，App算完我亏了X%", "本月持有成本XX元". Near-zero content cost, maximum authenticity, accumulates "记账" keyword search weight.

#### Scenario: Reader gets both the "why pivot" and "what to do differently"
- **WHEN** reader finishes this section
- **THEN** they understand why tech communities are a better fit, AND have a concrete alternative strategy if they want to continue on 小红书

### Requirement: Article includes vibe coding reflection
The article SHALL dedicate ~200 words to the insight: "vibe coding降低了'做出来'的门槛，但没降低'做好'的门槛" — building is easier, but quality, marketing, and user acquisition remain hard.

#### Scenario: Insight is framed as advice
- **WHEN** reader finishes this section
- **THEN** they have a memorable takeaway about the limits of AI-assisted development

### Requirement: Article ends with cross-links and community invitation
The article SHALL include: "前情提要" links back to the tech and PM articles, GitHub repository link, and an invitation for discussion (especially targeting 掘金's indie developer community).

#### Scenario: Reader can navigate the full series
- **WHEN** reader finishes this article
- **THEN** they see links to both previous articles and can access the project

### Requirement: Article is Juejin-exclusive
The article SHALL be published only on 掘金, not CSDN. The indie developer retrospective tone fits 掘金's community better.

#### Scenario: Article is only on Juejin
- **WHEN** publishing
- **THEN** it appears only on 掘金 with appropriate 掘金-specific formatting (topic tags, column assignment)
