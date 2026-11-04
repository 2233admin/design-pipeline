# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate measure-scroll-scenes --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `skill/scripts/interaction-scroll.cjs`: probe contract, point plan, in-page state and rest measurement, pixel share and canvas fingerprints, pure evaluator, `scrollResultFailure`.
- [x] 2.2 `interaction-capture-core.cjs`: the motion and reduced passes per viewport and the contact sheets; `capture-interaction.cjs` accepts `--frames-dir`.
- [x] 2.3 `interaction-core.cjs`: validate and evaluate `kind: "scroll"`, reject other kinds with the allowed list, merge the two fixes into `HINTS`; `workflow-core.cjs` re-reads scroll rows.
- [x] 2.4 `cli-core.cjs`: contact sheets under `<output>/scroll/` and the kernel timeout from the planned waiting.
- [x] 2.5 Register `scripts/interaction-scroll.cjs` in `references/package-resources.json`.

## 3. Tests and docs

- [x] 3.1 `tests/interaction-scroll.test.cjs` (contract, point plan, pixels, evaluator, native re-read, and headless Chromium fixtures: scrubbed sticky scene, thrown script, endless easing, reduce-only loop, canvas on a scaled phone page); registered in `scripts/test-manifest.json`.
- [x] 3.2 `references/stages.md`, `references/workflow-web.md`, `references/web-motion.md` and the W5 row of `references/web-direction.md`: the scroll probe, its findings, contact sheets and the GSAP pin target.
- [x] 3.3 CHANGELOG entry.

## 4. Verification

- [x] 4.1 Focused: `node --test tests/interaction-scroll.test.cjs`, `tests/interaction-evaluate.test.cjs`, `tests/interaction-capture.test.cjs`, `tests/interaction-cli.test.cjs`.
- [x] 4.2 Real pages: GSAP 3.15 ScrollTrigger (`scrub: true`, `scrub: 1`, `scrub: 4`, plugin missing), CSS named view timeline, `view()` on a pinned subject, canvas scenes, `verify interaction` end to end.
- [x] 4.3 `npm test`: 1793 of 1802 repository tests pass (8 skipped by their own conditions); the one failure is the known, unrelated `ff-tracking-hud` ffmpeg synthesis test. `npm run test:browser` passes.
