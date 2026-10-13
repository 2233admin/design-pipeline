# Film timeline gate and cross-model evals

`codify-product-film-gates` checks what a storyboard claims and what a render shows, but not what
the composition code animates between them, and gives no way to compare models. This change adds:

1. `timeline-probe.js`, which serializes a GSAP timeline to `design-pipeline.film-timeline.v1`,
   and `verify film-timeline`, which checks it against the storyboard.
2. `film-eval measure`, which scores per-model film runs through the film gates into
   `design-pipeline.benchmark-measurements.v2`, plus a film benchmark manifest and repair fixture.
   The existing `benchmark brief|evaluate` gate produces the blind brief and the verdict.

No new runtime dependency. Scores are not creative acceptance.
