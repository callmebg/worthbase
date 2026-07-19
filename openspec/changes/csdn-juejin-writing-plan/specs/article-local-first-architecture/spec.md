## ADDED Requirements

### Requirement: Article explains the local-first design philosophy
The article SHALL articulate why WorthBase chose local-first storage over cloud-based solutions, covering privacy concerns, offline reliability, and data ownership principles.

#### Scenario: Design rationale is clear
- **WHEN** reader finishes the motivation section
- **THEN** they understand the 3 core reasons for choosing local-first (privacy, offline, ownership)

### Requirement: Article documents the data persistence implementation
The article SHALL show the actual storage layer implementation, including which storage engine is used (MMKV/SQLite/AsyncStorage), how data is serialized, and the migration strategy.

#### Scenario: Storage implementation is documented
- **WHEN** article is published
- **THEN** it contains a code snippet showing the storage initialization and a basic read/write operation

### Requirement: Article covers data privacy measures
The article SHALL explain what privacy protections are in place: no network requests, no analytics, no telemetry. Include proof (e.g., network permission absence in app config).

#### Scenario: Privacy claims are verifiable
- **WHEN** reader checks privacy claims
- **THEN** they see reference to app.json/app.config permissions and can verify no network permissions are requested

### Requirement: Article addresses data backup and portability
The article SHALL explain how users can back up and transfer their data (export/import mechanisms, file format) without cloud dependency.

#### Scenario: Backup strategy is documented
- **WHEN** reader needs to back up data
- **THEN** the article describes the export/import process and data format

### Requirement: Article discusses trade-offs of local-first approach
The article SHALL honestly present the limitations of local-first: no multi-device sync, data loss risk if device is lost, manual backup responsibility.

#### Scenario: Trade-offs section exists
- **WHEN** article is published
- **THEN** it includes a dedicated trade-offs section with at least 3 limitations
