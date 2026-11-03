# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #236.
- [x] 1.2 `npm exec -- openspec validate reference-palette-extract --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `block-page-core.cjs`: detection, in-page signals, saved-HTML signals, `REFERENCE_BLOCKED` refusal.
- [x] 2.2 `reference-extract-core.cjs` and kernel `extract-reference.cjs`: overlay dismissal, settle, fonts, computed-style walk, CIEDE2000 clustering, tiers, roles, type and spacing, outputs.
- [x] 2.3 `cli-core.cjs`: `reference extract`, `--target-id` registered, help, `runKernel` keeps `REFERENCE_BLOCKED` and `REFERENCE_UNREACHABLE`.
- [x] 2.4 `capture-web-evidence.cjs` and `page-refs-core.cjs` (with `capture-refs.cjs`) refuse block pages.
- [x] 2.5 `workflows/replicate.cjs` EXTRACT instruction and `measure` command; `references/website-cloning.md` Stage B.

## 3. Tests and docs

- [x] 3.1 `tests/reference-extract.test.cjs` with local fixtures served from localhost: tiers, clustering, type and spacing, low confidence, overlay dismissal, block refusal, challenge wait, evidence capture and evidence refs refusal, palette checker conformance; registered in `scripts/test-manifest.json`.
- [x] 3.2 `package-resources.json`, `THIRD_PARTY_NOTICES.md`, CHANGELOG.

## 4. Review fixes (PR #251)

- [x] 4.1 Block detection: vendor elements from attributes, phrases only in the title or a short body with a challenge footprint or widget; tests for the four false-positive pages.
- [x] 4.2 HTTP 4xx/5xx refused with `REFERENCE_HTTP_STATUS`; `httpStatus` in the result.
- [x] 4.3 Wait for rendered, stable content; `REFERENCE_EMPTY`.
- [x] 4.4 Overlays dismissed by geometry; root painters weighted by uncovered area.
- [x] 4.5 Near surface merges recorded and listed as low confidence; documented limitation.
- [x] 4.6 `replicate-measured-extraction` edited to extend this action.

## 5. Verification

- [x] 5.1 Focused tests: `reference-extract`, `page-refs`, `designer-pipeline-cli`, `agent-browser-adapter`, replicate workflow tests.
- [x] 5.2 `npm test`.
