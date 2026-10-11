## 1. Change record
- [x] 1.1 Record ownership, layout, optimization, license and naming decisions with cross-slice contracts.

## 2. Owned engine and runtime
- [x] 2.1 Move engine source, fonts, examples and license into `skill/tools/art-motion/`; apply former build patches in source; add `fonts/catalog.json`.
- [x] 2.2 Replace the build with `scripts/build-art-motion-runtime.cjs`; regenerate `runtime.js` and compare it with the former bundle.

## 3. Tools and CLI
- [x] 3.1 Point `render.cjs`, `study.html`, the scaffold and `visual-craft` at owned paths; report `runtimeSha256`; rename `voice.py`.
- [x] 3.2 Add `art-motion render` and `reference analyze-video --study` to `cli-core.cjs` with registered options; remove standalone command lines.

## 4. Guides and method notes
- [x] 4.1 Move method, style and grammar notes to `skill/references/art-motion/` and map removed-harness mentions to maintained entries.
- [x] 4.2 Update the Art Motion entry, tool guides, tools index, vendor index and linked references.

## 5. Tests, notices and history
- [x] 5.1 Rename and rewrite Art Motion tests for owned resources, CLI routing and documentation links; update scaffold and Visual Craft tests.
- [x] 5.2 Update `THIRD_PARTY_NOTICES.md`, `CONTRIBUTING.md`, CI/release workflows and historical OpenSpec wording.

## 6. Integration and verification
- [x] 6.1 Remove the former bundle and importer; update `package.json`, test manifest, package resources, `.gitattributes`, `CHANGELOG.md` (with a migration note) and the `scripts/qa.cjs` naming policy check.
- [x] 6.2 Run the zero-hit checks, the focused Art Motion/Visual Craft/CLI tests, `npm test` with an isolated `fonttools==4.66.1` and `npm run specs:check`.

## 7. Review fixes (PR #90)
- [x] 7.1 Paint `safe.fill` over the margins outside `ctx.box` after the grammar draws (not with `alpha: true`) in `drawClip`; regenerate `runtime.js`; add a pixel regression test; update `methods/09-clip-grammar.md`, the tool README and `CHANGELOG.md`.
- [x] 7.2 Make every `examples/<grammar>.json` render as shipped (`"fonts": "bundled"`), assert it in the tools and runtime tests, and render `--stills` for each through the CLI.
- [x] 7.3 List every `composition scaffold` template in the CLI help from the scaffold's own template list; assert it in the CLI help test.
- [x] 7.4 Rewrite guide passages that pointed at unshipped demo films, overview images, harness files and scripts so they describe only shipped material; keep the method content.
- [x] 7.5 Re-run `npm test` with the isolated `fonttools==4.66.1` and `npm run specs:check`; record the results in `verification.md`.
