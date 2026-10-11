# Tasks

## 1. Storyboard admission

- [x] 1.1 Extend storyboard.v1 with optional `productSource` and `beats[].source`, reject malformed records as contract errors and add the admission finding codes with `fix` text to the existing storyboard gate.
- [x] 1.2 Return the admission result early from the storyboard, timeline and render checks when admission is required and not granted; keep non-product results unchanged.

## 2. Workflow

- [x] 2.1 Bind the Stage 0 job plan in film workflow state (`next --job-plan`, discovered `job-plan.json`) and report a stale plan with the existing re-plan fix.
- [x] 2.2 Add the product-promo `source` and `sample` stages, the explicit `blocked` action (CLI exit 2) and the `decide --stage sample` verdict; add captures, run log and bound job plan to plan/check gate inputs.

## 3. Evaluation and routing

- [x] 3.1 Pass the bound form and project root through `film check`, `verify film-storyboard`, `verify film-timeline` and `verify film-render`; leave non-admitted product-promo runs unmeasured in `film-eval measure` and report them under `admission`.
- [x] 3.2 Widen the Stage 0 classifier for English and Chinese product-promo film phrasings while promo pages, banners, codes and plans keep their forms.

## 4. Guidance

- [x] 4.1 Document the source and sample stages, the record, blocker kinds and honest limits in `workflow-film.md`, `product-film-direction.md`, `stages.md`, `pipeline-reference.md`, `SKILL.md`, `skill/evals/film/README.md` and `CHANGELOG.md`.

## 5. Verification

- [x] 5.1 Run the focused checks: `node --test tests/product-source-admission.test.cjs tests/product-source-workflow.test.cjs tests/film-gates.test.cjs tests/film-project.test.cjs tests/film-timeline-eval.test.cjs tests/workflow-next.test.cjs tests/job-route.test.cjs tests/hyperframes-routing.test.cjs tests/benchmark.test.cjs tests/skill-cli-handoff.test.cjs`.
- [x] 5.2 Run `npm exec -- openspec validate require-product-source-admission --strict` and `npm run specs:check`.
- [x] 5.3 Run repository QA with `npm test`.
- [x] 5.4 Confirm historical films, frozen scores and the archived Tern pair were not modified, and record that admission grants no Visual Acceptance.

## Evidence

- Fail on origin/main (99f84bf) with the new tests copied in: product-source-admission 8 of 9 fail (the
  ninth asserts unchanged non-product output); product-source-workflow 11 of 12 fail; the new
  classifier cases in job-route (2) and hyperframes-routing (1) fail; the updated film-eval case fails.
  On main the card-only Tern storyboard returns `passed` and its film-eval run scores 0.70 (storyboard
  and timeline passed); on this change it fails with `product-source-missing` and stays unmeasured.
- This change: the same files pass; `npm test` (FONTTOOLS_PYTHON set) exits 0 with 1181 repository
  tests across 124 files, 1178 passed, 0 failed, 3 skipped (optional GEPA runtime), installed-package
  CLI smoke 12/12 and byte-identical repository status; `npm run specs:check` 68 passed, 0 failed.
- Historical evidence: no file under the ignored `.design-pipeline/archive/cere-482/` or any frozen
  score was read for writing or modified; the Tern pair keeps Visual Acceptance = rejected-both.
  Gate and admission results report `creativeAcceptance: not-assessed`; owner review stays separate.
