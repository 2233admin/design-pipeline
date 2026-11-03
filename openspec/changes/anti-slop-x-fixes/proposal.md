# Anti-slop fixes from the X design-skill distillation

## Why

Closes #238. An audit of the agent design skills circulating on X (anthropics/skills
`frontend-design` at ca45fc4, Nutlope/hallmark, nexu-io/open-design, Leonxlnx/taste-skill v2.1.5)
found four small gaps:

- `craft-density-and-review-loop.md` menu item 6 recommends section numbers, margin notes, hairlines
  and tracked small-caps labels as craft. Current `frontend-design` (cluster 5) and taste's tells
  list name exactly these as template chrome that AI output repeats regardless of subject.
- `fashion-tell-advisory` names no current defaults, so a reviewer has nothing to calibrate against.
- `design-system-package.md` says previews use tokens, "never raw values", but nothing checks it.
- An anti-slop waiver accepts any non-empty rationale; one generic sentence can waive every
  contextual rule.

## What Changes

- Craft-density item 6 becomes "structure that encodes the content".
- `fashion-tell-advisory` lists the five current clusters (paraphrased, preference severity only);
  the rubric records `anthropic-frontend-design` as a hashed, `accepted-optional` source.
- `design-system check` reports a `var(--x)` that is neither a token nor a custom property declared
  in `bundle.css` or the same preview, and raw colour values (including SVG paint attributes) and
  font stacks in declaration values, and returns `tokenUse` (declared, referenced, unused).
- The anti-slop evaluator rejects an `accepted-context` / `not-applicable` rationale that weighs
  under 24 (whitespace and punctuation excluded, CJK counted double), and the same waiver rationale
  copied onto several rules. `anti-slop-review.md` and the evidence schema state the rule.

## Capabilities

- `design-pipeline`: ADDED seven requirements.

## Boundaries

No new gate, receipt schema, command or flag. Advisory clusters never block.
