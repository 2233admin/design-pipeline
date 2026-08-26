# Design: Subject-First Design Craft

## Ownership

- `skill/SKILL.md` owns the runtime route: form sanity before Stage 2 direction selection, plus the
  subject/audience/viewing-context and technique-cause guidance attached to each direction.
- `skill/references/anti-slop-review.md` owns the two-sided craft review: formula veto,
  over-restraint veto, cause/effect test, and reference-level comparison.
- `skill/references/plain-language.md` owns source-shaped copy rules for interface and decision
  artifacts.
- `skill/references/feedback-loop.md` owns the concrete Issue/PR writing order and evidence fidelity
  pass.
- `tests/victor-design-guidance.test.cjs` checks that these public contracts remain routed together.

## Compatibility

This is guidance and contract coverage only. It does not add a new schema, evaluator, design
dependency, asset route, Figma integration, or automatic approval state. Existing direction-preview,
anti-slop, plain-language, evidence, and QA gates remain authoritative where they already cover a
case.

The form sanity backstop is deliberately a routing instruction rather than a second executable
gate; `references/execution.md` remains the detailed form challenge for substantial work.

## Test seam

The seam is the packaged skill contract: the main skill and its routed references must contain the
subject-first, two-sided craft, source-shaped copy, and evidence-first feedback rules. The test does
not score prose or infer design taste.
