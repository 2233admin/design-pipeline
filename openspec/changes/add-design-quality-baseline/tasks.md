# Tasks: Design Quality Baseline (Layers C + A)

## Implementation Status (partial)

This change is **in progress**. No task box above is checked. What exists in the tree today:

**Built and covered by tests** (`tests/design-quality-baseline.test.cjs`, `tests/design-quality-judgment.test.cjs`, the two registered suites):

- `benchmark-manifest.v3` validation in `skill/scripts/benchmark-core.cjs`: `benchmarkPurpose`
  coverage, extended dimension enum, `judgmentPolicy`/`metricPolicy` with authorized references,
  exactly two arms, one model identity, `visual-quality` threshold above 0.5.
- `evaluateV3`: candidate-centric run verdict, report-only comparators, per-dimension aggregates,
  incomplete-comparator blocking. `evaluateV1`/`evaluateV2` untouched.
- `benchmark-measurements.v3` ingestion: a raw `{score, evidence}` row for `visual-quality` or
  `reference-fidelity` is rejected; both are projected from verified inputs. The trusted project
  root is injected by the caller and a submitted `projectRoot` is refused.
- Layer A in `skill/scripts/fidelity-metrics-core.cjs`: strict PNG decode (chunk CRC, IHDR order,
  IEND, no trailing bytes), computed `pixelDifferenceRatio` and windowed `ssim`, emitting the
  existing `design-pipeline.reconstruction-evidence.v1` receipt. Exact-reconstruction only, with
  the contract's 0.03 / 0.97 caps enforced on the policy.
- Layer C in `skill/scripts/judgment-core.cjs`: public plan with no arm identity, salted
  commit-and-reveal unblinding, side-only verdicts, symmetric neutral-path evidence, both orders
  with swapped sides, comparison-level folding (order disagreement is one tie), recomputed
  rubric/reference-set digests with anchored levels and attributed entries, recomputed
  comparison-level human agreement, and prompt/expectation binding to the manifest scenario.

**Not implemented; tasks remain open:**

- Arm delivery/evidence receipt *documents* are not loaded or verified. `armDeliveryReceiptHashes`
  and `armEvidenceReceiptHashes` are format-checked and required distinct only, so the stated
  per-arm execution lineage is not yet proven.
- Element-level fidelity metrics (`blockRecall`, `blockPrecision`, `blockF1`,
  `extraElementRate`, `positionMatch`, `colorMatch`, `textMatch`) are reported as
  `unmeasured`, never computed.
- Masked and adaptive reconstruction modes are refused rather than measured.
- Indexed PNGs, `tRNS` transparency, non-zero compression/filter methods, interlacing, and
  non-8-bit depth are refused rather than approximated. The decoder measures only the
  non-interlaced 8-bit truecolor/greyscale rasters the EvidencePort writes.
- A fidelity-limited arm's projected score is forced to `0` so the gate failure propagates. The
  measured SSIM survives only inside `fidelity[scenario][system].receipt`, so the reported
  aggregate understates that arm. Separating the continuous metric from the hard gate is open work.
- `benchmark brief`, `benchmark submit`, `benchmark judgment-plan`,
  `benchmark submit-judgment`, and `benchmark measure` do not exist. `createDeveloperBrief`
  still rejects a v3 manifest, so the v3 CLI workflow does not ship.
- The public JSON schemas carry no v3 branch; only the code validates v3.
- No scenario set is authored, and no Layer B adapter is built.
- No CLI-level v3 `benchmark evaluate` test exists; coverage is at the core boundary.

## 1. Contract

- [ ] Add `design-pipeline.benchmark-manifest.v3` as a new branch in
      `skill/references/benchmark-manifest.schema.json` `oneOf`. v2 unchanged. New keys only:
      `benchmarkPurpose` (`fidelity | design-quality | combined`), `dimension` enum gains
      `visual-quality` and `reference-fidelity`, `judgmentPolicy`, `metricPolicy`.
- [ ] Do NOT add pairwise, Elo, or metric-value fields to `scenario`. `benchmark-core.cjs:130`
      consumes exactly `{score, evidence}`; that ingestion shape stays untouched.
