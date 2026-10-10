# Design: Design Quality Baseline (Layers C + A)

## Correction Of Record

Nine statements are corrected here so the design does not inherit them.

1. The repository can render. `skill/adapters/playwright.cjs` and the EvidencePort path exist. What
   is missing is benchmark-side orchestration.
2. Render and capture do not make accessibility, contrast, or performance measurement free. Each
   needs its own adapter.
3. `aggregate` is permitted by `benchmark-result.schema.json:14,41`. The constraint is that
   per-dimension results are retained and no required failure is masked.
4. APCA does not replace WCAG 2. `accessibility-contrast.md:24-26` states WCAG 2 is still required
   for formal WCAG 2.x conformance claims. Contrast is dual-track: WCAG 2.x ratio is the compliance
   gate, APCA Lc is the perceptual advisory.
5. Lift on weaker versus stronger models is a stratified observation, not a success criterion.
6. Pairwise, Elo, and SSIM fields are NOT added to the v2 `scenario` object. `benchmark-core.cjs:130`
   consumes exactly `{score, evidence}` per system per scenario. Raw metric and judgment detail
   lives in separate receipts that project into that existing shape.
7. `blockMatch` recall alone cannot express "no hallucinated extras". Extra elements need their own
   precision penalty.
8. The VLM judge cannot judge accessibility, engineering fit, or performance risk from rendered
   evidence. Those are hard-gate inputs, not rubric dimensions.
9. `benchmark run` does not call models. The CLI has no provider, credential, budget, or session
   isolation contract, and gaining one would be a large new public surface.

## Contract Drift Corrected During Implementation

- Measurement ingestion for v3 is `benchmark-measurements.v3` with `judgments` and `fidelity`
  input maps, not bare `benchmark-measurements.v2`: a raw score for a measured dimension is a
  bypass, so v3 projects both layers itself.
- Layer A emits the existing `design-pipeline.reconstruction-evidence.v1` receipt. No
  `fidelity-metric-receipt.v1` is introduced.
- Element-level metrics are declared `unmeasured` by the adapter rather than computed.
- The judge receives the manifest scenario's own prompt and its expectations as evaluator
  expectations; nothing is hidden from the judge that the scenario itself declares.
- The run verdict scope for v3 is candidate-centric; v2 arithmetic is unchanged but is not reused
  for the run-level verdict.

## Projection Seam

The per-scenario compare is reused unchanged. The run-level verdict scope is NOT unchanged: see
"Candidate-Centric Verdict" below.

```text
raw measurement receipts (new, auditable, digest-bound)
  reconstruction-evidence.v1   reference/implementation/diff hashes, viewport, metrics
  judgment-receipt.v1          per-pair: dimension, order, judge id, verdict, rubric digest
        |
        |  projection (declared, deterministic, reversible to the receipt)
        v
design-pipeline.benchmark-measurements.v3
  { measurements: { [system]: { [scenarioId]: { score, evidence } } },
    judgments: { [scenarioId]: { planPath, unblindingPath, receiptPath } },
    fidelity:  { [scenarioId]: { arms: { [system]: { implementationPath, diffPath } } } } }
  A measured dimension takes no raw row: the evaluator projects it from the verified inputs.
        |
        v
benchmark-core.cjs  score >= threshold (unchanged) | fairness | channels | aggregate
                    v3 run verdict scoped to candidateSystem
```

Consequences: the public benchmark contract stays narrow; the raw pair/order/judge/metric record
stays fully auditable; a disputed score is always re-derivable from its receipt; and one gate
decides required failure and fairness for both layers.

## Harness Seam - Briefs, Not Dispatch

The CLI stays a deterministic control and verification layer. It never invokes a model.

```text
benchmark brief           -> two hash-bound arm briefs per scenario
                             identical prompt digest, context budget, tool budget, delivery class
   [ host executes both arms outside the CLI ]
benchmark submit          -> accepts delivery + evidence receipts, verifies lineage vs the briefs
benchmark judgment-plan   -> emits the blinded comparison plan: pair list, both orders, blinded
                             evidence refs, rubric digest, judged dimensions; no model call
   [ host runs the judge outside the CLI ]
benchmark submit-judgment -> accepts judgment-receipt.v1, verifies it covers exactly the planned
                             pairs and both orders, and that its rubric digest matches the plan
benchmark measure         -> runs deterministic local metrics only (fidelity-metrics), writes
                             reconstruction-evidence.v1
benchmark evaluate        -> projects receipts into benchmark-measurements.v3, calls the gate
```

