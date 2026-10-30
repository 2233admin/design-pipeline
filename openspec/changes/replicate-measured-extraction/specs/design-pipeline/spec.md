## ADDED Requirements

### Requirement: Replicate extraction is measured from the reference page

When the replicate reference is a live page or HTML, the pipeline SHALL measure its colours, type, spacing, radii, shadows and motion from computed styles and running animations into `extraction.json`. In replicate mode with a measured extraction, each DESIGN.md and MOTION.md token SHALL match a measured value within tolerance or be declared as added with a reason.

#### Scenario: Measured page

- **WHEN** `reference extract` runs on a page whose primary button is #1F6FEB with a 450 ms cubic-bezier(.2,.8,.2,1) hover transition
- **THEN** `extraction.json` SHALL list #1F6FEB with its count and sample selector, and the 450 ms duration and that easing

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
