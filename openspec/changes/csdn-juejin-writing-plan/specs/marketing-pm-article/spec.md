## ADDED Requirements

### Requirement: Article opens with project scale context
The article SHALL establish the project's scope within 200 words: 75 source files, 11,669 lines of code, 8 account types, 4 amortization methods, built by one person in 5 days using vibe coding.

#### Scenario: Reader grasps the scale-vs-effort contrast
- **WHEN** reader sees the opening
- **THEN** they feel the contrast between project complexity and the 5-day timeline

### Requirement: Article explains requirement management approach
The article SHALL dedicate ~400 words to how requirements were managed as a solo developer: what was included, what was explicitly excluded, and how scope creep was prevented. Include specific examples of features that were cut or deferred.

#### Scenario: Scope decisions are concrete
- **WHEN** reader reviews requirement management section
- **THEN** they see at least 2 examples of features that were deliberately excluded and the reasoning

### Requirement: Article presents the 5-day timeline breakdown
The article SHALL include a visual timeline or table showing how the 5 days were allocated:
- Weekend Day 1-2: prototype + 小红书 content creation
- Weekday Evening 1-2: bug fixes based on 小红书 feedback
- Day 5: summary/documentation

#### Scenario: Timeline is visual and specific
- **WHEN** article is published
- **THEN** it contains a timeline table or diagram with day-by-day activities

### Requirement: Article explains vibe coding as efficiency multiplier
The article SHALL dedicate ~300 words to how vibe coding enabled the 5-day timeline: the "describe requirement → AI generates → run it → describe bug → AI fixes" cycle. Contrast with traditional solo development pace.

#### Scenario: Efficiency gain is quantified or illustrated
- **WHEN** reader finishes this section
- **THEN** they understand why vibe coding made 5 days possible instead of weeks

### Requirement: Article covers solo developer testing strategy
The article SHALL explain how testing was done as a solo developer: unit tests (Jest, 470 lines of engine tests), manual testing on device, and how 小红书 user feedback served as real-world testing.

#### Scenario: Testing approach is practical
- **WHEN** reader reviews testing section
- **THEN** they see specific testing methods used and understand the solo developer testing trade-offs

### Requirement: Article includes cross-links to other articles
The article SHALL include: a "回顾" link back to the tech article, a "下一篇" preview of the growth retrospective article, and links to relevant technical documentation articles.

#### Scenario: Cross-links form a narrative chain
- **WHEN** reader finishes this article
- **THEN** they have clickable paths to both the previous (tech) and next (growth) articles

### Requirement: Article ends with actionable takeaways
The article SHALL conclude with a summary of key project management lessons for indie developers (at least 3 takeaways), framed as actionable advice rather than generic platitudes.

#### Scenario: Takeaways are specific to indie development
- **WHEN** reader finishes the article
- **THEN** they see at least 3 takeaways that reference specific decisions made in this project

### Requirement: Article formatted for dual-platform with tone variants
The article SHALL be ~2500 Chinese characters. CSDN version emphasizes "项目管理方法论", 掘金 version emphasizes "独立开发者实战复盘". The core content is the same; only the opening tone differs slightly.

#### Scenario: Both platform versions exist
- **WHEN** publishing
- **THEN** there is one source file with a note on the opening tone variation for each platform
