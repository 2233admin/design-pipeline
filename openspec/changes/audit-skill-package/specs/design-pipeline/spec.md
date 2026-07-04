# Skill Package Audit Delta

## ADDED Requirements

### Requirement: Repository QA validates distributable skill metadata

The repository QA SHALL fail when `skill/SKILL.md` is missing valid `name` or `description` frontmatter.

#### Scenario: Skill frontmatter is missing

- **WHEN** `node scripts/qa.cjs` runs
- **THEN** it SHALL report a failure for missing or invalid `skill/SKILL.md` frontmatter.

### Requirement: Repository QA validates skill references

The repository QA SHALL check that referenced `references/*` and `scripts/*` files exist.

#### Scenario: Referenced skill file is missing

- **WHEN** a skill document references a missing file
- **THEN** `node scripts/qa.cjs` SHALL fail and report the missing reference.

### Requirement: Local install script uses `CODEX_SKILLS_DIR` as a skills root

The local install script SHALL interpret `CODEX_SKILLS_DIR` as the directory containing skill folders.

#### Scenario: User installs to a temporary skills root

- **WHEN** `CODEX_SKILLS_DIR=/tmp/skills node scripts/install-local.cjs` runs
- **THEN** the skill SHALL be installed to `/tmp/skills/design-pipeline`.

