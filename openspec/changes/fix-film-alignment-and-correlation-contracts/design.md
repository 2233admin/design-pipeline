## Decision and context

Retain the tracking HUD camera-stage alignment design and make the structural cut implementation obey its existing strict squared-correlation contract. The reviewer chose the already documented alignment design rather than introducing a new full-lens acceptance gate; integration and final verification belong to the parent reviewer.

`structureSteps` decodes native-rate 160x90 grayscale frames and emits `change = 1 - r`, not `1 - r²`. `structureCut` currently tests only `change >= 1 - sqrt(1/2)`, so an inversion can be accepted as decorrelation. Strict `r² < 0.5` is equivalent to `1 - sqrt(1/2) < change < 1 + sqrt(1/2)`; both endpoints must be rejected.

The archived `2026-10-13-add-ff-tracking-template/design.md` decision 5 records why a full-lens 3 px criterion was rejected: LED quantization and depth-of-field gather deliberately move glyph centroids. `skill/references/film-tracking-hud-template.md` and the probe implement camera-stage tolerances and report artistic shifts. The archived specification retained the earlier full-lens criterion; this new delta replaces it without rewriting history.

## Goals and non-goals

- Reject structurally preserved correlation of either sign, including exact boundaries, using the existing structural detector and output fields.
- Preserve the four-times-calmer preceding-step requirement, native-frame adjacency, default dark-cut recognition and dissolve/whip rejection.
- State exactly what alignment conformance and artistic-offset evidence mean.
- Do not add full-lens acceptance limits, tune pixel/scene thresholds, change schemas, refactor unrelated detectors, alter artistic lens rendering or touch upstream vendor bytes.

## Alternatives and tradeoffs

| Option | Contract fidelity | Compatibility and risk |
| --- | --- | --- |
| Keep one-sided inclusive structural threshold | Violates strict squared-correlation criterion for inversion and endpoints | No code change, but false planned-cut evidence persists |
| Recover and square `r` for each candidate | Expresses the criterion directly | Adds arithmetic and avoidable rounding at endpoints; unnecessary when `change` already has two equivalent strict bounds |
| Use two strict bounds on existing `change` (chosen) | Enforces both signs and excludes endpoints | Small predicate-only edit; preserves exported steps and receipt shape |
| Add a full-lens centroid acceptance limit | Contradicts the archived artistic-lens decision | Default effects can fail technical conformance for intentional blur/quantization |
| Keep camera budgets and report artistic offsets (chosen) | Matches the documented design and runtime | Requires an explicit specification correction, not a weaker camera gate |

## Implementation and evidence contract

Keep `STRUCTURE_CUT_MIN` and use a strict lower bound plus a strict upper bound `1 + Math.SQRT1_2`. Do not change the preceding-step ratio or rounded returned evidence. Tests directly exercise the exported structural detector for exact bounds and both correlation signs, and exercise real ffmpeg decoding plus `evaluateFilmRender` for consumer-visible missed-cut evidence.

The lossless inversion fixture uses 160x90 grayscale stripes at levels 40 and 44, swapped at 9 s. Their variance is measurable, their negative correlation preserves structure, and their difference is at the pixel detector's non-changing four-level boundary. The regression asserts the actual decoded strong negative correlation, calm preceding step, absent scene/pixel cuts and the final `planned-cuts-missing` finding; no production threshold is adjusted to accommodate it.

The probe already checks marker error against 1 px and glyph error against 3 px using the camera stage with LED quantization disabled. `ledShiftPx` and `fullLensShiftPx` and their summary fields are measured effect offsets, not additional alignment checks. Existing `checks.markers` / `checks.glyphs` remain the alignment checks. Lens pixels and page captures still participate in the existing repeated-seek and cross-process determinism check. No probe schema or implementation change is needed.

## Ownership, compatibility and migration

| Asset | Relation and scope | Risk | Verification | Rollback |
| --- | --- | --- | --- | --- |
| `skill/scripts/film-core.cjs` | Worker-owned structural predicate | Some formerly accepted inversions become missed, as required | Existing continuity suite plus new strict-boundary and real-decode regressions | Restore prior predicate only if the normative criterion is explicitly revised |
| `tests/film-continuity.test.cjs` | Worker-owned existing regression seam | FFmpeg-dependent fixture skips when tools are absent; direct bound checks do not | Parent runs the named focused test file with FFmpeg installed | Remove only new cases with any reverted behavior change |
| New change documents | Worker-owned followup contract | Must not silently change historical decisions | Parent runs strict OpenSpec validation | Revert this unarchived followup as a unit |
| Changelog and active specification delta | Parent-owned integration | Updating the consolidated spec outside archive would bypass the change lifecycle | Keep the complete MODIFIED requirements in this followup; archive updates the consolidated spec later | Revert this unarchived followup with its behavior change |
| Probe and maintained guide | Existing consumers; intentionally unchanged | Full-lens reports must not be presented as projection acceptance | Parent runs a real scaffolded probe and inspects fields/checks | No runtime migration required |

No callers need migration; output keys, CLI exit codes and budgets are unchanged. Technical conformance never grants creative or visual acceptance.

## Verification handoff

No builds, tests, linters, formatters or probe runs are performed in the worker slice. Parent owns `node --test tests/film-continuity.test.cjs tests/ff-tracking-hud.test.cjs`, strict validation of this change, `npm run specs:check`, repository QA and a real probe smoke after both slices land. Run `node probe.cjs --gpu hardware` in a fresh built tracking HUD scaffold; use `--gpu software` or `--dpr 2` only to match the delivery renderer. Inspect camera error summaries independently of LED/full-lens shift summaries. Runtime fixture assumptions remain unverified until those checks execute.
