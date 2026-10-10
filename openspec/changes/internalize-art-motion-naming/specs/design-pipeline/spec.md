## ADDED Requirements

### Requirement: Project-owned Art Motion capability
The skill SHALL ship the Art Motion runtime, engine source, fonts, examples, tools and method notes as project-owned material under `skill/tools/art-motion` and `skill/references/art-motion` with neutral names. No upstream mirror, importer, pinned upstream revision or reference-project name SHALL remain in tracked paths or contents, and no capability reached by a test, guide or CLI path SHALL be lost.

#### Scenario: Zero-hit naming acceptance
- **WHEN** tracked paths and file contents are searched case-insensitively for the former reference-project name
- **THEN** there are no matches
- **AND** repository QA fails its naming policy check if the name reappears

#### Scenario: Capability retained after the move
- **WHEN** the runtime is regenerated from the owned engine and exercised in a browser at caller-chosen sizes
- **THEN** all 35 style studies, eight grammars and the transition registry render with instance isolation as before
- **AND** rerunning the build reproduces the committed runtime byte for byte

#### Scenario: Former mirror material without a consumer
- **WHEN** a former mirror file has no test, guide, tool or CLI consumer
- **THEN** it is deleted instead of being packaged as a required resource

### Requirement: Retained attribution for adapted work
The package SHALL keep the original MIT copyright line and permission notice verbatim beside the adapted code and in every generated or scaffolded copy, and SHALL keep each bundled font's license beside the fonts. Notices SHALL attribute by copyright holder and license; a license text SHALL NOT be edited to remove a name.

#### Scenario: Generated runtime and scaffolded study
- **WHEN** the runtime is built or an `art-motion` or `visual-craft` study is scaffolded
- **THEN** the runtime header and the copied `LICENSE.art-motion` contain the canonical license text unchanged

#### Scenario: A license would need the removed name
- **WHEN** a retained license text itself contains the removed name
- **THEN** the license text stays unchanged and the conflict is reported instead of edited

### Requirement: Art Motion entry points through the pipeline CLI
Art Motion rendering and the audiovisual reference study SHALL run through `designer-pipeline` commands whose options are registered in the CLI option table. They SHALL reuse the existing reference analyzer and render kernel mechanism and return diagnostics without a new gate, receipt or schema.

#### Scenario: Render a style or grammar
- **WHEN** `art-motion render --spec <file> --output <new-dir>` runs with a valid spec
- **THEN** stills or exact-frame video and a `render-report.json` naming the runtime by `runtimeSha256` are written to the new directory

#### Scenario: Invalid render request
- **WHEN** the spec is invalid, the output exists or escapes the root, or an unregistered option is passed
- **THEN** the command exits 1 with the contract error and preserves existing files

#### Scenario: Reference study requested
- **WHEN** `reference analyze-video --path <video> --output <new-dir> --study` runs
- **THEN** the existing analyzer report is written together with `study.json` and audio evidence when the source has sound
- **AND** the same command without `--study` produces the unchanged analyzer output