The judge is host-executed, exactly like the arms. `JudgePort` is therefore a plan emitter and a
receipt verifier, not a model client: it decides which pairs exist, in which orders, under which
rubric, and it blinds arm identity - but it never issues a completion. `benchmark measure` runs
only deterministic local computation, so no step of the CLI needs a provider, credential, or
budget. This removes the contradiction between "the CLI never invokes a model" and a VLM-scored
layer.

`samePrompts` is enforced structurally: one prompt string per scenario, hashed once, embedded in
both briefs. No code path authors a baseline-only prompt. The remaining five `fairness` fields stay
declarations in this change; enforcing them is deferred and recorded as a known gap.

EvidencePort capture stays the existing Playwright adapter. A missing measurement stays `unknown`,
which `benchmark-core.cjs:129` already reports and `summarize` escalates to `blocked` when required.

Layer B ports (`a11y-metrics` axe-core, `contrast-metrics` WCAG ratio gate plus APCA advisory,
`perf-metrics` LCP/CLS/INP and long-frame budget) are named to fix the seam shape and are DEFERRED
to a separate change. Until they exist, the harness consumes the pipeline's existing accessibility,
responsive, and functional hard-gate results unchanged.

## Benchmark Purpose And Coverage

A fidelity benchmark is legitimate on its own. Forcing every pixel regression through an expensive
human or VLM review would make Layer A unusable in CI.

`benchmarkPurpose` declares what a run may claim:

| Purpose | Required coverage | May claim |
| --- | --- | --- |
| `fidelity` | at least one `reference-fidelity` scenario | measured fidelity verdict only |
| `design-quality` | at least one `visual-quality` scenario | design-quality verdict only |
| `combined` | both | both, reported side by side |

A `fidelity` run SHALL NOT be described as overall design quality, and a `design-quality` run SHALL
NOT be described as measured fidelity. `reference-fidelity` and `visual-quality` scores are never
averaged together.

## Scenario Set

| Dimension | Routes | Ground truth | Score source |
| --- | --- | --- | --- |
| `reference-fidelity` | `reference-reconstruction`, `website-cloning` | the reference artifact | `fidelity-metrics` |
| `visual-quality` | `design-synthesis`, `component-first`, `motion-graphics`, `product-foundation` | none - relative only | `JudgePort` pairwise win rate |
| existing dimensions | all | absolute thresholds | existing hard gates |

`visual-quality` scenarios are the open-ended majority of a `design-quality` or `combined` run:
product UI, marketing page, dashboard, component system, motion surface. They carry no reference
image and no expected output.

## Layer A - Reference-Grounded Fidelity

Ground truth is the resolved reference artifact. Applies only where one exists.

Computed by `fidelity-metrics` from the reference render, implementation render, and intentional
masks already declared in the fidelity receipt (`reconstruction-fidelity-contract.cjs:54-91`):

| Metric | Meaning |
| --- | --- |
| `pixelDifferenceRatio` | existing threshold field, now actually computed |
| `ssim` | existing threshold field, now actually computed |
| `blockRecall` | fraction of reference elements matched |
| `blockPrecision` | fraction of produced elements that correspond to a reference element |
| `blockF1` | harmonic mean of the two |
| `extraElementRate` | produced elements with no reference counterpart, over produced count |
| `positionMatch`, `colorMatch`, `textMatch` | geometric and content agreement |

Recall and precision are reported separately and `blockF1` is the single projected element-match
figure. A run that reproduces everything and invents many extra elements scores high recall, low
precision, and therefore low F1 - the failure mode the earlier recall-only definition missed.
`extraElementRate` above its declared cap is a failure regardless of F1.

Reference for the metric family: <https://arxiv.org/html/2403.03163v3>, implementations at
<https://github.com/NoviScl/Design2Code/tree/main/Design2Code/metrics>.

Existing thresholds unchanged and now genuinely evaluated: `exact-reconstruction` keeps
`maxPixelDifferenceRatio <= 0.03` and `minSsim >= 0.97`. Outcome mapping unchanged: missing evidence
`blocked`; complete measurement outside threshold `fidelity-limited` with exit code 3.