- [ ] Add `design-pipeline.benchmark-result.v3`: v2 plus `benchmarkPurpose` and a
      `measurementReceipts` index of score-to-receipt-digest. Keep `aggregate`, `failedRequired`,
      `unknownRequired`.
- [ ] Add receipt schemas outside the benchmark contract:
      `design-pipeline.arm-brief.v1`, `design-pipeline.fidelity-metric-receipt.v1`,
      `design-pipeline.judgment-receipt.v1`.
- [ ] Extend `benchmark-core.cjs` validation only: coverage per `benchmarkPurpose`
      (`fidelity` needs a `reference-fidelity` scenario, `design-quality` needs a `visual-quality`
      scenario, `combined` needs both), policy presence per dimension, and rejection of mixed model
      identities inside one manifest's `systems`. The per-scenario compare is unchanged.
- [ ] Add `evaluateV3` as a new evaluator branch: reuse `scoreScenarios` unchanged, compute run
      `status`/`failedRequired`/`unknownRequired` from `candidateSystem` only, emit comparator
      systems as report-only, and set `judgment.incomplete` when a comparator measurement is
      missing. Reject a `visual-quality` `scenario.threshold` at or below `0.5`. Do not modify
      `evaluateV1` or `evaluateV2`.

## 2. Briefs and submission (no model invocation)

- [ ] Add `benchmark brief`: emit two hash-bound `arm-brief.v1` per scenario with an identical
      prompt digest, context budget, tool budget, and delivery class. Arm identity is withheld from
      the judge.
- [ ] Enforce `samePrompts` structurally: one prompt string, hashed once, embedded in both briefs.
      No code path authors a baseline-only prompt.
- [ ] Add `benchmark submit`: accept delivery and evidence receipts, verify lineage against the
      brief digests, reject a submission whose prompt digest differs from its brief.
- [ ] The CLI adds no model provider, credential, budget, or session-isolation surface. Arm
      execution is the host's responsibility.
- [ ] Emit the remaining five `fairness` declarations unchanged with the known-gap note that they
      are not runtime-enforced by this change.

## 3. Layer A - fidelity metrics

- [ ] Add a `fidelity-metrics` adapter computing `pixelDifferenceRatio`, `ssim`, `blockRecall`,
      `blockPrecision`, `blockF1`, `extraElementRate`, `positionMatch`, `colorMatch`, `textMatch`
      from the reference render, implementation render, and intentional masks.
- [ ] Report recall and precision separately; project `blockF1` as the element-match figure. Fail
      when `extraElementRate` exceeds `metricPolicy.maxExtraElementRate` regardless of F1.
- [ ] Write `fidelity-metric-receipt.v1` and wire `reconstruction-fidelity-contract.cjs` to
      evaluate its declared thresholds against computed values instead of externally supplied
      numbers. Existing caps unchanged: `maxPixelDifferenceRatio <= 0.03`, `minSsim >= 0.97` for
      `exact-reconstruction`.
- [ ] Make the adapter refuse a `visual-quality` scenario with an explicit reason code.
- [ ] Preserve outcome mapping: missing evidence `blocked`; measured-but-outside-threshold
      `fidelity-limited` with exit code 3.

## 4. Layer C - judgment

- [ ] Author the anchored rubric for the judged dimensions ONLY: visual taste, UX clarity,
      responsiveness, motion quality. Written 0-5 anchors each, calibrated against the frozen human
      reference set, stored with a digest.
- [ ] Explicitly exclude accessibility, engineering fit, and performance risk from the rubric. They
      enter the result as independent hard-gate inputs and are never a judged score.
- [ ] Add the frozen human reference set as a versioned, digest-bound corpus at the same carrier
      and viewing scale, per `references/anti-slop-review.md:69-70`. Calibration anchor only.
- [ ] Add `JudgePort` as a plan emitter and receipt verifier, NOT a model client: `benchmark
      judgment-plan` emits the pair list with both orders, blinded evidence refs (screenshots,
      multi-viewport sets, motion capture only - never source text), judged dimensions, and the
      rubric digest. The CLI issues no completion.
