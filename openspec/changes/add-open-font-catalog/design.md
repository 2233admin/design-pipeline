# Design: add-open-font-catalog

## Context

Issue #286. In the 夜想回廊 experiment (`/home/claude/shinbo`), the font choice failed in a way that only the font's
own cmap could show. This change lets the skill measure fonts itself.

## Decisions

1. **The cmap is read directly, with no dependency.** `font-catalog-core.cjs` reads sfnt, TTC/OTC and WOFF1 (zlib),
   cmap formats 0/4/6/12/13 (Unicode subtables only), `name`, `OS/2`, `head` and `fvar`. WOFF2 is refused with
   `FONT_FORMAT_UNSUPPORTED` and a decompress fix. Cross-checks against fontTools 4.67:
   - the 16 experiment fonts give identical codepoint sets;
   - Noto Serif CJK SC (TTC face 2) gives 44 777 codepoints, identical;
   - the range-read remote `NotoSerifSC[wght].ttf` gives 30 928 codepoints, identical to fontTools on the full download.
2. **Coverage sets come from the standards.**
   - 通用规范汉字表: a 24 KB file (three lines, one per level: 3500, 3000 and 1605 characters). It is taken from
     shengdoushi/common-standard-chinese-characters-table at `d9b599a`, whose source is the 2013 State
     Council table.
   - GB 2312, JIS X 0208 level 1 and Big5 common (A440–C67E) are decoded with Node `TextDecoder` (gbk, euc-jp,
     big5) over their code ranges. The results are 6763, 2965 and 5401 characters, the standards' own counts.
     No list is copied.
3. **Stroke contrast is the stem/bar ratio of 十.** The stem is measured at 85% of the glyph's height and the bar
   at 15% of its width, by flattening the quadratic outline and taking the widest non-zero-winding run on a
   scanline. Measured values:

   | Family | Contrast |
   | --- | --- |
   | Shippori Mincho B1 Bold | 4.30 |
   | Zen Old Mincho Black | 4.10 |
   | Hina Mincho | 2.28 |
   | Zen Kaku Gothic New | 1.05 |
   | LXGW WenKai | 1.07 |

   - A variable font is measured at its heaviest `wght` instance. gvar tuple deltas are applied, and untouched
     points are interpolated (IUP). Noto Serif SC measures 1.47 at its default (weight 200) and 5.71 at 900. A
     fontTools `instancer` instance at 900 measures exactly 5.71 (stem 160, bar 28).
   - The family value is its highest file. `--contrast high` means 1.8 or more.
   - A CFF outline gives `contrast: null` with a reason. A rendered specimen remains the visual check.
4. **Styles.**
   - Source category plus measured contrast: SERIF with contrast of 1.3 or more becomes `mincho`, SANS_SERIF
     becomes `gothic`, and DISPLAY, HANDWRITING and MONOSPACE map to their own tags.
   - A SERIF face with near-even strokes gets no tag unless the registry overrides it. Every override carries a
     reason. 16 are reviewed, for rounded, kai, brush and Song-style display faces.
   - Local files use name hints (Kai/楷, Mincho/Song/宋, Gothic/Hei/黑, Maru/Round), then contrast.
5. **The lock is the catalog. No second lock format is added.**
   - `sources.json` pins each source's commit, as the `skill/vendor/*/manifest.json` sources do.
   - `catalog.json` records:
     - for each file: the raw URL at that commit, its byte size (from `Content-Range`), the head
       `checksumAdjustment` and the SHA-256 of its cmap table;
     - for each licence text: its SHA-256.
   - The catalog has no timestamps. Two refreshes at the same revisions wrote identical bytes (SHA-256
     `dbddeb9d…`).
   - A whole file is never downloaded. A server that ignores Range is refused.
6. **Fetch path.**
   - raw.githubusercontent.com with Range: HTTP 206.
   - `github.com/<repo>/raw/...` and release downloads: refused by the proxy (403).
   - api.github.com: 403 without a token.
   - `git ls-remote`: works, and resolves `--revision head`.
   - fonts.google.com/metadata/fonts: reachable. It is used only for `--discover`, which on this run found 97
     CJK families, all listed.
   - Nothing is bypassed.
   - A full refresh of 98 families (169 files) took about 9–18 s and produced a 565 KB catalog. Cmaps are
     deduplicated by content hash and stored as varint ranges, raw-deflated, then base64.
7. **Query semantics.**
   - With `--weight N`, only the files that reach N must cover the text.
   - Candidates are sorted by contrast. Near misses are sorted by coverage and list the characters they lack.
   - Local `--path` faces join the query with `licenseNote: unknown`.
   - Catalog order: `--catalog`, then the refreshed user cache (`<cacheRoot>/fonts/catalog.json`, the
     `vendor-cache.cjs` root), then the packaged catalog.
   - Exit codes: 0 when at least one candidate covers the text; 2 with `font-coverage-none` and a fix when none
     does; 1 for usage or contract errors, each with a code and a fix.
8. **Licence lineage.**
   - `license.declaredIn` is the `METADATA.pb` URL at the pinned commit (or the repository's licence file).
   - `license.text` is the licence file beside it, with its SHA-256 and any Reserved Font Name.
   - Rights (commercial use, embedding, modification, conditions) come from the registry's licence table: OFL,
     Apache 2.0, UFL.
   - M PLUS Rounded 1c has no licence file in its google/fonts directory at `bbda725`. It is kept, with a
     `FONT_LICENSE_TEXT_MISSING` warning and a fix to read the upstream licence.

## File ownership

- New: `skill/scripts/font-catalog-core.cjs`, `skill/scripts/refresh-font-catalog.cjs`,
  `skill/references/fonts/{sources.json,catalog.json,tongyong-guifan-hanzi.txt}` and
  `tests/font-catalog.test.cjs`.
- Edited:
  - `cli-core.cjs`: the `fonts` command, the options `--text`, `--text-file`, `--weight`, `--contrast` and
    `--discover`, and help.
  - `cjk-typography.md` and `tools/fonts.md`: routing.
  - `package-resources.json`, `test-manifest.json` and `CHANGELOG.md`.
- No existing path or artifact changes shape. No migration.
- Kept separate from #287 (image material sources) and #288 (style packs). Neither change touches these files.

## Acceptance evidence (夜想回廊 copy, `--style mincho --weight 700`)

- Candidates:
  - Chiron Sung HK (contrast 5.71, `wght` up to 900);
  - Noto Serif SC (5.71, up to 900).
  Both have a cmap verified at 57/57 characters.
- Near misses (45/57): Noto Serif HK/JP/TC, Shippori Mincho and Shippori Mincho B1, local and catalog. The
  Shippori fonts lack 间钥标证词记忆轮墙级阶员.
- Near misses (39/57): Zen Old Mincho and the Kaisei faces. They lack 门关长间钥开标证词记忆页齿轮墙级阶员.
- Headless Chrome (CDP `CSS.getPlatformFontsForNode`) independently confirmed the near misses. It drew
  「钥匙不是用来开门的」 with 8 glyphs from Shippori Mincho B1 and 1 from the fallback (钥). With Zen Old Mincho it
  used 3 fallback glyphs (钥, 开, 门), as the catalog predicts.
- New finding: Chiron Sung HK also covers the simplified copy. The experiment's DESIGN.md had named Noto Serif SC
  as the only candidate.

## Visual direction

None. The catalog reports technical coverage and licence only; it never claims creative or visual acceptance.
