## ADDED Requirements

### Requirement: Article opens with compelling hook and motivation
The article SHALL open with the "600元 + AI" hook, explain the motivation for building WorthBase (privacy-first, no cloud dependency), and establish the vibe coding premise within 200 words.

#### Scenario: Hook captures attention
- **WHEN** a reader sees the article title and opening paragraph
- **THEN** they understand: what was built, how much it cost, and that AI did most of the coding

### Requirement: Article includes verifiable cost breakdown
The article SHALL include a cost table showing the actual token expenses, broken down by category (AI API fees, build costs, etc.), totaling approximately ¥600.

#### Scenario: Cost table is present and verifiable
- **WHEN** reader reviews the cost section
- **THEN** they see a table with line items and a total, and understand why app store listing was skipped

### Requirement: Article includes architecture diagram
The article SHALL present a tech stack overview with an architecture diagram showing data flow (user input → SQLite → Zustand store → React Native UI), with technology labels (Expo SDK 57, SQLite, Zustand, react-native-svg).

#### Scenario: Architecture is visualized
- **WHEN** article is published
- **THEN** it contains at least one labeled architecture diagram

### Requirement: Vibe coding section explains the workflow shift
The article SHALL dedicate ~300 words to explaining how vibe coding changed the development workflow: from "writing code" to "directing AI to write code + reviewing output". Include the specific prompt-to-review cycle.

#### Scenario: Vibe coding workflow is clear
- **WHEN** reader finishes this section
- **THEN** they can describe the author's vibe coding workflow in one sentence

### Requirement: Article shows three core features with real code
The article SHALL present three core features with real code snippets from the project source:
1. **持有成本计算** (~400字): Strategy pattern factory (`getStrategy()`) + one strategy's 3 methods + 4-method comparison table + `AmortizationRecommender` smart defaults
2. **净资产趋势** (~400字): `downsamplePreservingExtrema()` function + `ProjectionCalculator` linear regression + chart screenshots
3. **自动备份** (~200字): `AppState` listener triggering `BackupService.createBackup()` on background

#### Scenario: All three features have code and explanation
- **WHEN** article is published
- **THEN** each feature section contains at least one code snippet with file path reference and a plain-language explanation

### Requirement: Article includes holding cost comparison table
The article SHALL include a 4-row comparison table of the amortization methods (SimpleLinear, ExpectedLifespan, ResidualValue, NoAmortization) with formula, use case, and recommended asset category.

#### Scenario: Comparison table is screenshot-worthy
- **WHEN** reader sees the table
- **THEN** it is self-contained and useful without reading the surrounding text (standalone value for screenshotting/bookmarking)

### Requirement: Article includes at least 2 App screenshots
The article SHALL include at least 2 screenshots from `docs/screenshots/`: one showing the dashboard/net worth trend, one showing the holding cost calculator.

#### Scenario: Screenshots demonstrate the app
- **WHEN** article is published
- **THEN** screenshots are embedded with descriptive captions

### Requirement: Article includes technical difficulty section
The article SHALL describe at least 2 technical challenges encountered during development and how they were resolved (e.g., gesture conflicts in chart component, SQLite migration, cross-platform differences).

#### Scenario: Challenges are specific, not generic
- **WHEN** reader reviews challenges section
- **THEN** each challenge includes: what the problem was, why it was hard, and the specific solution applied

### Requirement: Article ends with project links and series navigation
The article SHALL end with: GitHub repository URL, Star prompt, "下一篇" preview linking to the PM article, and links to the 8-article technical documentation series for readers who want deeper dives.

#### Scenario: Reader has clear next actions
- **WHEN** reader finishes the article
- **THEN** they see GitHub link, next article preview, and technical doc series links

### Requirement: Article formatted for dual-platform publication
The article SHALL be ~2500 Chinese characters, use standard Markdown with fenced code blocks (language-tagged), GitHub raw image URLs, and include CSDN `[TOC]` marker and SEO tags (`#React Native #Expo #SQLite #AI编程`).

#### Scenario: Article renders on both platforms
- **WHEN** pasted into CSDN and Juejin editors
- **THEN** formatting, code highlighting, and images render correctly on both
