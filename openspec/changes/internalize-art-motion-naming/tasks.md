## 1. Change record
- [ ] 1.1 Record ownership, layout, optimization, license and naming decisions with cross-slice contracts.

## 2. Owned engine and runtime
- [ ] 2.1 Move engine source, fonts, examples and license into `skill/tools/art-motion/`; apply former build patches in source; add `fonts/catalog.json`.
- [ ] 2.2 Replace the build with `scripts/build-art-motion-runtime.cjs`; regenerate `runtime.js` and compare it with the former bundle.

## 3. Tools and CLI
- [ ] 3.1 Point `render.cjs`, `study.html`, the scaffold and `visual-craft` at owned paths; report `runtimeSha256`; rename `voice.py`.
- [ ] 3.2 Add `art-motion render` and `reference analyze-video --study` to `cli-core.cjs` with registered options; remove standalone command lines.

## 4. Guides and method notes
- [ ] 4.1 Move method, style and grammar notes to `skill/references/art-motion/` and map removed-harness mentions to maintained entries.
- [ ] 4.2 Update the Art Motion entry, tool guides, tools index, vendor index and linked references.

## 5. Tests, notices and history
- [ ] 5.1 Rename and rewrite Art Motion tests for owned resources, CLI routing and documentation links; update scaffold and Visual Craft tests.
- [ ] 5.2 Update `THIRD_PARTY_NOTICES.md`, `CONTRIBUTING.md`, CI/release workflows and historical OpenSpec wording.

## 6. Integration and verification
- [ ] 6.1 Remove the former bundle and importer; update `package.json`, test manifest, package resources, `.gitattributes`, `CHANGELOG.md` (with a migration note) and the `scripts/qa.cjs` naming policy check.
- [ ] 6.2 Run the zero-hit checks, the focused Art Motion/Visual Craft/CLI tests, `npm test` with an isolated `fonttools==4.66.1` and `npm run specs:check`.
