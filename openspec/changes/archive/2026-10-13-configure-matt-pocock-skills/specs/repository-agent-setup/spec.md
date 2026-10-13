## ADDED Requirements

### Requirement: Engineering skills consume repository policy
The repository SHALL expose tracker, triage and domain guidance through AGENTS.md and docs/agents while preserving canonical task authority and existing domain documents.

#### Scenario: Engineering skill starts repository work
- **WHEN** an installed engineering skill needs tracker, label or domain guidance
- **THEN** it reads the corresponding docs/agents guide through AGENTS.md
- **AND** it uses Multica for execution tasks and docs/glossary.md for domain vocabulary

#### Scenario: Upstream defaults conflict with repository policy
- **WHEN** a skill proposes a parallel tracker, glossary or engineering decision store
- **THEN** repository guidance retains existing task authority, glossary and OpenSpec decisions
