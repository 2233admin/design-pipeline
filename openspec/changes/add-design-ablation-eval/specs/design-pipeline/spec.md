# Design pipeline delta

## ADDED Requirements

### Requirement: layer ablation eval
The repository SHALL keep a layer ablation eval outside the shipped package that runs fixed design scenarios under bare, prompt-only, full and full-minus-one-layer variants and scores the outputs without a model.

#### Scenario: Variant tree removes one layer
- **WHEN** a full-minus-layer variant is built
- **THEN** it SHALL contain the packaged skill files minus exactly the layer's declared files, with Markdown and JSON routes to them removed, and SHALL pass the package resource check

#### Scenario: Stale or breaking layer declaration
- **WHEN** a declared path matches no packaged file, or a kept script still requires a removed script
- **THEN** the build SHALL fail instead of producing the tree

#### Scenario: Outputs are scored deterministically
- **WHEN** a run's deliverable is scored
- **THEN** the score SHALL come from the render and DOM only: output contract, overflow, minimum font size, contrast, palette distance to the declared tokens, type-scale adherence, measurable anti-slop hard rules and rhythm proxies

### Requirement: ablation decisions are pre-registered
The ablation eval SHALL apply decision rules written before running, report per-layer deltas with spread from several runs per cell, and keep the optional blind judge separate from measured scores.

#### Scenario: Near-identical runs
- **WHEN** a variant's runs are near-identical across runs in at least two scenarios
- **THEN** its measured advantage SHALL NOT count and only the blind judge MAY still prefer it

#### Scenario: Judge sees a variant name
- **WHEN** the blind judge prompt or image paths are prepared
- **THEN** they SHALL NOT contain variant names, and the left and right sides SHALL be randomised by a recorded seed
