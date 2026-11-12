## ADDED Requirements

### Requirement: Modern Web Guidance is a tracked optional companion

`companion-capabilities.json` SHALL hold the optional group `Web platform guidance` for skill `modern-web-guidance` and the profile `modern-web-guidance-skill` with `sourceMeta` pinned to the revision of the `modern-web-guidance` entry in `sources.lock.json`. The group SHALL print `DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest install` as its install hint. The package SHALL NOT ship upstream guides, scripts or search data.

#### Scenario: The skill is absent

- **WHEN** `check-deps.cjs --json` runs in a skill root without `modern-web-guidance`
- **THEN** the result SHALL be `OK` with exit code 0
- **AND** the group SHALL be `WARN` with the install hint and a fallback that names `good-css.md`, and the profile SHALL be `INFO`.

#### Scenario: The skill is installed and current

- **WHEN** the installed `SKILL.md` names `modern-web-guidance@latest search`, `modern-web-guidance@latest retrieve` and a browser-support policy section
- **THEN** the group and the profile SHALL be `OK` with no missing marker.

#### Scenario: The installed skill dropped a command

- **WHEN** the installed `SKILL.md` has no `retrieve` command
- **THEN** the profile SHALL be `WARN` and list `retrieve-command` as missing, and the result SHALL stay `OK`.

#### Scenario: Upstream guides are added to the package

- **WHEN** a `skill/vendor/modern-web-guidance` folder exists or a required package resource points into one
- **THEN** the repository tests SHALL fail.

### Requirement: Platform guidance is consulted when the task needs it

The route table, the implementation stage, `SKILL.md` and the job `modern-web-guidance` SHALL send work that produces or reviews one concrete platform pattern in a web interface, or a review needing a sourced platform rule, to `references/modern-web-guidance.md`. A change that only follows the repository's existing pattern, and backend, CI or tooling work, SHALL NOT consult it. Without the companion the agent SHALL use `good-css.md` and record that in `qa.md`.

#### Scenario: A dialog is requested and the companion is installed

- **WHEN** the work needs a modal that closes on an outside click
- **THEN** the route SHALL select the job `modern-web-guidance` and the guide SHALL direct a query of two to five words that names the UI primitive and no product, route, component or framework
- **AND** the consulted guide ids and any adopted fallback SHALL be recorded in `qa.md`.

#### Scenario: The brief copies an existing pattern or is not interface work

- **WHEN** the brief says to match or reuse the existing implementation, or is backend, database, CI or Docker work
- **THEN** `route` SHALL NOT select the job `modern-web-guidance`, even when the brief also names a pattern such as a dialog or a form.

#### Scenario: A stronger job owns the brief

- **WHEN** the brief names a clone, a critique, a GSAP technique or a motion term for the same pattern
- **THEN** the job that owns it SHALL win and the route SHALL stay a hint, not a requirement to run the CLI.

### Requirement: The project's own rules win over a guide

When a retrieved guide conflicts with the project's `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, a token, an existing component or a recorded user rejection, the project SHALL win and the divergence SHALL be noted in `qa.md`. A guide SHALL decide the platform feature and its fallback only where the project is silent.

#### Scenario: A project does not follow reduced motion

- **WHEN** a project rule says its console deliberately does not follow `prefers-reduced-motion` and a guide recommends following it
- **THEN** the project rule SHALL be kept and the divergence recorded.

#### Scenario: Experimental features

- **WHEN** a guide covers an Origin Trial or volatile feature
- **THEN** the guide SHALL direct the agent to ask the user before running `set-allow-origin-trials` or `set-allow-volatile-features`.

### Requirement: Every Modern Web Guidance command runs with telemetry off

Every `modern-web-guidance` command that the guide, the install hint, the companion list and the install documents write SHALL carry `DISABLE_TELEMETRY=1`, with the PowerShell form named once. The guide SHALL NOT rely on a profile setting the user may not have.

#### Scenario: A command is written without the variable

- **WHEN** a shipped document or the registry contains `npx modern-web-guidance@latest` or `npx -y modern-web-guidance@latest` followed by a command and no `DISABLE_TELEMETRY=1` before it
- **THEN** the repository tests SHALL fail, except for the allowlist pattern that ends in `*`.

### Requirement: A review cites a guide by id and one line

The anti-AI-slop review and the template check SHALL cite a platform rule as the guide id plus one line of conclusion in the reviewer's words, after retrieving the guide in the same run. They SHALL NOT copy guide text into evidence, reports or the repository, and a citation whose retrieval failed SHALL be dropped.

#### Scenario: A toast is used for something that needs handling

- **WHEN** a review finding rests on the guide `persistent-toast-notifications`
- **THEN** the finding SHALL read `persistent-toast-notifications: <one-line conclusion>` and carry none of the guide's wording.

### Requirement: The guide's provenance is verifiable in the lock

`sources.lock.json` SHALL record `modern-web-guidance` as an `adapted-reference` whose document is `skill/references/modern-web-guidance.md`. Its frontmatter SHALL record the reviewed revision, `reviewedPackage`, `reviewedSkillVersion`, a `reviewedContentHash` and the `contentHashScope` over the upstream `skills/modern-web-guidance/SKILL.md` and `LICENSE`.

#### Scenario: Upstream moves

- **WHEN** `sources:update` moves the revision
- **THEN** it SHALL recompute `reviewedContentHash` over the listed files at the new revision and the tests SHALL fail if the lock, the guide and the companion profile disagree.
