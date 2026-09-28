# Add the golden case library

## Why

Step 6 of `redesign-user-workflow` (Q32): each deliverable type needs golden cases made by
Opus 5.5 and approved by the user, with the reasoning behind each choice broken down into rules
and fixes. Step 7 compares models against these goldens, and weaker models inherit the rules
through gates. Until now the only film eval fixture was one slideshow storyboard.

The user chose the first two types on 2026-09-29: a 20-second software product film (product PV)
and a 4-second logo sting, both for design-pipeline itself.

## What changes

- `evals/cases/`: the case library, outside `skill/` so the answer key never ships to a model
  under evaluation. Contract `design-pipeline.golden-case.v1` (`case.json`): brief, status
  (`candidate` until the user decides; an approval records the sha256 of the watched render),
  rules (choice, rule, fix, and either the gate codes that enforce it or the gap that leaves it to
  review), counter-examples (the golden with one named defect, its failure class from Q33, and
  the finding codes it must produce) and reviewed warnings.
- Two candidate cases: `product-pv/design-pipeline-promo-20s` (11 rules, 7 counter-examples) and
  `logo-sting/design-pipeline-sting-4s` (9 rules, 6 counter-examples).
- `evals/cases/verify.cjs` checks goldens and counter-examples statically; `--render` also
  scores, renders and runs `film check` on each golden and render counter-example.
  `tests/golden-cases.test.cjs` runs the static part in repository QA.
- Gate fixes the cases found (rules distilled from golden cases):
  - Render gate: a planned cut also counts when the one-step pixel detector (already used by
    `carry-cut`) finds it. The product film's cut changed 34% of the frame in one step but scored
    0.155 on the scene detector, so `planned-cuts-missing` was a false failure.
  - Timeline gate: opacity-only tweens no longer count as carrying a planned handoff. A fade-out
    overlapping a fade-in (a dissolve) used to pass as continuity.
  - `film score` removes its download folder when a render fails, not only when it succeeds.

Not in scope: MAD, UI promo and explainer cases (later rounds of step 6); benchmark scenarios
generated from cases (step 7); review-only rules become gates in their own changes.
