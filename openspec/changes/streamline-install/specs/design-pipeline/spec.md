## ADDED Requirements

### Requirement: Claude Code installs the Release package through a plugin marketplace

The repository SHALL ship `.claude-plugin/marketplace.json` with one plugin, `design-pipeline`, whose source is the `design-pipeline-skill.zip` Release asset. The package SHALL contain a generated `.claude-plugin/plugin.json` at its archive root, so that root is a plugin root with `SKILL.md` as its one skill. Both files SHALL pass `claude plugin validate`.

#### Scenario: A user installs from the marketplace

- **WHEN** a user runs `/plugin marketplace add 2233admin/design-pipeline` and `/plugin install design-pipeline@design-pipeline`
- **THEN** Claude Code SHALL fetch the Release zip, not clone `skill/vendor`, and list one skill, `design-pipeline`.

#### Scenario: The package is a valid plugin root

- **WHEN** `scripts/package.cjs` builds the archive
- **THEN** `design-pipeline/.claude-plugin/plugin.json` SHALL name `design-pipeline`, carry the package version and declare the root as the skill directory
- **AND** `PACKAGE.json` and `package-resources.json` SHALL list it as generated content.

### Requirement: Other agents install the Release package with the Skills CLI

Documentation SHALL give one command for Codex and other agents that installs the Release zip with `npx skills add <release zip URL> --skill design-pipeline -a codex -g`, naming the Skills CLI size limits the package exceeds. It SHALL install to `~/.agents/skills/design-pipeline`.

#### Scenario: The package exceeds the CLI defaults

- **WHEN** the documented command runs
- **THEN** it SHALL set the download, extracted-size and file-count limits above the package's 49 MB and about 1600 files.

### Requirement: Local installer defaults to the standard agent skills directory

`scripts/install-local.cjs` SHALL install to `~/.agents/skills/design-pipeline` unless `--root` or `--target` is given. It SHALL NOT read `CODEX_HOME` or `CODEX_SKILLS_DIR` and SHALL NOT default to `~/.codex/skills`.

#### Scenario: No location is given

- **WHEN** `install-local.cjs` runs with only `--source` and `CODEX_SKILLS_DIR` and `CODEX_HOME` set to other directories
- **THEN** the skill SHALL be installed under the home directory's `.agents/skills/design-pipeline` and the set directories SHALL stay untouched.

### Requirement: Doctor reports the environment in three tiers

`doctor` SHALL print a readable report by default and keep the machine result under `--json`, which SHALL add an `environment` object. The report SHALL name the skill's install path (from the script's own location), the agents found, and three tiers: required (Node.js 22.12+, package files), recommended (a Chromium browser found by the shared browser resolver), optional (the MengTo and iart bundles, ffmpeg and ffprobe, Blender). Each missing item SHALL print one copyable command.

#### Scenario: An optional or recommended item is missing

- **WHEN** the browser, ffmpeg or Blender is absent and the required items pass
- **THEN** `doctor` SHALL exit 0, print the command for each missing item and install nothing.

#### Scenario: A required item is missing

- **WHEN** Node.js is older than 22.12 or a package file listed in `package-resources.json` is absent
- **THEN** `doctor` SHALL report `blocked` and exit 2.

#### Scenario: JSON keeps its previous keys

- **WHEN** `doctor --json` runs
- **THEN** every key the result had before this change SHALL be present and `environment.tiers` SHALL hold the three tiers.

### Requirement: Missing tools name the command that installs them

When a task needs a browser, ffmpeg, ffprobe or Blender and it is not found, the error or finding SHALL name the same install command `doctor` prints for it. Nothing SHALL install a tool automatically.

#### Scenario: A film task finds no ffmpeg

- **WHEN** an audio or film command cannot start ffmpeg
- **THEN** the `TOOL_MISSING` error SHALL include the ffmpeg install command for the platform.

#### Scenario: An evidence gate finds no browser

- **WHEN** the browser resolver finds no Chromium browser
- **THEN** the error SHALL include `npx hyperframes browser ensure`.

### Requirement: SKILL.md declares its environment

`skill/SKILL.md` frontmatter SHALL include `compatibility` (at most 500 characters) naming Node.js 22.12+, the optional browser, ffmpeg and Blender, and network use for `sources fetch`.

#### Scenario: Frontmatter is checked

- **WHEN** `node scripts/qa.cjs` checks the skill frontmatter
- **THEN** `name`, `description` and `compatibility` SHALL be present and `compatibility` SHALL not exceed 500 characters.

## MODIFIED Requirements

### Requirement: Standard default skill discovery

Without nonempty explicit root settings, self-check SHALL search, in first-seen order: the directory that holds the running copy (when it sits in a folder named `design-pipeline`), `~/.claude/skills`, `~/.agents/skills`, `<cwd>/.agents/skills`, `<cwd>/.claude/skills`, then the legacy `<CODEX_HOME>/skills` or `~/.codex/skills`. The running copy SHALL count as the core skill wherever it is. Explicit roots SHALL replace all defaults. Checks SHALL NOT install or repair skills.

#### Scenario: Standard user installation

- **WHEN** an installed `check-deps.cjs --json` runs without explicit root settings and a complete pipeline and companion are installed under `~/.agents/skills` or `~/.claude/skills`
- **THEN** core status and overall result SHALL be `OK`, missing resources SHALL be empty, the companion SHALL be discovered and the process SHALL exit 0.

#### Scenario: Standard project installation

- **WHEN** an installed checker runs from a project with a complete pipeline and companion under `<cwd>/.agents/skills` and no explicit root settings
- **THEN** core status and overall result SHALL be `OK`, missing resources SHALL be empty, the companion SHALL be discovered and the process SHALL exit 0.

#### Scenario: A plugin install is checked

- **WHEN** `check-deps.cjs` runs from a Claude Code plugin cache directory whose name is a version
- **THEN** the core pipeline SHALL be found at the running copy and the result SHALL be `OK`.

#### Scenario: Legacy and customized Codex homes remain supported

- **WHEN** explicit roots are unset
- **THEN** `<CODEX_HOME>/skills`, or `~/.codex/skills` when `CODEX_HOME` is unset, SHALL be the last default root
- **AND** complete installations and companions there SHALL remain discoverable.

#### Scenario: Default roots overlap

- **WHEN** the resolved default roots coincide
- **THEN** each resolved directory SHALL appear once in first-seen order.

#### Scenario: A default installation is incomplete

- **WHEN** a required resource is absent from all default roots and from the running copy
- **THEN** self-check SHALL identify the missing resource, report core and overall `FAIL`, and exit 1 without attempting repair.

#### Scenario: An explicit root is invalid

- **WHEN** `DESIGN_PIPELINE_SKILL_ROOTS` or `CODEX_SKILLS_DIR` names a directory without the pipeline
- **THEN** core and overall status SHALL be `FAIL` even if a complete default installation exists.

## REMOVED Requirements

### Requirement: Local install script uses `CODEX_SKILLS_DIR` as a skills root

**Reason**: The local installer defaults to `~/.agents/skills` and no longer reads Codex-specific environment variables; `--root` and `--target` select any other location.

**Migration**: Pass `--root <skills directory>`. An existing `~/.codex/skills/design-pipeline` is not migrated or deleted.
