## Why

A drift audit on 2026-10-30 compared every pinned upstream with its current head. Most bundles are current or
changed only in churn, but several now ship advice upstream has corrected or removed:

- `interface-discipline` (jakubkrehel/skills, pin `0c1f1e5`, +90 commits) still says text on an OKLCH L > 0.73
  background must be dark. Upstream retracted this in `eaf8d1b`: under WCAG 2 the neutral crossover is near L 0.56
  (at `oklch(65% 0 0)` black is 6.49:1, white 3.23:1). Following our copy puts white text on mid-grey that fails
  AA. Three vendored colour files were deleted upstream and replaced; `ui-craft-sources.md` and
  `package-resources.json` still cite them. The reduced-motion fallback now exempts progress and spinner feedback.
- `good-css` (pin `6d16d2f`, +12): the content grid with breakouts became the default page container, and the
  carousel script was fixed for RTL (negative `scrollLeft`).
- `cinetic` (pin `bee5d78`, +21): word budgets, default tempo, typing rate and hold rules changed (for example
  launch films 20-35 words → 15-25, 120 → 100 BPM, holds max(60, 42+8f/word)); springs on type and per-letter
  tricks are now banned. `references/film-methods.md` quotes the old numbers.
- `12-principles-of-animation` (raphaelsalaja/skill): upstream deleted the skill in `e1df385` and added a root MIT
  LICENSE in the same commit. Our pin is the only remaining copy.
- `companion-capabilities.json` checks impeccable for the marker "bounded-verification" ("Verify in bounded passes,
  not a loop"), which upstream no longer contains, so a current install reports as missing a capability it has.
  Its command map lists 23 commands; upstream has 24 (`generate`) with `craft` a deprecated alias.
- `THIRD_PARTY_NOTICES.md` names two different reviewed commits for shadcn-ui/ui (`a85299a9` and `993eb2c`).
- HyperFrames is pinned three ways: notices `0e4da52` (Aug), scripts and docs `0.8.137`, evals `0.8.164`. Golden
  renders therefore do not use the runtime users get.

## What Changes

- Refresh `interface-discipline` to jakubkrehel/skills `592aedc` (v1.17.0) for the vendored `better-*` and
  `interface-review` scope; update consumers of deleted paths; regenerate the manifest.
- Refresh `good-css` to `92d436b`; update `references/good-css.md` where it states the old container rule.
- Refresh `cinetic` to `ecfa660` (v1.1.0) and update every number `film-methods.md` quotes from it.
- Freeze `12-principles-of-animation`: manifest records `upstreamStatus: removed` at `e1df385`, copy the new LICENSE
  beside it as later evidence of the author's MIT intent, and keep the frontmatter declaration as the direct
  evidence for the pinned text.
- impeccable: replace the dead marker with one present in current upstream, add `generate`, `doctor` and `context`
  to the command map and contract, mark `craft` deprecated, and move `reviewedRevision` to `02523aec`.
- Fix the shadcn notice to the manifest's commit.
- HyperFrames: make the evals use the same version as `HYPERFRAMES_VERSION` (`0.8.137`) and correct the notice to
  that release's commit. Moving to a newer release is a separate change.

Unchanged after review: ibelick/ui-skills, emilkowalski/skills and shadcn vendored scope (additive only), gepa
(vendored scope identical), ff-tracking, the design direction library bundle, playwright-cli, ui-ux-pro-max, and nine bundles with no
upstream commits.

## Capabilities

- `design-pipeline`: ADDED `Vendored guidance follows upstream corrections`.

## Reuse

- Existing importers (`scripts/import-*.cjs`), manifests, `sources:check` and `capabilities:check`. No new tooling.
