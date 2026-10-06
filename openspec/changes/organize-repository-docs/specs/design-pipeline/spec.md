## ADDED Requirements

### Requirement: Repository documents have one appropriate home

The repository SHALL keep public entry points and project foundations at the root, reusable
documentation under `docs/`, change artifacts under `openspec/changes/`, and generated local
evidence under ignored `.design-pipeline/`. Superseded documents SHALL be archived without
overwriting current or unrelated work. The existing QA runner SHALL reject unexpected root
Markdown documents.

#### Scenario: Historical root documents are organized
- **WHEN** legacy README copies, a historical report and a glossary are relocated
- **THEN** their bytes remain intact, active documentation links resolve, and root QA passes.

#### Scenario: A scratch document appears at the root
- **WHEN** QA finds a root Markdown file outside the documented public and foundation set
- **THEN** it reports that file as a repository hygiene failure.

### Requirement: Project visual foundations follow Google DESIGN.md

Root `DESIGN.md` and synthesis guidance SHALL use Google's official visual-system format and
section order. Local provenance extensions SHALL be distinguished from the upstream format;
intentionally absent token groups SHALL carry reasons rather than invented visual values.

#### Scenario: The repository delegates rendering to its host
- **WHEN** the repository's CLI and Markdown foundation is validated
- **THEN** its host-owned tokens are explicitly omitted, its prose describes visual presentation,
  and both the official format lint and existing foundation check pass.

### Requirement: Local development installations are not published

The repository SHALL ignore root local-tool dotpaths and BMAD installation/output folders by
default, while explicitly preserving shared Git configuration and GitHub automation. Removing
tracked local tooling SHALL preserve local file contents. QA SHALL reject tracked ignored files.

#### Scenario: Local tools are removed from the Git index
- **WHEN** BMAD, local agent skills, tool settings and the skill-manager lockfile are excluded
- **THEN** their local contents remain intact and normal Git staging does not reintroduce them.

#### Scenario: A fresh checkout has no local agent installation
- **WHEN** the public project instructions and packaged skill are used without `.agents`,
  `.claude` or BMAD folders
- **THEN** the shared instructions and repository QA work without those local installations.

#### Scenario: An ignored file is force-added
- **WHEN** an ignored local tool file appears in the Git index
- **THEN** the existing QA runner reports it as a publication hygiene failure.
