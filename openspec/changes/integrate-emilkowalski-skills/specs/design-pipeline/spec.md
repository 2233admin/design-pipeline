# design-pipeline Delta: integrate emilkowalski/skills

## ADDED Requirements

### Requirement: Emil companion skills use the plural upstream repository

The pipeline SHALL document and self-check Emil design skills against `https://github.com/emilkowalski/skills` (not `emilkowalski/skill`).

#### Scenario: Maintainer or agent reads install hints

- **WHEN** a user runs `node skill/scripts/check-deps.cjs` with missing Emil motion skills
- **THEN** install hints SHALL reference `https://github.com/emilkowalski/skills`.

#### Scenario: Companion catalog lists Emil sources

- **WHEN** a user reads `skill/references/companion-skills.md`
- **THEN** every Emil skill source column SHALL use `emilkowalski/skills`.

### Requirement: Motion companion set includes apple-design

The Motion / Animation companion set SHALL include `apple-design` alongside `emil-design-eng`, `animation-vocabulary`, and `review-animations`.

#### Scenario: Motion design self-check group

- **WHEN** self-check evaluates the Motion design skill group
- **THEN** it SHALL include `apple-design` in the checked skill list.

#### Scenario: Pipeline skill entrypoint lists motion companions

- **WHEN** an agent follows `skill/SKILL.md` for animation-specific work
- **THEN** it SHALL see `apple-design` as a motion companion for Apple HIG-inspired and fluid system UI motion.

#### Scenario: Motion spec points at Emil companions

- **WHEN** an agent creates `motion.md` from `skill/references/motion-spec.md`
- **THEN** the template SHALL name `emil-design-eng`, `animation-vocabulary`, `review-animations`, and `apple-design` as companion skills from `emilkowalski/skills`.

## MODIFIED Requirements

### Requirement: Optional companion skill fallback

The pipeline SHALL not fail only because optional companion skills are missing. Emil skills (`emil-design-eng`, `animation-vocabulary`, `review-animations`, `apple-design`) remain enhancement-level; missing skills SHALL report warnings with motion-spec fallbacks.

#### Scenario: User has only design-pipeline installed

- **WHEN** self-check runs with only the core pipeline installed
- **THEN** required checks SHALL pass and missing Emil motion skills SHALL report warnings with fallbacks, not hard failure.
