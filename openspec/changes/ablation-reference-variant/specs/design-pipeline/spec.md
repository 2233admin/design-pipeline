# Design pipeline delta

## ADDED Requirements

### Requirement: ablation eval compares references plus a design system against the skill
The layer ablation eval SHALL include a variant that installs no skill and gives the agent reference images and a project DESIGN.md, so that the practice of working from references and a design system can be compared with the full skill and with no skill.

#### Scenario: Working folder of the reference variant
- **WHEN** a run of the `reference-system` variant is prepared
- **THEN** the working folder SHALL contain at least one reference image under `references/` and a `DESIGN.md`, SHALL contain no skill folder, and the project rules SHALL NOT reveal that an experiment is running

#### Scenario: Scenario without a preset style
- **WHEN** the scenario gives no DESIGN.md to other variants
- **THEN** the `reference-system` variant SHALL receive the DESIGN.md of the scenario's style, and the report SHALL state that this comparison is between two practices with unequal input

#### Scenario: Reference pages shipped with the eval
- **WHEN** no reference folder is given on the command line
- **THEN** the eval SHALL use reference pages written for it, with no third-party material and with content that differs from every scenario, rendered to images before the agent sees them

#### Scenario: The owner's own references
- **WHEN** a reference folder is given on the command line
- **THEN** the eval SHALL take the images from the folder named after the scenario, or else the folder named after its style, and SHALL record the folder in the run's environment record

#### Scenario: No reference found
- **WHEN** the `reference-system` variant is selected and a scenario has no reference file
- **THEN** the run SHALL fail before the first agent call and SHALL NOT run that variant without references

### Requirement: ablation scenarios include product screens
The ablation eval SHALL include product-interface scenarios in its default sets, scored by the existing composite without new result columns.

#### Scenario: Product screen contract
- **WHEN** a product-interface scenario is loaded
- **THEN** it SHALL declare a style with a product type scale, a fixed viewport, real controls, and content that carries every state as text

#### Scenario: State carried by colour alone
- **WHEN** a deliverable drops the text label of a state and keeps only its colour
- **THEN** its content coverage SHALL fall below complete and its hygiene score SHALL be reduced

#### Scenario: Undersized hit areas
- **WHEN** a deliverable of a scenario that requires real controls has controls below the audit's target size
- **THEN** their count SHALL be written to the run's measure record and SHALL NOT change the composite score or the result columns

### Requirement: the ablation report answers three questions
The ablation report SHALL end with three questions, each answered yes, no or not enough data under the pre-registered decision rules: whether the full skill beats no skill, whether the full skill or references plus a design system is better, and whether removing the UI craft layer makes output better or worse.

#### Scenario: Measured scores without a judge
- **WHEN** the measured delta is significant and the blind judge has not reached the pre-registered number of pairs
- **THEN** the answer SHALL be not enough data

#### Scenario: The reference variant did not run
- **WHEN** the results contain no run of the `reference-system` variant
- **THEN** the second question SHALL say that the variant did not run, and the report SHALL NOT add the reference comparison family

#### Scenario: The UI craft layer was rarely read
- **WHEN** fewer than the pre-registered share of full-skill runs read the UI craft layer
- **THEN** the third question SHALL be answered not enough data

### Requirement: a layer that loses the ablation is cut or reworked
The ablation eval's README SHALL state, before any run, what follows from each verdict.

#### Scenario: A layer is judged worse
- **WHEN** removing a layer is judged to make output better
- **THEN** the documented outcome SHALL be an issue that removes the layer from the package or reworks it and repeats the ablation

#### Scenario: Not enough data
- **WHEN** a verdict is undetermined or the measured and judged evidence conflict
- **THEN** the documented outcome SHALL be to collect more data and SHALL NOT be to cut or keep anything
