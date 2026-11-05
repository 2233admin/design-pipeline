# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate add-open-font-catalog --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `font-catalog-core.cjs`: sfnt/TTC/WOFF reader, cmap formats, glyph sets, 十 contrast with gvar instancing, codepoint encoding, styles and query.
- [x] 2.2 `refresh-font-catalog.cjs`: range reads at pinned revisions, METADATA.pb parsing, licence evidence, deterministic output, `--discover`.
- [x] 2.3 `sources.json` registry (google/fonts 97 CJK families, LXGW WenKai, blocked and discovery-only sources, reachability) and the generated `catalog.json`.
- [x] 2.4 CLI `fonts query|measure|refresh`; options registered in `KNOWN_OPTIONS`/`BOOLEAN_OPTIONS`; help.
- [x] 2.5 `cjk-typography.md` and `tools/fonts.md` routing; `package-resources.json`.

## 3. Verification

- [x] 3.1 `tests/font-catalog.test.cjs`, registered in `scripts/test-manifest.json`. It covers:
  - synthetic fonts: cmap formats, WOFF/TTC/WOFF2/garbage, gvar with all points and with IUP;
  - range-server refusal;
  - catalog lineage;
  - the 夜想回廊 acceptance query;
  - CLI errors.
- [x] 3.2 Cross-checks against fontTools and headless Chrome (design.md); refresh reproducibility.
- [x] 3.3 Full `npm test`.
- [x] 3.4 CHANGELOG entry.

## 4. Review fixes (PR #290)

- [x] 4.1 Strict 206 checks; out-of-bounds and corrupt input raise FONT_UNREADABLE; per-file local problems.
- [x] 4.2 `refresh --source` merge; stale-cache fallback with `pinned`.
- [x] 4.3 Family problems on query rows; `--limit` validation; contrast text; CJK guide wording.
- [x] 4.4 Licence text verified against the declared id; LXGW Reserved Font Names and additional permission recorded.
- [x] 4.5 Tests for each, ported from the review's range repro; specs:check.
