## ADDED Requirements

### Requirement: Template distill drafts a style pack from a reference board

`template distill <provenance.csv> --images <dir> -o <dir>` SHALL measure each listed reference image without a model and write a style pack draft (`draft: true`, the style schema), its per-reference measures and a report. Images SHALL NOT be copied or embedded in any output. A board without an `id` column, with a duplicate id, or with no readable image SHALL exit 1; a listed reference without an image SHALL be skipped with a reason.

#### Scenario: Draft from a board

- **WHEN** `template distill` runs on nine generated references with annotations
- **THEN** it SHALL exit 0 and write `style.json`, `distill.json` and `report.md`, and `style.json` SHALL pass the bank's style validation.

#### Scenario: Board without ids

- **WHEN** the board CSV has no `id` column
- **THEN** it SHALL exit 1 naming the provenance columns to add.

#### Scenario: Missing output

- **WHEN** `-o` is not given
- **THEN** it SHALL exit 1 with `OPTION_REQUIRED`.

### Requirement: Draft thresholds are the reference distribution

Each threshold in the draft's `checks.measured` SHALL come from the references' distribution of one feature: p75 for a maximum, p25 for a minimum, p25-p75 for a band, with the reference count and a support level (`measured` from 8, `thin` from 3, otherwise `gap`). The report SHALL list supported thresholds and, separately, the gaps that need human judgement.

#### Scenario: Accent budget

- **WHEN** a board is distilled
- **THEN** the accent threshold SHALL equal the p75 of the references' strong-colour shares.

#### Scenario: A feature no reference carries

- **WHEN** no annotation gives text sizes
- **THEN** `type_ratio` SHALL be a gap in the draft and listed under gaps in the report.

### Requirement: Distill groups layouts and names the nearest template or a skeleton

The distill result SHALL group references into layout archetypes (aspect, title position, figure side or symmetry, whitespace) and SHALL name, for each, the nearest bank template measured on its default render; when no template is within 0.25, it SHALL give a template skeleton of median boxes, margins and type ratio.

#### Scenario: Left-title references

- **WHEN** every reference has its title in the left column of a landscape frame
- **THEN** the first archetype SHALL be a left-title landscape archetype whose nearest template is a left-title key visual.

#### Scenario: No close template

- **WHEN** the references are square and no square template exists
- **THEN** the archetype SHALL carry a skeleton.

### Requirement: Distill measures font roles by stroke contrast

Annotated text crops SHALL be measured at full resolution for stem width over bar thickness and stem over glyph height; a role SHALL be mincho at 1.8 or more, gothic at 1.35 or less, otherwise unclassified, with the lightest weight to ask for. With the open-font catalog installed its candidates SHALL fill the role's stack; otherwise the draft SHALL keep open defaults and name the `fonts query` command.

#### Scenario: High-contrast titles

- **WHEN** the title crops have thick stems and thin bars
- **THEN** the title role SHALL be mincho with high contrast.

#### Scenario: Thumbnail text

- **WHEN** a crop's text is under 16 px high
- **THEN** it SHALL be reported unmeasurable with the reason.

### Requirement: Distill compares a hand-made pack

With `--compare <style-id>` the result SHALL list, per comparable threshold, the hand value, the draft value, their ratio, whether they share a magnitude (within 3x) and why they differ, plus each hand palette colour's OKLab distance to the nearest draft colour.

#### Scenario: Shinbo palette

- **WHEN** the Nocturne Corridor finals are distilled with `--compare shinbo`
- **THEN** the pack's black, paper and red SHALL each have a draft colour within OKLab 0.01.

#### Scenario: Unknown pack

- **WHEN** `--compare nope` is given
- **THEN** it SHALL exit 1 with `OPTION_VALUE_INVALID`.

### Requirement: Distill ablates rules on rendered templates

With `--ablate` the result SHALL render the nearest templates with the draft palette and with one rule removed at a time, measure the renders as the references, and report each variant's distance to the reference distribution and its change; when rendering fails the ablation SHALL be reported as not run with the fix.

#### Scenario: Neutral ground removed

- **WHEN** the ablation tints the ground
- **THEN** the ground-chroma distance of that variant SHALL rise against the full draft.
