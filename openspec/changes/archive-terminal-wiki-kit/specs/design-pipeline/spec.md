## ADDED Requirements

### Requirement: Repository ships the archive-terminal wiki kit example

The repository SHALL ship `examples/archive-terminal-wiki-kit/` as a design-system package in the existing layout, with Google-format `DESIGN.md`, `MOTION.md`, a measured `GRAMMAR.md`, seven wiki page templates and art task sheets. It SHALL name no source site, game or character, contain no reference code or assets, and keep showcase previews free of art.

#### Scenario: Package and foundations

- **WHEN** `design-system check` and `foundation check --kind all` run with `--project-root examples/archive-terminal-wiki-kit`
- **THEN** both SHALL report `ready`, with every contrast pair passing in the light and dark themes.

#### Scenario: Generated files drift

- **WHEN** `build/build.cjs --check` runs after a template, preview or `tokens.css` was edited by hand
- **THEN** it SHALL exit 1 and name the stale files.

#### Scenario: A slot without a task sheet

- **WHEN** a template slot names a `data-task` with no sheet under `art-tasks/`, or a sheet is used by no slot
- **THEN** the kit's test SHALL fail and name the task.

### Requirement: Wiki templates pass the browser check and the keyboard run

Every page template SHALL pass `template check --browser` at desktop width and at 390 px, every compiled component preview SHALL pass it, and every control SHALL be reachable by keyboard with a 2px focus ring that the chamfer does not clip.

#### Scenario: Browser check

- **WHEN** `template check --browser` runs on a template where headless Chrome and Noto Sans CJK SC are installed
- **THEN** it SHALL exit 0 with no findings; without them the test SHALL skip and say why.

#### Scenario: Remote assets

- **WHEN** a template or `kit.js` references a remote URL
- **THEN** the kit's test SHALL fail and name the reference.