Enforced non-goal: the fidelity adapter refuses a `visual-quality` scenario with an explicit reason
code. Similarity to any single screenshot is not a definition of good design.

## Layer C - Open-Ended Design Quality Under Ablation

### Arms

| Arm | System id shape | Delivery |
| --- | --- | --- |
| baseline | `<model>@naked` | the user's prompt text, unmodified, no pipeline |
| candidate | `<model>@design-pipeline` | the same prompt text, routed through the pipeline |

`candidateSystem` is the pipeline arm; `systems` holds both, satisfying the existing v2
`minItems: 2` without a second contract. One manifest binds one model. Cross-model generalization
uses one manifest per model; mixing distinct model identities into one manifest's `systems` turns
the ablation axis into a leaderboard and is rejected.

### Judgment Scope

The VLM judge scores only dimensions a human could settle from the same rendered evidence.

| Dimension | Judged by | Evidence |
| --- | --- | --- |
| visual taste | JudgePort | screenshots |
| UX clarity / hierarchy | JudgePort | screenshots |
| responsiveness | JudgePort | multi-viewport screenshot set |
| motion quality | JudgePort | captured video or frame sequence |
| accessibility | hard gate only | DOM, a11y tree, contrast measurement |
| engineering fit | hard gate only | source, token conformance, component provenance |
| performance risk | hard gate only | perf trace, long-frame record |

The last three leave the subjective rubric entirely. They enter the result as independent hard-gate
inputs and are never a judged score, because a VLM cannot verify them from pixels and any number it
produced would be unfalsifiable.

### Judgment Protocol

Ground truth does not exist here, so the baseline is relative, never absolute. Three references:

1. **Ablation arm** - the primary baseline, and the only one that measures the pipeline's own value.
2. **Frozen human reference set** - a versioned, digest-bound corpus of human-made surfaces at the
   same carrier and viewing scale, per `references/anti-slop-review.md:69-70`. It is a calibration
   anchor for authoring rubric anchors, never a match target.
3. **Golden runs** - the pipeline's prior output on the same scenario, for regression.

Protocol:

- Pairwise, not absolute. The judge sees two candidates and picks per judged dimension.
- Anchored rubric with written 0-5 anchors per judged dimension, authored against the human
  reference set, stored with a digest.
- Position-bias control: every pair judged in both orders; order disagreement recorded as a tie.
- Verbosity-bias control: the judge receives rendered evidence only, never source text, so output
  length is not an input.
- Human spot-check at a declared fraction; agreement below the declared floor makes the scenario
  `blocked`.

