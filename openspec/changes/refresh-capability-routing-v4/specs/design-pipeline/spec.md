# design-pipeline Specification Delta

## ADDED Requirements

### Requirement: Capability-first companion routing

The pipeline SHALL select companion skills from the required design capability and the target repository's existing stack rather than from skill-folder presence alone.

#### Scenario: Animation runtime is selected

- **WHEN** a change needs runtime animation
- **THEN** the pipeline SHALL compare CSS, Anime.js, GSAP, React View Transitions, and the existing project runtime against the documented motion requirements and SHALL NOT add overlapping runtimes without distinct responsibilities.

### Requirement: Version-sensitive capability profile

The pipeline SHALL report install discovery separately from version-sensitive capability compatibility.

#### Scenario: Installed Anime.js companion is stale

- **WHEN** `animejs` is installed but lacks one or more Anime.js v4.5 capability markers
- **THEN** self-check SHALL report a non-blocking warning with the missing markers and an official-documentation fallback.

### Requirement: Explicit multi-root skill discovery

The pipeline SHALL support explicit skill discovery across more than one filesystem root without inferring host-specific plugin-cache layouts.

#### Scenario: Companion skills use separate roots

- **WHEN** `DESIGN_PIPELINE_SKILL_ROOTS` or `CODEX_SKILLS_DIR` contains multiple platform-delimited roots
- **THEN** self-check SHALL search each root for companion skills and bundled resources.
