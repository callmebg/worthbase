## ADDED Requirements

### Requirement: Article documents project structure and conventions
The article SHALL show WorthBase's directory structure, explain the folder organization rationale (feature-based vs layer-based), and list coding conventions used.

#### Scenario: Project structure is clear
- **WHEN** reader reviews the structure section
- **THEN** they see a directory tree with annotations explaining each folder's purpose

### Requirement: Article covers Expo-specific development workflow
The article SHALL document the Expo development experience: hot reload, debugging setup, device testing (Expo Go vs dev build), and any Expo-specific gotchas encountered.

#### Scenario: Development workflow is documented
- **WHEN** a developer reads this section
- **THEN** they know how to set up the dev environment and avoid common Expo pitfalls

### Requirement: Article explains cross-platform adaptation
The article SHALL cover how platform differences are handled: conditional rendering, platform-specific styles, any modules that behave differently on Android vs iOS.

#### Scenario: Platform differences are documented
- **WHEN** article is published
- **THEN** it includes at least 2 examples of cross-platform adaptation with code

### Requirement: Article documents build and release process
The article SHALL explain the EAS build configuration, how releases are managed, and the deployment flow for both Android and iOS.

#### Scenario: Build process is reproducible
- **WHEN** a developer follows the build section
- **THEN** they understand the EAS config and release workflow

### Requirement: Article shares reusable patterns and lessons learned
The article SHALL extract at least 3 reusable React Native patterns from WorthBase that readers can apply to their own projects (e.g., state management pattern, custom hook pattern, navigation pattern).

#### Scenario: Reusable patterns are highlighted
- **WHEN** article is published
- **THEN** at least 3 patterns are explicitly called out with "可复用" or "Tip" markers
