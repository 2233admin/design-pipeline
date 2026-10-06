# Tasks

- [x] Study seven Vocaloid MVs and record the grammar, densities and structure (`reference.md`).
- [x] Add `golden.generated` to the case contract; `verify.cjs --render` stops with an instruction when generated files are missing and copies them for render counter-examples.
- [x] Build the MAD case: generation script, lyrics, storyboard, composition, score, 17 rules and 7 counter-examples.
- [x] `audio master`: codec headroom, transient limiter before a linear gain, measured-output correction; add a unit test.
- [x] Tests: the MAD type is present, and generated art is declared and never tracked.
- [x] Run `node evals/cases/verify.cjs --render` and `node scripts/qa.cjs`; the four accepted goldens re-mastered with the new `audio master` still pass.
- [x] The user accepted the render on 2026-09-29; `approval` records the sha256 of the watched preview.
