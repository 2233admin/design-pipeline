## MODIFIED Requirements

### Requirement: Reference pages are measured before they are judged

`reference extract --url <page> | --path <index.html> --output` SHALL measure a reference page's colours, type scale, spacing, radii, shadows and motion from computed styles and running animations without a model, in one page walk, and write `extraction.json`, palette evidence conforming to `design-pipeline.palette-evidence.v1` with status `pending`, draft DESIGN.md tokens and `tokens.dtcg.json`. Unsupported values SHALL be `(low confidence)`. Replicate EXTRACT and website-cloning Stage B SHALL run it first.

#### Scenario: Measured page

- **WHEN** `reference extract` runs on a page whose primary button is #1F6FEB with a 450 ms cubic-bezier(.2,.8,.2,1) hover transition
- **THEN** `extraction.json` SHALL list #1F6FEB with its count and sample selector, and the 450 ms duration and that easing

#### Scenario: Local page

- **WHEN** `--path` names an index.html inside `--root`
- **THEN** it SHALL be measured with the same walk and written to the same files as a `--url` page

#### Scenario: Existing outputs keep their meaning

- **WHEN** an extraction with motion and radii is written
- **THEN** the palette, type and spacing fields of `extraction.json`, `palette-evidence.json` and `design-md-draft.md` SHALL be the same as without them

## ADDED Requirements

### Requirement: Replicate tokens match the measured extraction

In replicate mode with a measured extraction, each DESIGN.md and MOTION.md token SHALL match a measured value within tolerance or be declared as added with a reason, and the owner's confirmation SHALL bind `extraction.json`.

#### Scenario: Estimated token is caught

- **WHEN** DESIGN.md sets the primary colour to #2070F0 and the extraction measured #1F6FEB
- **THEN** within ΔE2000 2 the token SHALL pass, and a token #3A80FF SHALL fail `token-not-measured` naming #1F6FEB as the nearest measured value

#### Scenario: Declared addition

- **WHEN** a token has no measured match and Source Decisions lists it as added with a reason
- **THEN** `foundation check` SHALL accept it and report it as an addition

#### Scenario: Image-only reference

- **WHEN** the replicate reference is only a screenshot
- **THEN** no measurement SHALL be required, and the reference step SHALL say that the values are observed, not measured

#### Scenario: Extraction changes after confirmation

- **WHEN** `extraction.json` changes after the owner confirmed the extraction
- **THEN** `next` SHALL ask the owner to confirm again, as for the other reference files
