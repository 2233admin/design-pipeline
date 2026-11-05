# Design pipeline delta

## ADDED Requirements

### Requirement: layer ablation eval
The repository SHALL keep a layer ablation eval outside the shipped package that runs fixed design scenarios under bare, prompt-only, full and full-minus-one-layer variants and scores the outputs without a model.

#### Scenario: Variant tree removes one layer
- **WHEN** a full-minus-layer variant is built
- **THEN** it SHALL contain the packaged skill files minus exactly the layer's declared files, with only the references, sentences, list items, rows or sections that point at them removed, and SHALL pass the package resource check

#### Scenario: Stale or breaking layer declaration
- **WHEN** a declared path matches no packaged file, or a kept script still requires a removed script
- **THEN** the build SHALL fail instead of producing the tree

#### Scenario: Outputs are scored deterministically
- **WHEN** a run's deliverable is scored
- **THEN** the score SHALL come from the render and DOM only: output contract, overflow, minimum font size, hierarchy floor, contrast, palette distance of element colours to the declared tokens, type-scale adherence, measurable anti-slop hard rules and rhythm proxies

#### Scenario: Flat page
- **WHEN** a deliverable that needs a dominant title has fewer than three type levels or a title smaller than the declared multiple of the body size
- **THEN** its hygiene score SHALL be reduced

### Requirement: ablation decisions are pre-registered
The ablation eval SHALL apply decision rules written before running, report per-layer deltas with spread from several runs per cell, and keep the optional blind judge separate from measured scores.

#### Scenario: Measured and judged evidence disagree or are missing
- **WHEN** a layer's measured delta is not significant after Holm correction, or the judge has not reached the pre-registered number of pairs in the same direction
- **THEN** the verdict SHALL be undetermined and SHALL NOT cut the layer

#### Scenario: Too few scenarios have data
- **WHEN** fewer than three scenarios have the minimum runs per cell for both variants
- **THEN** no verdict SHALL be given

#### Scenario: Near-identical runs
- **WHEN** a variant's runs are near-identical across runs in at least two scenarios
- **THEN** its measured advantage SHALL NOT count and only the blind judge MAY still prefer it

#### Scenario: Judge sees a variant name
- **WHEN** the blind judge prompt or image paths are prepared
- **THEN** they SHALL NOT contain variant names, and the left and right sides SHALL be randomised by a recorded seed