Failure modes and mitigations follow the documented literature
(<https://www.sciencedirect.com/science/article/pii/S2666675825004564>,
<https://www.openlayer.com/blog/llm-as-judge-evaluation-guide>). An unanchored, unaudited judge is
not treated as evidence.

### Scoring

`evaluateV2` iterates `manifest.systems` and runs `scoreScenarios` once per system
(`benchmark-core.cjs:174-175`), so a measurement missing for either arm leaves that arm's scenario
`unknown` and escalates a required scenario to `blocked`. Both arms must therefore be projected.

Per scenario, over `N` judged comparisons across judged dimensions and both orders:

```text
candidate score = (wins   + 0.5 * ties) / N
baseline  score = (losses + 0.5 * ties) / N
candidate + baseline = 1
```

Both scores reference the same `judgment-receipt.v1` in `measurement.evidence`, so the pair is
always re-derivable from one record and cannot drift apart.

Layer A is projected per arm the same way: each arm's own render is measured against the same
reference artifact, producing a distinct score per system from that arm's
`reconstruction-evidence.v1` receipt. A reference artifact is never treated as one arm's output,
and the reference itself is authorized by `metricPolicy.references`, never chosen by the submission.

### Candidate-Centric Verdict

Complementary arm scores alone do not survive the v2 run verdict. `evaluateV2` applies the same
`scenario.threshold` to every system (`benchmark-core.cjs:174-177`) and rolls every system's
`failedRequired` into the run status. With a lift threshold above `0.5`, a winning candidate forces
`baseline = 1 - candidate < threshold`, so the comparator arm always fails and the run reports
`failed` exactly when the pipeline succeeded. Reusing v2's verdict arithmetic here is therefore
wrong, and the earlier claim that it is unchanged is withdrawn.

`evaluateV3` narrows verdict scope rather than changing the compare:

- `score >= threshold` per scenario per system: unchanged, still `benchmark-core.cjs:131-133`.
- Run `status`, `failedRequired`, and `unknownRequired` are computed from `candidateSystem` ONLY.
- Comparator systems are report-only: their per-scenario scores and statuses are retained and
  emitted in `systems[]`, but never contribute to the run verdict.
- `unknown` on a comparator arm is still surfaced, because a missing comparator measurement makes
  the candidate's lift claim unfalsifiable. It sets `judgment.incomplete` on the scenario, which
  blocks the candidate scenario for that reason rather than by borrowing the comparator's failure.
- `scenario.threshold` for a `visual-quality` scenario is read as the candidate win rate required
  to claim lift. A threshold at or below `0.5` is rejected, since parity is not lift.

v1 and v2 verdict behavior is untouched; this scope applies only to the v3 branch.

Per-dimension win/loss/tie counts, order disagreements, judge id, rubric digest, and human
agreement stay in the judgment receipt.

## Contract Changes

`benchmark-manifest.v2`'s branch is `additionalProperties: false` with `schema` as a `const`, so
editing it in place would silently change v2's meaning. Repository convention applies: add a `v3`
branch to the existing `oneOf`.

`design-pipeline.benchmark-manifest.v3` = v2, plus only:

- `benchmarkPurpose`: `fidelity | design-quality | combined`.
- `dimension` enum gains `visual-quality` and `reference-fidelity`.
- `judgmentPolicy`, required when any scenario is `visual-quality`: rubric id and digest, judge id,
  judged dimensions, `bothOrders` (const `true`), `humanSpotCheckFraction`, `minHumanAgreement`,
  human reference set id and digest.
- `metricPolicy`, required when any scenario is `reference-fidelity`: metric adapter id, required
  metric names, and `maxExtraElementRate`.

No pairwise, Elo, or metric-value field is added to `scenario`. Ingestion is
`benchmark-measurements.v3`: `measurements` for unmeasured dimensions plus `judgments` and
`fidelity` input maps that the evaluator projects itself. v1 and v2 ingestion are unchanged for
their own manifest versions.

`design-pipeline.benchmark-result.v3` mirrors v2 and adds `benchmarkPurpose` plus a
`measurementReceipts` index mapping each projected score to its receipt digest. `aggregate` is
retained; `failedRequired` and `unknownRequired` keep a required failure visible beside it.

`evaluateV3` is a new evaluator branch. It reuses `scoreScenarios` unchanged and narrows run-level
verdict scope to `candidateSystem`; comparator systems are emitted as report-only. It also rejects
a `visual-quality` `scenario.threshold` at or below `0.5`. `evaluateV1` and `evaluateV2` are not
modified.

Layer A reuses the existing `design-pipeline.reconstruction-evidence.v1`; no fidelity receipt
schema is introduced. Layer C adds `design-pipeline.judgment-plan.v1`,
`design-pipeline.judgment-unblinding.v1`, `design-pipeline.judgment-receipt.v1`,
`design-pipeline.judgment-rubric.v1`, and `design-pipeline.human-reference-set.v1`.

v1 and v2 remain valid and unchanged.

## Invariants

- `objective-floor-does-not-imply-visual-quality`: a passing hard-gate result is never serialized
  or reported as design-quality evidence, mirroring
  `component-conformance-does-not-imply-visual-acceptance` (`component-first-v2-core.cjs:102`).
- Every projected score is reversible to its receipt. A score whose receipt digest does not verify
  is `unknown`, never `passed`.
- `reference-fidelity` and `visual-quality` results are reported side by side, never averaged.
  `aggregate` may exist per system but cannot be cited without its per-dimension breakdown.
- A claim exceeding `benchmarkPurpose` is rejected: a `fidelity` run cannot claim design quality,
  a `design-quality` run cannot claim measured fidelity.
- A `visual-quality` result with a failed fairness block, a rubric or reference-set digest mismatch,
  a missing second judgment order, or human agreement below floor is `blocked`.
- The CLI never invokes a model. Arm delivery happens outside it and enters through receipts.
- A v3 run verdict is computed from `candidateSystem` only. A comparator arm's score never fails a
  run, and a comparator arm's missing measurement blocks the candidate scenario as an incomplete
  lift claim rather than as a borrowed failure.
- A `visual-quality` threshold at or below `0.5` is rejected. Parity is not lift.
