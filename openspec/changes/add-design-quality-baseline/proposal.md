# Proposal: Design Quality Baseline (Layers C + A)

## Why

The pipeline can pass every gate it owns while delivering a low-quality surface. Today
`skill/evals/evals.json` only checks route, signals, and artifact presence, and
`scripts/qa.cjs` only checks tool correctness. No mechanism measures whether the delivered
design is good, and no mechanism measures whether design-pipeline improves a model's design
output at all.

Two numeric contracts already exist but are unwired:

- `skill/references/benchmark-manifest.schema.json` v2 requires `candidateSystem`, `systems`
  (minItems 2), `systemChannels`, and a six-field `fairness` block. That is an A/B ablation
  contract, not a model leaderboard.
- `skill/scripts/reconstruction-fidelity-contract.cjs:93,99` hard-caps
  `maxPixelDifferenceRatio <= 0.03` and `minSsim >= 0.97` for `exact-reconstruction`, but
  nothing in the repository computes either number. The values are supplied externally, so
  the contract currently asserts a measurement it never takes.

## What Changes

Two layers, each with its own ground truth, built on the existing contracts.

**Layer A - reference-grounded fidelity.** Compute the fidelity numbers the reconstruction and
website-cloning contracts already declare, from EvidencePort renders. The *fidelity metric family*
is scoped to `reference-reconstruction` and `website-cloning` scenarios, where a reference artifact
is the ground truth. Non-goal: similarity metrics are never applied to open-ended design.

**Layer C - open-ended design quality under ablation.** This is the layer with no reference truth,
and it is the majority of a design-quality scenario set. Its scenarios cover open-ended work -
product UI, marketing pages, dashboards, component systems, motion - routed through
`design-synthesis`, `component-first`, `motion-graphics`, and `product-foundation`. Judgment is
blind pairwise preference between two arms of the same model on the same byte-identical prompt: a
`baseline` arm (naked prompt) and a `candidate` arm (design-pipeline). The judge scores only
dimensions rendered evidence can settle; accessibility, engineering fit, and performance risk stay
hard-gate inputs, never judged scores.

**Both layers share one gate and one evidence lineage, without forcing one to pay for the other.**
A and C measurements are produced by separate adapters into auditable receipts, then projected into
the existing `benchmark-measurements.v2` shape of a `0..1` score plus evidence paths - the exact
input `benchmark-core.cjs:130` already consumes. One `benchmark-core` decides threshold, fairness,
required failure, and aggregate for both. No pairwise, rating, or metric-value field is added to
the manifest `scenario` object.

Coverage is declared per run rather than universally coupled. `benchmarkPurpose` is `fidelity`,
`design-quality`, or `combined`: a `fidelity` run is valid with no `visual-quality` scenario and is
usable in ordinary pixel-regression CI, but may claim only a fidelity verdict; a `design-quality`
run requires `visual-quality` coverage; `combined` requires both and reports them side by side. A
run is never described beyond its purpose.

**The CLI does not invoke models.** It emits two hash-bound arm briefs with identical prompt
digest and budgets, and accepts arm delivery only as submitted receipts whose lineage verifies.
It gains no provider, credential, budget, or session-isolation surface.

**Layer B stays as it is: a backstop.** Existing accessibility, responsive, and functional hard
gates remain required and blocking. They are never cited as evidence of design quality, mirroring
the existing `component-conformance-does-not-imply-visual-acceptance` separation
(`component-first-v2-core.cjs:102`).

## Subject Of Measurement

The primary axis is pipeline lift on a fixed model, not model ranking. Cross-model runs are a
secondary generalization axis: one manifest per model, never mixed into a single manifest. Whether
lift is larger on weaker or stronger models is a stratified result to observe and report, not a
success criterion.

## Non-Goals

- No parallel gate system. Layers ride `benchmark-manifest`/`benchmark-result` and the existing
  fidelity contract.
- No merge of Component Conformance into Visual Acceptance.
- No CLIP/SSIM applied to open-ended design work.
- No public leaderboard.

## Dependency

Consumes the archived v1 Gate implementation, the completed
`design-component-first-artifact-v2` receipt contract, and the shipped Playwright EvidencePort.
