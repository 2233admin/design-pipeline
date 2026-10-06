# Font sources, selection and proof

Load this guide when choosing or obtaining a typeface for graphics, layout, a frontend,
titles, captions or animation. Start with the project's visual direction, language and reading
role. Existing brand typography and the user's selection take precedence over these examples.

## Discover, then obtain the selected family

[FontLab](https://www.ignoredone.space/index.php/fontlab/) is a user-supplied, commonly used
discovery and preview source. It offers editable specimen text, weight selection and categories
including CJK/Latin sans and serif, script, typewriter, pixel, condensed and expanded faces.
Open the relevant category and try the actual copy; do not load its whole catalogue into context.
The collection is not an all-open-source font package or our default font palette.

For broader composition, image, mockup or graphic-tool research, use the companion
[design directory route](design-sources.md); return here for the selected family's font checks.

| Source | Use it for | Acquisition boundary |
| --- | --- | --- |
| [FontLab](https://www.ignoredone.space/index.php/fontlab/) | Discover a shape, contrast, width or visual tone; examples include Outfit, Satoshi, MiSans, 思源宋体 and pixel faces | Follow the selected family's author/publisher source; a preview asset URL is not release or license evidence |
| [Google Fonts](https://fonts.google.com/) / [official files](https://github.com/google/fonts) | Search language, weight, category and variable families | Read the family's metadata and license; download the selected release/files, not the entire repository |
| [Fontshare](https://fontshare.com/) | Families such as Satoshi and Clash Display | The official catalogue labels these closed source; free availability does not imply OFL or unrestricted modification. Read its family license |
| [Source Han Sans](https://github.com/adobe-fonts/source-han-sans) / [Source Han Serif](https://github.com/adobe-fonts/source-han-serif) | 思源黑体 / 思源宋体; choose the actual regional build and glyph forms | Use official release assets and included licenses; SC/TC/JP/KR variants are deliberate choices |
| [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) | 霞鹜文楷 and the author's linked regional/screen variants | Use the specific project's release and license; do not silently substitute a similarly named web subset |
| [MiSans](https://hyperos.mi.com/font/download), [Alibaba fonts](https://www.alibabafonts.com/), [HarmonyOS design resources](https://developer.huawei.com/consumer/cn/design/resource/) | Common publisher-provided CJK families | Check each current agreement and intended use; do not treat this row as an open-source license classification |

For example, [Google Sans Flex](https://github.com/googlefonts/googlesans-flex) publishes an
[OFL file](https://github.com/googlefonts/googlesans-flex/blob/main/OFL.txt) and variable axes;
the publisher's [MiSans agreement](https://hyperos.mi.com/font/download) has its own conditions.
Do not apply one family's modification/embedding permission to another. Record the release or
commit, source URL, actual filename/family, license and chosen weight/axes in existing project
asset/design notes. This source list was checked on 2026-10-07; verify the selected release on use.

Acquire only the needed files into the consuming project's asset directory, with their notices.
Use an existing local font when its identity and intended-use rights are known. Do not install
an entire catalogue into the OS or inflate the skill package just to make a font selectable.
No font binaries from FontLab are bundled by this guide.

## Select by the work, not by a compulsory style

| Role | Compare in the actual composition |
| --- | --- |
| Body, controls, subtitles | Reading size, density, stroke survival, CJK punctuation, ambiguous Latin/digits and line breaks |
| Display title or cover | Silhouette, width, contrast, negative space and relation to the image; a condensed/expanded face can solve a shape need without scaling glyphs |
| Editorial, historic or handwritten treatment | Letter construction, texture and period cues; test more than one attractive word |
| Data and changing numbers | Available tabular figures, decimal/colon alignment, minus signs and currency; inspect values while they change |
| Mixed CJK/Latin | Optical weight, apparent height, baseline and punctuation across the two families; one numeric font-size does not guarantee a match |
| Animated type | Actual word length, motion path, stroke survival and timing; animate available weight/width/optical axes only when the selected font supports them |

The system CJK stack is a low-cost fallback for an unspecified UI, not a restriction against
custom project typography. A chosen family can serve body or display roles when it fits the
reading task and passes the existing [CJK checks](../references/cjk-typography.md).

Use the same real words, box, background and hierarchy when comparing candidates. Compare
their regular and intended emphasis faces; keep a readable minimum instead of shrinking long
copy until it fits. Inspect the actual target sizes, CJK/Latin mixtures, numerals and punctuation.
For moving type, inspect playback and the weakest, smallest or fastest frame as well as a still.
Do not fabricate italics/bold or animate an axis that the font does not contain.

Use the project's existing preview surface. Semantic DOM/CSS is the default for interface
text and controls; [Visual Craft](visual-craft/README.md) supplies measured Canvas text fitting
and overflow for composed artwork. Compare screenshots with the existing
[composition tools](visual-diagnostics/README.md) when pixel evidence is useful. No new review
gate or fixed number of candidates is required.

## Reuse the existing font tools

When the chosen license permits the transformation, subset a **known, static** glyph set with
the existing [font helper](art-motion/assets-audio.md#font-subset-and-glyph-route):

```powershell
uv run --with fonttools python "<skill-root>/tools/art-motion/font-subset.py" `
  --root "<project>" --font assets/fonts/ChosenFamily.ttf `
  --text-file assets/title-copy.txt --output assets/fonts/title.woff
```

This helper outputs WOFF1 and checks missing source glyphs. Web projects may use licensed
WOFF2 files or their existing font build tool; do not rename a WOFF to pretend it is WOFF2.
Dynamic user text needs an appropriate full/segmented language font and tested fallback,
not a subset of today's sample. For web loading, use local `@font-face`, actual available
weights/axes and `font-display: swap`; inspect fallback layout and failed loading.

For authored Canvas artwork, load the chosen face with `FontFace`, wait for loading, and pass
explicit family/file mappings to the existing runtime. Art Motion's render spec accepts:

```json
"fonts": [{ "family": "ChosenFamily", "file": "assets/fonts/title.woff", "weight": "600" }]
```

Paths are relative to the spec file and contained within the consuming project. The glyph
reader accepts WOFF1/TTF/OTF; use its [runtime and renderer guide](art-motion/README.md) for
loading, `U.assertGlyphs` and supported inputs. Successful loading does not prove shaping,
kerning, language-specific forms or readability: inspect the actual output.

## Bundled sample aliases are not font identity

Huashu sample clips retain `PuHui-Medium/Bold/Heavy/Black` compatibility aliases. Their bundled
files are **Noto Sans SC** subsets at 500/700/800/900, not Alibaba PuHui. `NotoSansSC` and
`NotoSerifSC` sample files cover only source-demo text; `NotoSerifJP-600` is not a general
simplified-Chinese font. Check the [bundled font notices](../vendor/huashu-art-motion/upstream/scripts/engine/lib/fonts/LICENSES.md)
and actual text instead of assuming coverage from a family label.

New artwork should use its real project font names. When deliberately adapting an existing
clip, its declared alias can map to a caller-supplied, appropriately licensed font file; record
the actual family separately and recheck wrapping, glyphs and render quality after replacement.
The source aliases do not select fonts for frontend work, images, typography or new animation.
