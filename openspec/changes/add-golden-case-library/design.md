# Design

## Where the cases live

The package (`skill/`) is what models under evaluation receive. A golden inside it would let a
model copy the answer, so the library lives in `evals/cases/` and a test asserts it stays outside
the package root. What ships is what the goldens teach: gate changes, and later templates and
hints.

## Case contract (`design-pipeline.golden-case.v1`)

- `brief`: the prompt a model under evaluation receives.
- `status` / `approval`: `candidate` with `approval: null` until the user watches the render;
  then `approved` or `rejected` with verdict, who, date, note and the render's sha256. Renders
  are not byte-identical between runs (measured: every re-render of both cases had a new hash),
  so the hash names the reviewed file only.
- `golden`: storyboard, captured timeline, composition and score recipe (pattern, BPM, fade).
  Renders and audio are regenerated and git-ignored; `score-grid.json` is committed because the
  score gate needs it.
- `rules`: `{ id, choice, rule, fix, enforcedBy }`. `enforcedBy` is either
  `{ kind: gate, gate, codes }` or `{ kind: review, gap }`. A gate rule must be exercised by at
  least one counter-example; a review rule names why no gate can check it yet.
- `counterExamples`: `{ id, failureClass, rule, target, defect, patch | edits, expect }`.
  Storyboard and timeline counter-examples are JSON patches on the golden (RFC 6902 ops plus
  `remove-where` / `update-where`, which select tweens by value and fail when nothing matches).
  Render counter-examples are find/replace edits on the composition, rendered by
  `verify.cjs --render`.
- `reviewedWarnings`: every warning the golden's render produces, with its disposition.
  `verify.cjs --render` fails on an unexplained warning.

## Gate changes

Planned cuts: `evaluateFilmRender` computes the motion profile before checking planned cuts and
accepts a cut found by `instantReplacement` (at least 2% of the frame in one 10 fps step, 4x its
window and neighbours). A dissolve spreads its change over many steps and is still missing
(test: continuous motion keeps `planned-cuts-missing`). Found cuts are reported as
`cuts.pixelCutsSec` and join the audio alignment.

Carried handoffs: `checkTimeline` ignores tweens whose props are only `opacity`/`autoAlpha` when it
looks for a subject that spans or continues across a carried boundary. Before the change the
product film's `crossfade-carry` counter-example passed with no finding; after it,
`handoff-not-carried@carry`.

A remaining gap: any moving element that spans a boundary counts as its carrier, even an
unrelated one (a gate glow decaying across the sting's landing would carry it). Checking the
storyboard's named carrier against the timeline needs a carrier target in the storyboard and is
left to a later change.
