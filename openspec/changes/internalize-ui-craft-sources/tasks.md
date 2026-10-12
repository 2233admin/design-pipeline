# Tasks

## 1. Source Snapshots

- [x] 1.1 Extend `inspectCheckout` with an optional pre-read path filter; existing importers stay unchanged.
- [x] 1.2 Add `scripts/import-ui-craft-sources.cjs` with the six reviewed sources and import each from a clean reviewed checkout.
- [x] 1.3 Register every vendored file and both guides in `skill/references/package-resources.json`; add `THIRD_PARTY_NOTICES.md` sections and `skill/vendor/README.md` rows.
- [x] 1.4 Add `tests/ui-craft-sources.test.cjs` for integrity, import rejection, tamper detection, packaged blobs and guide links; register it in `scripts/test-manifest.json` and `sources:check`.

## 2. Routing

- [x] 2.1 Write `skill/references/ui-craft-sources.md` with stage routing, precedence and execution boundaries.
- [x] 2.2 Write the reference-only `skill/references/react-doctor.md` and pin it in `tests/source-governance.test.cjs`.
- [x] 2.3 Route from `skill/SKILL.md`, `workflow-web.md` (`build`, `review`), `stages.md`, `pipeline-reference.md`, `feature-routes.md`, `capability-routing.md` and `companion-skills.md`; scope the Emil reference's no-copy boundary; remove `emil-design-eng` from the Visual taste companion group and name the bundled source in its fallback.
- [x] 2.4 Record the change in `CHANGELOG.md`.

## 3. Verification

- [x] 3.1 `npm run sources:check`.
- [x] 3.2 `npm run specs:check`.
- [x] 3.3 `npm test`.
- [x] 3.4 Smoke: `designer-pipeline next` on a temporary web project at `build` returns `references/workflow-web.md#build`, and that section routes to `ui-craft-sources.md`.
