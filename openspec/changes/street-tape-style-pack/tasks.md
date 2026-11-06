# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #312.
- [x] 1.2 `npm exec -- openspec validate street-tape-style-pack --strict` and `npm run specs:check`.

## 2. Pack and templates

- [x] 2.1 `styles/street-tape/style.json`: font roles through the catalog, grammar with the board's numbers, materials and recipes, motion, checks with the 64 px guidance and the case's traps, provenance, examples.
- [x] 2.2 `layouts-street.cjs` and five template folders (manifest, default render, spec.md); `bank.cjs` registry.

## 3. Docs and tests

- [x] 3.1 `skill/references/template-bank.md`, `package-resources.json`, `CHANGELOG.md` [Unreleased].
- [x] 3.2 `tests/template-street-tape.test.cjs` (registered in `scripts/test-manifest.json`); counts in `tests/template-bank.test.cjs` and `tests/template-style-pack.test.cjs`.
- [x] 3.3 Focused tests (template bank, style packs, game packs, street-tape), then `npm test`.

## 4. Fix: the number's size without Oswald installed

- [x] 4.1 Reproduce main's CI failure locally by hiding Oswald from fontconfig (`Oswald number : CJK ink 2.38`; CI 2.33).
- [x] 4.2 `layouts-street.cjs`: size and pin the number from the first `num` family `--font-dir` supplies, else Noto Sans SC; `bank.cjs` pin reason says when the pinned family is not embedded either.
- [x] 4.3 `tests/fixtures/street-tape/fonts/`: OFL Oswald subset with its licence and provenance; the ratio test supplies its faces; focused tests with Oswald hidden and visible, `npm run specs:check`, then `npm test`.
