# Font license and provenance

`JetBrainsMono-ascii-art.woff` is NOT covered by the repository's MIT license. It is a subset of
JetBrains Mono and keeps the SIL Open Font License 1.1; the full text is `OFL.txt` beside it,
copied byte for byte from the release. The license declares no Reserved Font Name.

| Field | Value |
|---|---|
| Family | JetBrains Mono Regular, version 2.304 |
| Copyright | Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) |
| Source | https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip (sha256 `6f6376c6ed2960ea8a963cd7387ec9d76e3f629125bc33d1fdcd7eb7012f7bbf`) |
| Input | `fonts/ttf/JetBrainsMono-Regular.ttf` from that zip (sha256 `a0bf60ef0f83c5ed4d7a75d45838548b1f6873372dfac88f71804491898d138f`) |
| License | `OFL.txt` from that zip (sha256 `30f0c136e3c88e422d0791acd97238870f9054a9729bc34cf2ff0d4ed8cac4ad`) |
| Subset | `JetBrainsMono-ascii-art.woff`, 7,488 bytes, sha256 `3910700deb57f048f7a90af38c73425984ce8857c9151279900be9e6aff584b1` |

The subset holds printable ASCII (U+0020 to U+007E) and every non-ASCII character in the twelve
vendored ascii.rest piece modules (`skill/vendor/ascii-rest/upstream/dist/pieces/*.js`): 137
characters, each 600 of 1000 units wide. It was cut from the first eleven modules; the twelfth,
`aurora-fjord.js`, adds no character they lack. It was made with fontTools 4.66.1:

```sh
python -m fontTools.subset JetBrainsMono-Regular.ttf --unicodes=<the 137 code points> \
  --layout-features= --no-hinting --flavor=woff --drop-tables+=GSUB,GPOS,GDEF \
  --output-file=JetBrainsMono-ascii-art.woff
```

Dropping the layout tables removes JetBrains Mono's programming ligatures, so `->` or `==` in a
frame stay two cells. `composition scaffold --template ascii-art` embeds the subset as a data URL
in the project's `font.js` and copies `OFL.txt` as `LICENSE.font`; `tests/ascii-art.test.cjs`
checks that the subset covers every character the pieces contain.
