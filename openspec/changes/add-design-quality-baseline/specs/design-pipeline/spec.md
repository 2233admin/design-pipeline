## ADDED Requirements

### Requirement: A benchmark run claims only what its declared purpose covers

Every v3 benchmark manifest SHALL declare `benchmarkPurpose` as `fidelity`, `design-quality`, or
`combined`. A `fidelity` run SHALL require at least one `reference-fidelity` scenario and SHALL be
valid without any `visual-quality` scenario. A `design-quality` run SHALL require at least one
`visual-quality` scenario. A `combined` run SHALL require both. A result SHALL NOT be described
beyond its purpose: a `fidelity` result SHALL NOT be reported as design quality, and a
`design-quality` result SHALL NOT be reported as measured fidelity. `reference-fidelity` and
`visual-quality` scores SHALL NOT be averaged together.

#### Scenario: A fidelity-only manifest runs in continuous integration

- **WHEN** a manifest declares `benchmarkPurpose: fidelity` with only `reference-fidelity` scenarios
- **THEN** validation SHALL accept it and no human or judge review SHALL be required
- **AND** its result SHALL report a fidelity verdict and SHALL NOT report design quality.

#### Scenario: A design-quality manifest omits quality coverage

- **WHEN** a manifest declares `benchmarkPurpose: design-quality` with no `visual-quality` scenario
- **THEN** validation SHALL reject the manifest as incomplete coverage.

### Requirement: Design quality is measured by ablation against an identical prompt

A `visual-quality` scenario SHALL be scored from blind pairwise preference between two arms of the
same model on one byte-identical prompt, where the baseline arm receives no pipeline assistance and
the candidate arm is the pipeline. One manifest SHALL bind one model identity across both arms;
mixing distinct model identities into one manifest's `systems` SHALL be rejected. Cross-model
generalization SHALL use one manifest per model, and any relationship between model capability and
measured lift SHALL be reported as a stratified observation, never a pass criterion.

#### Scenario: The ablation arms receive different prompts

- **WHEN** a submitted arm delivery's prompt digest differs from its arm brief's prompt digest
- **THEN** the submission SHALL be rejected and `samePrompts` SHALL be false
- **AND** the scenario SHALL NOT report a win rate.

#### Scenario: Two different models are placed in one manifest

- **WHEN** a v3 manifest's `systems` contains two distinct model identities
- **THEN** validation SHALL reject the manifest naming the ablation-axis violation.

### Requirement: The benchmark layer never invokes a model, including the judge

The CLI SHALL emit hash-bound arm briefs with an identical prompt digest, context budget, tool
budget, and delivery class, and SHALL accept arm delivery and evidence only as submitted receipts
whose lineage verifies against those briefs. Judgment SHALL likewise be host-executed: the CLI
SHALL emit a blinded comparison plan carrying the pair list, both orders, blinded evidence
references, judged dimensions, and the rubric digest, and SHALL accept only a submitted judgment
receipt covering exactly the planned pairs and orders under a matching rubric digest. Local
measurement SHALL be limited to deterministic computation. The CLI SHALL NOT acquire a model
provider, credential, budget, or session-isolation responsibility.

#### Scenario: A submitted delivery has no matching brief

- **WHEN** a delivery receipt references no verifiable arm brief digest
- **THEN** submission SHALL be rejected and the scenario SHALL remain `unknown`.

#### Scenario: A judgment receipt covers only one order

- **WHEN** a submitted judgment receipt omits a planned pair or one of its two orders
- **THEN** submission SHALL be rejected as partial coverage
- **AND** the scenario SHALL NOT report a win rate.

### Requirement: A lift verdict is scoped to the candidate arm

A v3 evaluator SHALL project a measurement for every system in the manifest, because each system
is scored independently. For a `visual-quality` scenario the candidate score SHALL be
`(wins + 0.5 * ties) / N`, the comparator score SHALL be `(losses + 0.5 * ties) / N`, the two SHALL
sum to one, and both SHALL cite the same judgment receipt. The run verdict - `status`,
`failedRequired`, and `unknownRequired` - SHALL be computed from `candidateSystem` only, and
comparator systems SHALL be emitted as report-only. A `visual-quality` threshold at or below `0.5`
SHALL be rejected, since parity is not lift. A `reference-fidelity` measurement SHALL be written
per arm from that arm's own render against the shared reference artifact.

