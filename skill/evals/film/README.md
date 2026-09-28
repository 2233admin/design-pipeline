# Cross-model film benchmark

`film-benchmark.json` is a `design-pipeline.benchmark-manifest.v2` that measures how well each
model produces a promotional film with this skill. Scoring reuses the film gates; the verdict
reuses `benchmark evaluate` (fairness, channels, required scenarios). There is no separate
scoring system.

## Run

1. Edit `systems`, `systemChannels` and `candidateSystem` for the models under test. The
   `fairness` flags are operator assertions: set any that you cannot guarantee to `false`, and
   the benchmark will report `blocked` instead of a comparison.
2. Produce the blind brief, which omits `privateExpectations`:
   `designer-pipeline benchmark brief --manifest skill/evals/film/film-benchmark.json`
3. Give each model the same brief, the same packaged skill, a fresh context and the same machine
   class. Collect each scenario's deliverables into `runs/<system>/<scenario-id>/`:
   `storyboard.json`, `timeline.json` (from `references/film-choreography/timeline-probe.js`)
   and `out.mp4`.
4. Measure, then evaluate:
   `designer-pipeline film-eval measure --manifest film-benchmark.json --runs runs --output measurements.json`
   `designer-pipeline benchmark evaluate --manifest film-benchmark.json --measurements measurements.json`

## Score

Per scenario: 0.35 storyboard gate + 0.35 timeline gate + 0.30 render evidence. Each component
is 1 when its gate passes and loses 0.15 per finding (floor 0). A missing file scores 0 for
that component; a missing scenario directory is unmeasured and blocks the benchmark. Render
evidence writes `evidence/contact-sheet.png` beside the run for human or multimodal review.

Scores measure absence of known failure shapes. They are not creative acceptance; compare the
contact sheets and watch the films before concluding one model directs better than another.