- [ ] Add `benchmark submit-judgment`: accept `judgment-receipt.v1` and verify it covers exactly
      the planned pairs and both orders with a matching rubric digest. Reject partial coverage.
- [ ] `judgment-receipt.v1` per pair: dimension, order, judge id, verdict, rubric digest.
- [ ] Implement the human spot-check at `humanSpotCheckFraction`; agreement below
      `minHumanAgreement` makes the scenario `blocked`.
- [ ] Block on rubric digest or reference-set digest mismatch, or a missing second order.

## 5. Projection

- [ ] Add `benchmark measure`: runs deterministic local metric adapters only (`fidelity-metrics`)
      and writes their receipts. It never calls a model. Judgment receipts arrive through
      `benchmark submit-judgment`.
- [ ] Add `benchmark evaluate`: projects all receipts into `benchmark-measurements.v2` and calls
      the gate.
- [ ] Layer C projection MUST write a measurement for BOTH arms, since `evaluateV2`/`evaluateV3`
      score each entry of `systems` separately: candidate `(wins + 0.5*ties)/N`, baseline
      `(losses + 0.5*ties)/N`, summing to 1, both citing the same `judgment-receipt.v1`.
- [ ] Layer A projection MUST write a per-arm score: each arm's own render measured against the
      same reference artifact, from that arm's `fidelity-metric-receipt.v1`. Never treat the
      reference artifact as one arm's output.
- [ ] Every projected score carries its receipt digest in `measurement.evidence`. A score whose
      receipt digest does not verify is `unknown`, never `passed`.
- [ ] Never average a `reference-fidelity` score with a `visual-quality` score.

## 6. Layer B boundary (integration only, out of build scope)

Scope is C + A. No accessibility, contrast, or performance adapter is built here; `a11y-metrics`,
`contrast-metrics`, and `perf-metrics` are named in `design.md` as future ports and deferred.

- [ ] Consume the pipeline's existing accessibility, responsive, and functional hard-gate results
      as-is.
- [ ] Serialize `objective-floor-does-not-imply-visual-quality` and refuse to map any hard-gate
      pass into a design-quality field or into a `visual-quality` score.

## 7. Scenario authoring

- [ ] Author `visual-quality` scenarios across `design-synthesis`, `component-first`,
      `motion-graphics`, `product-foundation`, and `reference-fidelity` scenarios across
      `reference-reconstruction`, `website-cloning`.
- [ ] Ship at least one `fidelity` purpose manifest usable in CI with no human or VLM review, and
      one `combined` purpose manifest for release evaluation.
- [ ] Keep `privateExpectations` hidden from both arms and from the judge prompt.
- [ ] One manifest per model for cross-model generalization. Report lift stratified by model
      capability as an observation, not a pass criterion.

## 8. Verification

- [ ] Add tests to `tests/` and register them in `scripts/test-manifest.json` (qa.cjs asserts the
      manifest matches the directory exactly): v3 accept/reject; purpose-scoped coverage (a
      `fidelity` manifest with no `visual-quality` scenario is VALID, a `design-quality` manifest
      without one is rejected); mixed-model rejection; brief prompt-digest equality and rejection of
      a mismatched submission; order disagreement producing a tie; agreement-below-floor producing
      `blocked`; unverifiable receipt digest producing `unknown`; recall-high/precision-low input
      producing low `blockF1`; `extraElementRate` over cap failing; fidelity thresholds evaluated
      against computed values; fidelity adapter refusing `visual-quality`; a `fidelity` result
      refusing a design-quality claim.
- [ ] Add tests for the verdict scope and judgment seam: complementary arm scores summing to one;
      a winning candidate at threshold `0.6` with comparator `0.3` yielding run `passed` and an
      empty `failedRequired`; a `visual-quality` threshold at or below `0.5` rejected; a missing
      comparator measurement blocking the candidate scenario with a missing-comparator reason;
      a judgment receipt omitting one planned order rejected as partial coverage; `evaluateV1` and
      `evaluateV2` behavior unchanged by the v3 branch.
- [x] Run `node scripts/qa.cjs`. (green; repository verification only, not slice completion)
