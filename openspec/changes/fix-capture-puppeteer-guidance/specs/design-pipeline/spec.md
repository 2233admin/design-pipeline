## ADDED Requirements

### Requirement: Browser capture errors name both fixes

When `puppeteer-core` cannot be resolved, a browser-backed command SHALL fail with `TOOL_MISSING` and a message that names installing `puppeteer-core` in the project and passing `--puppeteer-module <absolute path>`. It SHALL NOT tell a project without HyperFrames to run `npm i hyperframes`.

#### Scenario: Plain project without puppeteer-core

- **WHEN** `composition capture` runs in a project with no `puppeteer-core` and no `--puppeteer-module`
- **THEN** the error SHALL name `npm i puppeteer-core` and `--puppeteer-module`, and SHALL NOT name `npm i hyperframes`

#### Scenario: HyperFrames project

- **WHEN** the project contains a HyperFrames install
- **THEN** the resolver SHALL use that `puppeteer-core` and no error SHALL be raised

#### Scenario: Explicit path that does not load

- **WHEN** `--puppeteer-module` names a path that cannot be loaded
- **THEN** the command SHALL fail and SHALL NOT fall back to another `puppeteer-core`

### Requirement: Direction capture instructions run without HyperFrames

The concepts-stage instruction and the direction failure hints SHALL give capture commands that include `--puppeteer-module <path>` taken from `doctor`, and `doctor` SHALL report whether `puppeteer-core` resolves from the project and where.

#### Scenario: Thumbnail capture in a plain project

- **WHEN** the agent follows the concepts instruction in a project without `puppeteer-core`
- **THEN** the thumbnail capture command SHALL carry `--puppeteer-module` with the path `doctor` reported

#### Scenario: doctor finds no puppeteer-core

- **WHEN** `doctor` reports `puppeteer-core` as missing
- **THEN** the report SHALL say to run `npm i puppeteer-core` or pass an existing path, and the direction instructions SHALL NOT proceed to capture

#### Scenario: Stale path

- **WHEN** a capture with `--puppeteer-module` fails with `puppeteer-core not found`
- **THEN** the message SHALL tell the agent to re-run `doctor` for the current path
