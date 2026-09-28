# Golden case library

One finished film per deliverable type, made by the strongest model (Opus 5.5), reviewed by
the user, and broken down into the rules behind each choice. Each case also carries
counter-examples: the golden with one named defect applied, which the gates must catch. The
library serves three purposes:

- **Answer key for evaluation.** Step 7 compares other models' films on the same briefs against
  these goldens. The directory therefore stays outside `skill/` and out of the package, so a
  model under evaluation cannot read the answers.
- **Gate calibration.** A golden must pass every error gate, and each counter-example must fail
  with the codes it names. Building the first two cases found a real cut that the render gate
  missed and a dissolve that the timeline gate accepted as continuity; both gates were fixed.
- **Rules for weaker models.** Every choice is written down as a rule with its fix. A rule that
  a gate enforces must have a counter-example proving it. A rule that only review can judge
  names the gap, which makes it a candidate for a future gate.

## Layout

```
evals/cases/
  package.json                  pinned render toolchain (HyperFrames 0.8.84)
  cases.cjs                     load, validate, patch and check cases
  verify.cjs                    command-line verification
  <deliverable-type>/<case-id>/
    case.json                   design-pipeline.golden-case.v1: brief, status, rules, counter-examples
    storyboard.json             the golden storyboard
    index.html                  the golden composition
    timeline.json               the timeline captured from index.html by `film check`
    score.strudel.js            the score pattern; score-grid.json is its exact event grid
    reference.md concepts.md sound.md qa.md   the workflow's records for this film
```

Deliverable types: `product-pv`, `logo-sting`, `mad`, `ui-promo`, `explainer`. Renders, audio and
evidence are regenerated and git-ignored.

## Counter-examples

A counter-example names its `failureClass` (from the evaluation's failure classes: `workflow`,
`tool-misuse`, `generic-concept`, `rough-execution`, `taste-gap`), the `rule` it breaks, and
the finding codes it must produce (`expect`).

- `storyboard` and `timeline` counter-examples are patches on the golden JSON: RFC 6902
  `replace`, `add` and `remove`, plus `remove-where` and `update-where`, which select array items
  by field values (for example, a tween by its targets and start time). A `-where` operation
  that matches nothing fails, so a stale counter-example cannot pass silently.
- `render` counter-examples are text edits on the composition (`find` / `replace`). They are
  rendered and checked with `film check` by `verify.cjs --render`.

## Verify

```bash
node evals/cases/verify.cjs
```

```bash
npm --prefix evals/cases install
```

```bash
node evals/cases/verify.cjs --render
```

The first command checks the storyboard, score and timeline gates on every golden and
counter-example. Repository QA runs it through `tests/golden-cases.test.cjs`. The third command
also scores, renders and checks each golden, requires a recorded disposition for every warning
(`reviewedWarnings`), and renders every render counter-example; it needs the toolchain from the
second command, headless Chrome and ffmpeg.

## Approval

A new case starts as `candidate` with `approval: null`. The user watches the render and accepts or
rejects it. The decision is recorded as `status` plus `approval`: verdict, who, date, one note,
and the sha256 of the exact file that was watched. Renders are not byte-identical from run to
run, so the hash identifies the reviewed file, not every future render. A rejection's note
becomes a rule with a fix before the case is remade.
