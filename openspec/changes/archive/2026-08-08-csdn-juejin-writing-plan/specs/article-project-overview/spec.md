## ADDED Requirements

### Requirement: Article covers project positioning and motivation
The article SHALL explain why WorthBase was built, the problem it solves (privacy-first personal finance tracking), and its target audience. The explanation SHALL include comparison with existing solutions (记账 App vs 财务状态管理).

#### Scenario: Reader understands project motivation
- **WHEN** a developer reads the article's opening section
- **THEN** they can articulate in one sentence what WorthBase does and why it exists

### Requirement: Article covers tech stack and architecture overview
The article SHALL present the complete tech stack (Expo SDK 57, React Native, local storage solution) and include an architecture diagram showing data flow from user input → local storage → UI rendering.

#### Scenario: Architecture diagram is included
- **WHEN** the article is published
- **THEN** it contains at least one architecture diagram with labeled components (data layer, business logic, UI layer)

### Requirement: Article is formatted for dual-platform publication
The article SHALL be written in standard Markdown that renders correctly on both CSDN and Juejin, with images using GitHub raw URLs and code blocks using fenced syntax with language tags.

#### Scenario: Article renders correctly on CSDN
- **WHEN** the Markdown is pasted into CSDN editor
- **THEN** all code blocks are highlighted, images display, and formatting is preserved

#### Scenario: Article renders correctly on Juejin
- **WHEN** the Markdown is pasted into Juejin editor
- **THEN** all code blocks are highlighted, images display, and formatting is preserved

### Requirement: Article length and readability
The article SHALL be between 2000-4000 Chinese characters, with clear section headers, and include a table of contents marker for CSDN (`[TOC]`).

#### Scenario: Article meets length requirements
- **WHEN** the article is finalized
- **THEN** word count is between 2000-4000 characters and contains at least 4 major sections

### Requirement: Article includes project links and call-to-action
The article SHALL end with links to the GitHub repository, a Star prompt, and an invitation for contributions.

#### Scenario: Reader can find the project
- **WHEN** a reader finishes the article
- **THEN** they see the GitHub URL and know how to Star or contribute
