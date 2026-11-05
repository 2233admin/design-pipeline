## Why

In the 夜想回廊 (Nocturne Corridor) style experiment, every Japanese OFL mincho tried (Shippori Mincho, Shippori Mincho B1,
Zen Old Mincho) lacked simplified-only characters such as 钥, 证 and 记. A pure-Chinese title card had to fall back
to Noto Serif SC, which gave less contrast. Only the font file itself could show this; the "supports
Chinese" label on font sites could not. Today the skill picks fonts from memory or by browsing font sites. It
has no list of open fonts with their licences, real glyph coverage and style.

## What Changes

- A reviewed source registry `skill/references/fonts/sources.json` with these sources:
  - google/fonts: all 97 Chinese and Japanese families. Licence from `METADATA.pb` plus the licence text beside it.
  - LXGW WenKai (SC), from its repository.
  - Zhuque Fangsong: recorded as blocked. Its only builds are GitHub Release files, and the proxy refuses them (403).
  - Fontsource and the wordshub/free-font list: discovery only, not measured.
  The registry also records how each source is fetched, where its licence field comes from, and which hosts
  answered on 2026-11-05.
- A generated, packaged catalog `skill/references/fonts/catalog.json`. Each family records:
  - every file URL at the pinned commit;
  - its licence (commercial use, embedding, modification, Reserved Font Name) with the declaring file;
  - its cmap, measured by HTTP range reads;
  - coverage of 通用规范汉字表 (3500 and 8105), GB 2312, JIS level 1, Big5 common, Latin and CJK punctuation;
  - weights, and stroke contrast measured from 十 (a variable font at its heaviest `wght`);
  - style tags.
  The same revisions reproduce the same bytes.
- CLI `fonts` with three actions:
  - `query`: a string and a style role in; out come families whose cmap covers 100% of the string, near
    misses with the characters they lack, and exit 2 with a fix when none qualifies.
  - `measure`: coverage, weights, contrast and style of local files.
  - `refresh`: re-measures the pinned sources into the user cache, or `--output`. `--discover` lists new
    Google Fonts CJK families.
  `query` and `measure` work offline. `refresh` needs network access.
- `cjk-typography.md` and `tools/fonts.md` route font choice through `fonts query` before a family is chosen.

## Capabilities

- `design-pipeline`: ADDED `Open fonts are chosen by measured coverage and traced licence`.

## Reuse

- The pinned-revision and raw.githubusercontent.com fetch pattern of `vendor-cache.cjs`, its `cacheRoot()`,
  and the CLI's `runKernel` for the async refresh. The cmap reading follows the existing readers in
  `ff-tracking-hud/build.cjs` and `art-motion/engine/lib/util.js`, extended to more formats. The existing
  CJK typography contract and font guide.
- No gate, receipt schema or resolver is added. `fonts query` is a lookup that a stage may consult; it
  does not approve a font.

## Not taken

- Measuring CFF (OTF) outline contrast: such faces report `contrast: null` with a reason.
- WOFF2 decoding: `FONT_FORMAT_UNSUPPORTED` with a decompress fix.
- Korean-only families.
- Bypassing blocked hosts.
