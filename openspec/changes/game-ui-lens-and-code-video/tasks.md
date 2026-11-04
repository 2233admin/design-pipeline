# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #265, relates to #260.
- [x] 1.2 `npm exec -- openspec validate game-ui-lens-and-code-video --strict`: valid. `npm run specs:check`: 67 passed, 0 failed.

## 2. Part A: game UI review lens

- [x] 2.1 Read the article (Tencent Game Institute 10027) and restate it as seven advisory lenses in `skill/references/game-ui-and-narrative.md`, each with look-for, good and bad signs, and existing checks with limits.
- [x] 2.2 Route from the guide intro and the `capability-routing.md` game UI row; register the guide in `skill/references/package-resources.json` `required`.

## 3. Part B: code-video audit

- [x] 3.1 Shallow-clone both libraries read-only; record commits and licences; execute none of their scripts.
- [x] 3.2 Land missing mechanisms: `hyperframes.md` (drawing from time, worker-split check), `workflow-film.md` (review strips, muted read, motion blur), `film-score.md` (effects on measured peaks), `product-film-direction.md` (named reference), `prompt-motion.md` (companion style library and licence decision), `film-methods.md` (audit record and #260 candidates).
- [x] 3.3 Measure each recipe on real renders before writing it (design.md, Measurements).

## 4. Tests and docs

- [x] 4.1 `tests/game-ui-lens-and-code-video.test.cjs` (guide content, package resource, and, when FFmpeg is present, the documented blur recipe on a synthetic cut); registered in `scripts/test-manifest.json`.
- [x] 4.2 CHANGELOG `[Unreleased]`; `THIRD_PARTY_NOTICES.md` concept sources.

## 5. Verification

- [x] 5.1 Focused tests: the new test and `hyperframes-routing`, `film-project`: 23 passed, 0 failed.
- [x] 5.2 `npm test`: repository tests 1788, 1779 passed, 8 skipped, 1 failed (the known, unrelated `ff-tracking-hud` sound test: the host FFmpeg 6.1.1 rejects an option, `sfx.cjs:220`); packaging, installed-package smoke and byte-identical status OK; browser-tool self-tests 13 passed. One sentence in `hyperframes.md` (video sources) was reworded after the run; the focused tests above were rerun on the final text.
