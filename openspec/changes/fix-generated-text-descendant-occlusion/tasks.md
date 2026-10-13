# Tasks

## 1. Implementation and Regression

- [x] 1.1 Add a real-browser in-flow own-fill marker covered by its host's positioned painted child, plus unobscured, below-host and outside-host controls, to the existing generated-text regression before changing the engine.
- [x] 1.2 Enable the existing generated descendant-paint check for all resolved own-fill pseudo text, retaining conservative host geometry and ordinary-text behavior.
- [x] 1.3 Document the exact non-absolute occlusion behavior, conservative boundary and reusable CLI smoke in this change.

## 2. Integration Verification

- [x] 2.1 Run the existing generated-text regression against the fixed tree and record a failing-before/passing-after real-browser smoke without changing the original working tree.
- [x] 2.2 Run `node --test tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs` to retain absolute pseudo, ordinary-text and CLI gate behavior.
- [x] 2.3 Run a real-browser smoke with covered and uncovered in-flow markers: covered text is indeterminate with an error finding; the unobscured control remains measurable.
- [ ] 2.4 Integrate the changelog and active delta without editing consolidated or archived specifications; run `npm test` and `npm run specs:check` on the final fixed tree, and record actual revision-bound evidence.

Implementation checkboxes record edits only. Verification checkboxes record performed work; unchecked items remain pending. Neither grants visual or user acceptance.
