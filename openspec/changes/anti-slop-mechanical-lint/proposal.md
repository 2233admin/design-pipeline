## Why

The anti-slop review is an evidence file the agent fills in: each of 13 rubric rules gets `pass`, `fail`,
`not-applicable`, `not-verified` or `accepted-context`, and `evaluate-anti-slop.cjs` checks the file's shape. No
script looks at the page. An agent can mark `controls-are-real-and-operable` or `reduced-motion-path` as `pass`
while the CSS has `transition: all`, a focus ring removed with nothing in its place, a form that prints "Thanks"
with no request, or a keyframe with no reduced-motion fallback.

Nutlope/hallmark (MIT, reviewed at `4f6a46c`) ships `sloplint.mjs`, a dependency-free static and render linter
for about 90 numbered tells, each with a tier (Floor, Reflex, Finish), a class (static, render, judged) and a
fix. Many of its Floor gates are mechanical correctness checks our hard rules already name. Others are Hallmark's
house taste, which our review must not turn into universal law (anti-slop-review.md, Boundary).

## What Changes

- Vendor `sloplint.mjs` (and the render helper it imports) unmodified under `skill/vendor/hallmark-sloplint/`
  with its LICENSE, pinned to the reviewed commit.
- `evaluate-anti-slop.cjs --lint <page-or-dir> [--url <http-url>]` runs it (`--json`, `--render` when a browser is
  available) and maps each finding through `references/anti-slop-lint-map.json`: gate → our rubric rule and
  outcome class.
  - Correctness and access gates (for example 10a `transition: all`, 26a focus-visible, 27 reduced-motion
    fallback, 34 horizontal scroll, 70 fake send, 76 broken image, 40 contrast) map to our hard rules.
  - Template tells (for example 19 copy clichés, 47a fake browser chrome, 46a invented metrics, 54 eyebrow)
    map to contextual rules: a FAIL becomes a contextual finding that can be `accepted-context` with a reason.
  - Hallmark-only bookkeeping and house rules (20 stamp, 32 ledger, theme and genre rules) map to `excluded`.
- The rubric gains one hard rule, `no-fabricated-proof` (invented metrics, testimonials, logo walls and
  case-study counts), because nothing in the current 13 rules forbids them as a hard defect.
- The evidence file gains `lint: {tool, commit, target digest, findings}`. A hard rule marked `pass` while a
  mapped hard finding exists is rejected with `LINT_CONTRADICTS_PASS`, naming the gate, file and line.
- Reports keep Component Conformance and Visual Acceptance separate; lint findings never grant acceptance.

## Capabilities

- `design-pipeline`: ADDED `Anti-slop review is backed by a mechanical lint`, `Fabricated proof is a hard defect`.

## Reuse

- `evaluate-anti-slop.cjs`, the rubric, the evidence schema and its outcomes. No new gate or receipt.

## Impact

- Evidence files gain an optional `lint` block; required when `--lint` is passed. Older evidence stays valid.