#### Scenario: The candidate wins and the comparator therefore scores below threshold

- **WHEN** a `visual-quality` scenario has threshold `0.6`, candidate score `0.7`, and comparator
  score `0.3`
- **THEN** the run verdict SHALL be computed from the candidate only and SHALL be `passed`
- **AND** the comparator's below-threshold score SHALL NOT appear in `failedRequired`.

#### Scenario: The comparator arm has no measurement

- **WHEN** a required `visual-quality` scenario has a candidate measurement and no comparator
  measurement
- **THEN** the scenario SHALL be `blocked` as an incomplete lift claim
- **AND** the block reason SHALL name the missing comparator rather than a comparator failure.

### Requirement: Every projected score is reversible to an auditable receipt

Raw judgment and metric detail SHALL be recorded in receipts outside the benchmark contract, and
SHALL be projected into the existing `benchmark-measurements.v2` shape of a `0..1` score plus
evidence paths. Pairwise, rating, or metric-value fields SHALL NOT be added to the manifest
`scenario` object. A projected score whose receipt digest does not verify SHALL be `unknown`, never
`passed`.

#### Scenario: A receipt digest fails to verify

- **WHEN** a measurement's referenced receipt digest does not match the receipt content
- **THEN** the scenario status SHALL be `unknown` and required scenarios SHALL escalate to
  `blocked`.

### Requirement: Fidelity metrics penalize invented elements separately from missed ones

A `reference-fidelity` measurement SHALL report element recall and element precision separately and
SHALL project their harmonic mean as the element-match figure. Produced elements with no reference
counterpart SHALL be penalized through precision and through a declared extra-element rate cap. A
result SHALL NOT be reported as high element match on recall alone. Fidelity metrics SHALL NOT be
applied to a `visual-quality` scenario.

#### Scenario: Every reference element is reproduced alongside many invented ones

- **WHEN** element recall is high and element precision is low
- **THEN** the projected element-match figure SHALL be low
- **AND** an extra-element rate above the declared cap SHALL fail the scenario regardless of that
  figure.

### Requirement: Judged dimensions are limited to what rendered evidence can settle

The pairwise judge SHALL score only dimensions decidable from the rendered evidence it receives -
visual taste, UX clarity, responsiveness across viewports, and motion quality. Accessibility,
engineering fit, and performance risk SHALL NOT be judged scores; they SHALL enter the result only
as independent hard-gate inputs measured from DOM, accessibility tree, source, or trace evidence.
The judge SHALL NOT receive source text. Every pair SHALL be judged in both orders with order
disagreement recorded as a tie.

#### Scenario: A judge is asked to rate accessibility from screenshots

- **WHEN** a `judgmentPolicy` lists `accessibility` among its judged dimensions
- **THEN** validation SHALL reject the policy
- **AND** accessibility SHALL be sourced from its hard gate instead.

### Requirement: Judged quality requires an anchored rubric and human agreement

A `visual-quality` result SHALL carry a digest-bound anchored rubric, a digest-bound frozen human
reference set, both judgment orders, and a human spot-check whose agreement meets the declared
floor. A rubric digest mismatch, a reference-set digest mismatch, a missing second order, or
agreement below the floor SHALL produce `blocked`.

#### Scenario: The judge and the human spot-check disagree

- **WHEN** measured human agreement falls below `minHumanAgreement`
- **THEN** the scenario status SHALL be `blocked`
- **AND** the candidate win rate SHALL NOT be reported as passed.

### Requirement: An objective floor is never design-quality evidence

A passing accessibility, responsive, performance, or functional hard-gate result SHALL NOT be
mapped into a design-quality field or into a `visual-quality` score, and SHALL carry
`objective-floor-does-not-imply-visual-quality`. Per-dimension results SHALL be retained beside any
aggregate, and a required failure SHALL remain visible in `failedRequired` regardless of the
aggregate value.

#### Scenario: Every hard gate passes and no quality scenario ran

- **WHEN** all objective hard gates pass and no `visual-quality` scenario was measured
- **THEN** the result SHALL report design quality as not evaluated
- **AND** the aggregate SHALL NOT be presentable as a design-quality verdict.
