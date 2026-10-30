## ADDED Requirements

### Requirement: Taste suite tracks upstream v2, classics and image skills

The packaged Taste suite SHALL vendor taste-skill v2, taste-skill-classics and imagegen-skills at pinned commits with their licences, and the guide SHALL route each request to the source that now holds that method. v2 tools SHALL produce evidence only and SHALL NOT act as hard gates.

#### Scenario: Classic style request

- **WHEN** a request names the minimalist or brutalist style
- **THEN** the guide SHALL route to the classics bundle file for that style

#### Scenario: Removed upstream skill

- **WHEN** the guide is packaged
- **THEN** it SHALL NOT route to `full-output-enforcement` or `output-skill`

#### Scenario: Inspector run

- **WHEN** `taste inspect` runs on a built page
- **THEN** it SHALL write the v2 inspection report to the evidence directory and SHALL NOT change any gate result

#### Scenario: Draw inside the roulette

- **WHEN** the style roulette uses `taste draw`
- **THEN** the drawn direction SHALL be labelled `roulette/taste-draw`, the stage SHALL still show three sources and six thumbnails, and the draw SHALL be recorded in the appearance ledger
