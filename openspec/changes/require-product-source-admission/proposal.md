# Change: Require product source admission for product-promo films

## Why

CERE-515. A product promotional film (Stage 0 `deliverableForm: product-launch-video`) could pass
every film gate and score well while built entirely from self-made text and cards. The "Tern" pair
promoted a fictional product; an independent agent's blind 5-axis rubric scored them A 17 and B 18,
and the owner rejected both on 2026-09-19 (Visual Acceptance = rejected-both, Multica comment
`01a0b93a-d30d-73db-8ace-a9e4171ffe2f`): no real project was forked, run or captured. Nothing in the
storyboard, workflow or evaluation path asked for the product itself, so scores measured the
absence of known failure shapes on material that was never the product.

A short real-material study of OpenAlice (`TraderAlice/OpenAlice` at
`3fe612277df7e149fbb48c3bbe5fd30770052857`, 7.5 s, captured from its demo mode) showed the right
material direction. It is a diagnostic, not final acceptance.

## What Changes

- Real product sourcing becomes a hard admission precondition for evaluating a product-promo film,
  not a scoring axis. A film that is not admitted is not evaluated further: no structure, rhythm,
  timeline, render or benchmark result can offset a missing product source.
- `storyboard.json` (`design-pipeline.film-storyboard.v1`) gains optional `productSource` (pinned
  repository and commit, run log, hashed UI-state and operation captures, action → response → result
  flow) and optional `beats[].source` (capture ids the beat is built from). An unrunnable or
  uncapturable product is recorded as `status: "blocked"` with one of six blocker kinds.
- Film `next` binds the Stage 0 job plan and, for product promos, adds a `source` stage before plan
  and, at standard/full, a short real-material `sample` stage before build. A blocked source returns
  an explicit `blocked` action (CLI exit 2) and never advances.
- `film check` (all its gates), `verify film-storyboard`, `verify film-render` and
  `film-eval measure` stop before evaluation when admission is required and not granted.
  `film-eval` leaves such runs unmeasured, so the existing benchmark reports `blocked`.
- The Stage 0 classifier recognizes more English and Chinese product-promo film phrasings without
  turning promo pages, banners, codes or plans into video.

## Reused contracts

No new gate, receipt schema, target resolver or policy digest.

- storyboard.v1 and its existing storyboard gate carry `productSource`/`beats[].source` and the new
  finding codes (with `fix` text from the existing film hints).
- Stage 0 `job-plan.v1` binding fields (`jobId`, `jobPlanSha256`, `jobPlanPath`,
  `deliverableForm`) and the existing `validateJobPlan`/`bindJobPlan` checks are stored in film
  workflow state (`next --job-plan`); a stale plan reports the existing re-plan fix.
- Existing workflow gate input hashes: the run log, captures and bound job plan become checked
  inputs, so changed material reopens the checks that relied on it.
- Existing `film check`, `verify film-*` and `film-eval measure` results; `benchmark-core` is
  untouched (unmeasured required scenarios already block a benchmark).
- Existing Stage 0 classifier and its deliverable-form conflict: a persisted plan whose form changes
  under the widened classifier fails validation and must be re-planned; it is never rewritten.

## Scope and non-goals

- Affected capability: `product-film`.
- Owner Visual Acceptance stays separate from gates and admission; admission never grants it.
- Gates bind records and file hashes; they cannot prove that captured pixels came from the product.
- Non-software (physical) products have no repository and are blocked under this contract; a
  physical-product source record is a follow-up.
- Historical films and frozen scores (including the Tern pair, archived under ignored
  `.design-pipeline/archive/cere-482/`) remain unmodified diagnostics. Fictional-product eval
  scenarios (`canvas-launch`, `cli-launch`) become inadmissible by design and are reported
  unmeasured; `repair-slideshow` remains measured.
