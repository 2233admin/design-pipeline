## 1. Contract and regression

- [x] 1.1 Inspect the existing structural detector, probe acceptance fields, maintained guide and archived camera-stage decision; record a new followup without editing the archive.
- [x] 1.2 Add regressions before implementation for both strict correlation boundaries, both signs, flat-frame handling and preceding-step calmness at the existing exported seam.
- [x] 1.3 Add a consumer-visible lossless grayscale inversion regression through real `structureSteps` and `evaluateFilmRender`, requiring absent scene/pixel cuts and a missed planned cut.
- [x] 1.4 Replace the one-sided inclusive structural threshold with both strict bounds; preserve result schema and all other detector checks.
- [x] 1.5 Provide the complete modified requirements with camera-stage 1 px marker / 3 px glyph budgets and separately reported LED/full-lens shifts; retain full-lens determinism.

## 2. Parent integration and verification

- [x] 2.1 Integrate the changelog and keep the replacement requirements in this active followup delta; leave consolidated and archived specifications unchanged until the archive workflow.
- [x] 2.2 Run `node --test tests/film-continuity.test.cjs tests/ff-tracking-hud.test.cjs` with FFmpeg available; confirm the inversion fixture exercises negative correlation and the default dark-cut regression still passes.
- [x] 2.3 Build a fresh tracking HUD scaffold and run `node probe.cjs --gpu hardware` in its project directory (matching render GPU/DPR); inspect enforced camera errors separately from reported artistic shifts and repeated-render determinism.
- [ ] 2.4 Run `npm exec -- openspec validate fix-film-alignment-and-correlation-contracts --strict`, `npm run specs:check` and `npm test` after both isolated review fixes land; record only performed evidence.
