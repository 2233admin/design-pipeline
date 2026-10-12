# Tasks

## 1. Source

- [x] 1.1 Fetch npm `ascii.rest@0.4.0`, rebuild upstream `1848fa5` with its lock-pinned TypeScript 7.0.2 and confirm the tarball's `dist/`, `LICENSE` and `package.json` are byte-identical; confirm the fork 2233admin/ascii is at the same revision.
- [x] 1.2 Vendor `LICENSE`, `package.json`, `dist/types.d.ts`, `dist/mount.js` and the eleven curated piece modules under `skill/vendor/ascii-rest/upstream/`, with `manifest.json` (version, tarball integrity, repository, revision, fork alias, per-file sha256, snapshot hash, piece behaviour), a `.gitignore` exception for its `dist/` layout and `-text` in `.gitattributes`.
- [x] 1.3 Measure each curated piece's call-history behaviour (doom fire's simulation, the scenes' colour cache) and the cost of replaying it.

## 2. Template

- [x] 2.1 Add `skill/tools/ascii-art/ascii-art.js`: preset and piece validation, the sample-grid replay, the `<pre>` and canvas renderers, the capture hooks and the reduced-motion live preview.
- [x] 2.2 Add `presets.js` (twelve presets) and `study.html` with throwing capture hooks until the first frame.
- [x] 2.3 Add `scaffold.cjs` writing `pieces.js` from the hash-checked vendor bundle, and register `ascii-art` in the `composition scaffold` template list (help text follows it).

## 3. Documentation

- [x] 3.1 Write `skill/tools/ascii-art/README.md` (presets, capture, time, live sites through npm/CDN, limits) and add rows to `skill/tools/README.md` and `skill/vendor/README.md`, plus the installation note.
- [x] 3.2 Add the `THIRD_PARTY_NOTICES.md` section, the CHANGELOG `[Unreleased]` entry and the load-bearing files to `skill/references/package-resources.json`.

## 4. Verification

- [x] 4.1 Add `tests/ascii-art.test.cjs` to `scripts/test-manifest.json` and `npm run sources:check`, and update the CLI help assertion in `tests/designer-pipeline-cli.test.cjs`.
- [x] 4.2 Run `node --test tests/ascii-art.test.cjs tests/designer-pipeline-cli.test.cjs`, then full `npm test` (with `FONTTOOLS_PYTHON` set to `<fonttools-python>`) and `npm run specs:check` on the committed tree; record the results in `verification.md`.
- [x] 4.3 Smoke the real CLI from a project directory: scaffold, capture stills of at least four presets including both coloured scenes with `composition capture --seek`, and record the commands, outputs and limits in local `.design-pipeline/` evidence.
- [x] 4.4 Report Component Conformance and Visual Acceptance separately; visual acceptance belongs to the user.
