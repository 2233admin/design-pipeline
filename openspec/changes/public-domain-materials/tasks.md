# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate public-domain-materials --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 Measure reachability of every listed source from this environment; write `references/material-sources.json` with dates and evidence.
- [x] 2.2 `material-core.cjs`: records reader shared with film-edit, add, cut, check; adapters for Cleveland, Met, Rijksmuseum and Commons by file name; probe classification.
- [x] 2.3 `fetch-materials.cjs` kernel; CLI `materials sources|probe|search|fetch|add|cut|check`, flags registered, help.
- [x] 2.4 `assets.cjs` `cutCollage`: border / paper / white-matte / none mattes, cut / sticker / ink / plate finishes, dirty-matte findings.
- [x] 2.5 Guides: `tools/design-sources.md` material sources, `tools/art-motion/assets-audio.md` collage cutting, tool index rows; `package-resources.json`.

## 3. Verification

- [x] 3.1 `tests/materials.test.cjs` (synthetic flat, gradient and print sources; recorded response shapes; refusals; lineage) in `scripts/test-manifest.json`.
- [x] 3.2 Existing focused checks: `tests/art-motion-assets-audio.test.cjs`, `tests/film-edit.test.cjs`, `tests/returned-edit-commands.test.cjs`.
- [x] 3.3 Live acceptance run on the style query `key,pocket watch,butterfly,engraving` (design.md).
- [x] 3.4 Repository QA: `npm test` (1792 pass; the one failure is the known unrelated ff-tracking-hud "the sound is synthesized by ffmpeg" test) and `npm run test:browser`.
- [x] 3.5 CHANGELOG entry.
