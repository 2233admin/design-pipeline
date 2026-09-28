# Tasks

- [x] Add `golden.captures` to the case contract; `verify.cjs --render` runs the capture script when captures are missing.
- [x] Add `evals/cases/capture-core.cjs`: virtual-clock frames at 2x, rAF on the virtual clock, stop-motion input and 0.5 s keyframes.
- [x] Build the UI promo case (OpenAlice at dc193d9f, demo mode): capture script, storyboard, composition, score, 11 rules and 5 counter-examples.
- [x] Build the explainer case: storyboard, composition, score, 9 rules and 5 counter-examples.
- [x] Render gate: count a step between two still neighbours as an instant replacement; add a unit test.
- [x] Tests: the new deliverable types are present, and captures are declared and never tracked.
- [x] Run `node evals/cases/verify.cjs --render` and `node scripts/qa.cjs`.
- [ ] The user watches both renders and accepts or rejects each.
