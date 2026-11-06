## ADDED Requirements

### Requirement: Template bank ships the atomic-age pack

The template bank SHALL ship the `atomic-age` style pack with ten templates. It SHALL name its case and a generic lineage, state "borrow grammar, never assets", keep agency, programme, brand and astronaut names out of its defaults, put a catalog family behind every OFL face, and carry as guidance the 64 px test, no drawn marks, no drawn realistic vehicles (#301) and unsigned annotations.

#### Scenario: List the pack

- **WHEN** `template list --style atomic-age` runs
- **THEN** it SHALL exit 0 with the pack's font roles, grammar, materials and its ten templates.

### Requirement: Atomic-age templates keep marks as slots and pass both halves of the check

Every atomic-age template that carries a mark SHALL expose it as an image slot whose note states its size and clear space, and SHALL NOT draw it. Each template SHALL pass the static check at every size, for seeds and in its variants, with and without the pack's faces, and the browser check with OFL fixtures in `--font-dir`.

#### Scenario: Default renders and variants

- **WHEN** each template renders at each size, for seeds 1-50 and in its variants
- **THEN** each static check SHALL pass, and each default render SHALL pass `--browser`.

#### Scenario: Copy or colour the template cannot carry

- **WHEN** a Latin slot gets CJK copy, or the travel poster gets a title ink under 3:1 on its ground
- **THEN** the render SHALL exit 1 with `OPTION_VALUE_INVALID` and a fix.

### Requirement: Embedded faces are measured at their own width

The static check SHALL measure text with advances read from the embedded font file only when the text's first family is a face its pack opted in at that weight and the same file embeds it with `@font-face`; all other text, and a face whose file cannot be read, SHALL keep the calibrated model.

#### Scenario: A condensed masthead

- **WHEN** `cover.atomic-magazine` renders with `--font-dir` holding League Gothic
- **THEN** the masthead's measured width SHALL equal the advances in that font file and the check SHALL pass.

#### Scenario: Another build of the face

- **WHEN** a font file of the same family name with other advances is supplied
- **THEN** the masthead SHALL be measured with that file's advances, not the pack's own face.

#### Scenario: The face is removed from the file

- **WHEN** the `@font-face` rules are stripped from that render
- **THEN** the masthead SHALL be measured with the model again and fail `text-overflow`.

### Requirement: Examples ship the atomic-age kit

`examples/atomic-age-kit/` SHALL fill all ten templates on a print-set sheet and carry a landing page that pass `template check --browser` at 1440 and 390 wide; every picture SHALL have its source and materials record with a matching hash, NASA imagery SHALL date from 1957-1975 and be credited, no mark file SHALL ship, and every art slot SHALL have a task sheet.

#### Scenario: Kit checks

- **WHEN** the kit's test runs
- **THEN** the renders SHALL pass the static check, the provenance SHALL match the files, the OFL subsets SHALL cover the copy, and the pages SHALL pass the browser check.
