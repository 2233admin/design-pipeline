## ADDED Requirements

### Requirement: Complete pinned good-css source

The pipeline SHALL ship the complete reviewed good-css Git tree as byte-preserved source with
revision, Git tree, per-object identities, canonical hash and license evidence. It SHALL use the
existing snapshot, package-resource and source-check mechanisms without automatic upstream installation.

#### Scenario: Clean reviewed source is imported

- **WHEN** the selected clean revision is imported
- **THEN** every tracked file, practice, reference, specimen and attributed asset SHALL be packaged
- **AND** the snapshot SHALL match Git blob identities and the locked tree hash.

#### Scenario: Source evidence is incomplete or changed

- **WHEN** the source is dirty or a locked file is missing, added or modified
- **THEN** import or integrity verification SHALL fail without relabeling the source as current
- **AND** existing published artifacts SHALL not be silently overwritten by a failed import.

### Requirement: Reachable project-adapted CSS practices

CSS authoring and review SHALL route through the built-in good-css guide without requiring an
ambient skill. Every reviewed practice SHALL have a source link, relevant use, specimen and
verification/adaptation condition. Project tokens, semantics, browser support and existing v1
evidence and acceptance contracts SHALL remain authoritative.

#### Scenario: CSS is written through any authoring system

- **WHEN** a page or component uses CSS, utility classes, inline styles or CSS-in-JS
- **THEN** the agent SHALL load applicable original entries and adapt their complete conditions
- **AND** existing stage/web/tool and QA routes SHALL expose the guide offline.

#### Scenario: A technique cannot satisfy the target contract

- **WHEN** a feature lacks target-browser support or conflicts with accessibility, tokens or film seeking
- **THEN** the agent SHALL retain a usable verified fallback and record the limitation
- **AND** it SHALL NOT infer visual acceptance or deterministic playback from a CSS example.

### Requirement: Offline good-css specimen studies

The pipeline SHALL provide a maintained Node tool that builds all reviewed live specimens with
local assets into a new caller-owned directory without new dependencies or upstream deployment.
Existing output SHALL be preserved on rejection. Browser results SHALL remain scoped evidence.

#### Scenario: A clean isolated installation builds a study

- **WHEN** only the packaged skill and Node are available
- **THEN** every practice SHALL resolve to its runnable offline specimen and required assets
- **AND** a navigation specimen SHALL have its required second document.

#### Scenario: An output already exists or a feature is unsupported

- **WHEN** the builder receives an existing output or the browser cannot run an advanced feature
- **THEN** the builder SHALL refuse overwrite and the browser limitation SHALL remain explicit
- **AND** source/structural checks SHALL NOT be presented as Component Conformance or Visual Acceptance.
