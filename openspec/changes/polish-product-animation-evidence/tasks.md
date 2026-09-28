# Product-animation polish evidence tasks

All implementation work below is owned by the CERE-482 target implementer. The OpenSpec author owns this contract only; the main coordinator owns repository-wide validation and final integration. No task reopens `integrate-product-animation` or overlaps Task 4 in `fix-motion-web-provenance`.

- [x] **Controls evidence owner — Task 1.** In `experiments/openalice-product-animation/`, generate a distinct current-run review capture and receipt entry for desktop, mobile, reduced-motion, and native-controls surfaces. Record viewport/state/path/hash; prove that the bottom 210 authored pixels are reserved for native controls; and prove that both terminal human-review strings sit above that region and remain unobscured with controls visible. Preserve any historical `native-*.png` files; do not represent them as this run's evidence.
- [x] **Runtime-contract owner — Task 2 public surface.** Remove the production `window.__motionGraph` mount while preserving the lexical `const motionGraph` and existing `window.film` / `window.__timelines.openalice` public contracts. Do not introduce another public graph mount or a second motion runtime.
- [x] **Verifier owner — Task 2 graph seam.** Make `verify.cjs` obtain the lexical graph through a target-local, test-only hook in the same page execution context. Retain schema, composition, starts, beat IDs, track IDs, shared-anchor, and bounded spring assertions; add exact six-beat boundary and `response.spring-settle` endpoint/settle checks. Assert that `window.__motionGraph` is absent from the public window surface.
- [x] **Sample renderer owner — Task 3 derivative.** Change `run.cjs --sample` so it generates a deterministic, target-local 7.5-second derivative from the same `index.html` composition. Do not read, copy, overwrite, or use `output/sample-approved/` as source material; clean temporary retime artifacts in a `finally` path.
- [x] **Evidence verifier owner — Task 3 frame proof.** Replace approximate keyframe seeking with sequential, accurate MP4 decoding. Retain ordered decoded frame references covering SOURCE, RETAIN, REFERENCE, Inbox, inspect/review, and ending; record MP4 SHA256, real wall-clock samples, `playbackRate === 1`, native `ended`, and verifier result in the current target receipt.
- [x] **Documentation owner — Task 3 handoff.** Update target-local `README.md` and `MOTION.md` to describe current derivative/evidence lineage and the private-test/public-runtime boundary. State that Component Conformance does not equal pending Visual Acceptance.
- [x] **Target implementer — scoped proof.** Run the target-local commands required by the changed target contract, including `npm run verify`, and retain their current receipt. Do not run repository-wide validation in this slice; the main coordinator performs it after sibling work freezes.

## Immutable boundaries

- Do not modify or replace the `output/sample-approved/` archive.
- Do not modify the frozen `baseline/optimization-before-final/` baseline.
- Do not treat archive output, baseline comparison, technical receipts, or captures as user Visual Acceptance.
- Do not change provenance work, shared runtime/catalog code, or the historical/done `integrate-product-animation` change.

## Review evidence and completion gates

- Supported-command proof from the implementing owner: canonical lint + check exit 0 / 10.15s;
  canonical render exit 0 / 29.84s; final sample render exit 0 / 14.62s; final target verify
  exit 0 / 55.16s. The sample SHA256 is
  `55fb4b9b3519cc3eb4b9ab67543e914a618c31375d66402adc059c0829c024f2`.
- Final docs-bound `output/verification.json`: recordedAt `2026-09-19T05:10:24.350Z`, SHA256
  `ef528c8f466c5ff4973d89e96614ec4829ce69f8a006fbf0d1b3b11b3717748c`; Component Conformance
  is true, Visual Acceptance is pending.
- Guard proof: `npm run lint -- --sample` and `npm run check -- --sample` each exit 1 with
  an explicit render-only error before mutation. The render receipt and sample MP4 stayed
  byte-identical; no sample lint/check receipts/logs or temporary files were created. Silent
  canonical fallback was rejected; these commands are not derivative lint/check validation.
- Owned-temp proof: foreign legacy-path sentinel stayed byte-identical through canonical
  checks; forced sample-render failure exited 1 with null-hash lineage and owned-temp cleanup.
- Capture proof: seek completion and a presented canonical terminal frame (mediaTime
  19.966667) precede each four-surface capture. This is separate from real native-ended
  20s/7.5s playback evidence at rate 1. Eight ordered decoded frames were manually inspected
  for content; decode/order/hash evidence is not semantic-pixel certification.
- [ ] Coordinator: pass repository-wide QA. The recorded run exited 1 / 53.185s (`artifact://1503`):
  711 tests, 710 pass / 1 fail (`tests/animation-verification.test.cjs:222`,
  `ReferenceError: startFixtureServer is not defined`); 11 installed-CLI checks passed.
  QA status remained byte-identical. Prior audit finding: existing `mengto-skills.test.cjs`
  is absent from manifest coverage. Both issues remain outside this slice, unsuppressed.
- [x] Four corrected captures visually reviewed: coordinator confirmed complete lineage ending
  and both review strings above controls on desktop/mobile/reduced-motion/native-controls;
  implementing owner also inspected current PNGs. This is evidence review, not user acceptance.
- [ ] Human: explicitly decide Visual Acceptance. Technical conformance cannot satisfy this gate.
