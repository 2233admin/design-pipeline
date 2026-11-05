# Design

## Decisions (made without asking; the issue left them open)

- **Where it lives**: a fourth `template` bank action, `template distill`, beside `list`, `render`
  and `check`, because its output is a style pack in the bank's shape and its archetypes point at
  bank templates. No new gate, receipt, schema id or resolver: the draft uses
  `design-pipeline.template-bank-style.v1`; `checks.measured` is an optional block validated by
  the same `validateStyle` that `loadStyle` now calls. `distill.json` names its own shape
  (`design-pipeline.template-bank-distill.v1`) because it is a working file, not a contract
  another stage reads.
- **The board is the existing provenance record**: the provenance CSV the template-bank guide
  already asks for (`docs/research/arknights-endfield-provenance.csv`, art-study `provenance.csv`),
  plus an image folder, plus the study's annotation files (`annotations.csv` from the eye-annotated
  boxes, `labels.jsonl` from its auto labels). OCR text in labels is never read into outputs.
- **Private images stay private**: images are decoded to memory by ffmpeg; outputs carry ids,
  source URLs, sha256, sizes and numbers. The test asserts no PNG bytes or base64 reach the output.
  Tests draw their references in code (tiny PNGs); no reference image is committed.
- **No model**: the issue and the study (#270) agree that colour budgets and layout distributions
  are what can be modelled; CLIP-style typicality is left out (AUC 0.52-0.58 on same-image damage
  in the study). OCR and person segmentation are out too: layout boxes come from annotations; when
  a board has none, title, margins, type ratio and font roles are reported as gaps.
- **Thresholds**: the distribution is the threshold, as the issue asks: a maximum takes p75, a
  minimum p25, a band p25-p75 (numpy's linear quantile). Support: `measured` from 8 references,
  `thin` from 3, else `gap`. Nothing is clipped to a "nice" value.
- **Archetypes**: deterministic binning, not clustering, so a reader can say why a reference landed
  where it did: aspect (landscape > 1.15, portrait < 0.87) x title side (cx < 0.4 / > 0.6) and band
  (cy < 0.4 / > 0.6) x figure side (cx < 0.45 / > 0.55) x whitespace (above or below the board's
  median quiet share); without annotations, symmetric (mirror similarity at or above the median and
  weight centre within 0.04 of the middle) or offset left/right. Template facts come from each
  template's default render (`bank.check` measured slot extents, figure zone). Distance = mean
  absolute difference of title cx, cy and figure cx (weight cx when nothing else), + 0.5 for a
  different aspect; above 0.25 the archetype gets a skeleton.
- **Font roles**: the measure is the one the open-font catalog uses (stem / bar, high at 1.8), taken
  on the crop's ink (Otsu, minority class, so white-on-black reads like black-on-white): stem = p35
  of horizontal ink runs, bar = p35 of vertical runs, both between 2 px and half the glyph height.
  Glyph height = the annotated size, else the median ink line from a row profile (a three-line title
  is not one tall glyph). Calibrated on Pillow specimens (64 px, 2 strings, both polarities): every
  mincho face (Noto Serif CJK SC Medium/Bold/Black 2.5-4.0, Shippori Mincho B1 3.5, Zen Old Mincho 3.0,
  Kaisei Opti 2.3, Hina Mincho 2.0) is >= 1.8; every gothic (Noto Sans CJK SC Medium/Black 1.0-1.2,
  Zen Kaku Gothic New 1.0) <= 1.35. LXGW WenKai (kai) reads 1.25, i.e. gothic: brush faces are not
  separable by this measure and the report says so. Weight steps (stem / glyph height): 0.08 -> 500,
  0.105 -> 700, 0.125 -> 900.
- **Font catalog hook**: #290 is not in this base. `distill.cjs` requires
  `../../scripts/font-catalog-core.cjs` when present and calls its `resolveCatalog({})` and
  `queryCatalog({ catalog, text, style, contrast, weight })`; `useFontCatalog(core)` replaces it (the
  test uses a stub). Without it the draft keeps open defaults (Noto Serif / Sans CJK SC, already
  named by both packs) and prints `fonts query --style --contrast --weight`.
- **Palette**: every reference's six k-means centres, weighted by share, are re-clustered (k = 6):
  `bg` (the ground, named as most templates name it) = largest, ink = the neutral farthest from it in lightness, accent = the most chromatic
  cluster holding at least 1% of the pooled pixels (none when no colour reaches that; the Arknights
  board has none: its colour is in figures, spread over many hues).
- **Comparison** reads the hand pack's numbers where they are: template parameters
  (`accent_max_share` or `accent.maxShare`, `margin_x`, `title_cy`, `fig_cx`), template grounds,
  the figure-zone limit (0.3), and two statements in the shinbo pack's provenance ("main colours
  about 74%", "hue spread under 5 degrees"). "Same magnitude" = ratio within 1/3-3 (both below 0.01
  counts as same). Every row carries the reason the two numbers differ.
- **Ablation**: renders the nearest template of the three largest archetypes, seeds 1 and 2, as PNG
  through the existing `templatePng` (the `composition capture` kernel) and measures them like the
  references. Variants: the draft palette mapped onto the template's roles; template defaults
  (measured palette removed); the ground tinted to chroma 0.12 (neutral ground removed); a second hue
  150 degrees away on a role the render actually paints (one theme hue removed). Distance = mean over
  nine colour and space features of |sample median - reference median| / reference IQR. The paired
  change is the reading; absolute distance stays high because templates draw placeholders.

## Acceptance, measured (images local, not committed)

Port parity, `features.py` (art-study) against `reference-measure.cjs` on 10 study images with no
letterbox: ground L, accent share, weight centre, quiet share and spectral slope / high-frequency
share agree to the third decimal (e.g. AK000 ground L 0.9853 / 0.9854, accent 0.0209 / 0.0209, spec_hf
0.2132 / 0.2131); hue spread within 1.2 degrees; one k-means case (EF080) differs in ground chroma by
0.002. Images with a detected letterbox differ by design (the Python run was given none). 0.26 s per
image.

### Arknights / Endfield study board (`art-study/provenance.csv`, eye annotations)

63 design references (KV, PV cover, banner, dossier, album; 13 of them outfit KVs), 28 s:

| Check | Hand pack | Draft, 63 | Draft, 13 outfit KVs | Why |
| --- | --- | --- | --- | --- |
| accent share max | 0.03 | 0.078 (2.6x) | 0.090 (3.0x) | hand = budget for the accent role's paint; draft counts every pixel with C > 0.12, figures included |
| ground chroma | 0.004 | 0.008 | 0.005 | both neutral (below 0.01) |
| ground lightness | 0.89 | 0.93 | 0.94 | light grounds dominate; the board's dark KVs pull the p25 to 0.23 |
| side margin min | 0.045 | 0.035 (0.78x) | 0.030 (0.67x) | p25 of annotated text; boxes estimated on thumbnails (+-5%) |
| title over figure max | 0.30 | 0.57 (1.9x) | 0.11 (0.37x) | the 0.3 rule is for outfit KVs (study: 0/13 overlap); event KVs and PV covers overlap often |
| title centre y | 0.50 | 0.535 | 0.50 | |
| figure centre x | 0.545 | 0.55 | 0.55 | |

All seven comparable thresholds share a magnitude with the hand pack. Palette: 13 of 25 hand
ground / ink / accent colours have a draft colour within OKLab 0.08 (all grounds and inks); the
accents do not (no pooled cluster reaches 1%: accents are small and spread). The outfit-only board
finds a yellow accent (#FAD535; the outfit template's gold #D8B23A is 0.107 away) and 15 of 25 close.
Archetypes: left-title middle-band landscapes -> `kv.outfit-title-left` (0.04-0.07), centre-lower
titles -> `cover.pv-lowerthird` (0.06), lower-left titles -> `kv.ef-narrative-lowerleft` (0.02) and
`kv.operator-nameplate-ll` (0.02), portrait upper-left titles -> `card.dossier-portrait` (0.01-0.06);
no skeleton needed. Title type: 60 of 63 crops measurable, gothic 39, mincho 11, unclassified 10,
stem/bar median 1.16 -> gothic, weight 700 (the study's KV titles are mostly heavy geometric sans and
condensed display Latin; its serif outfit titles and script titles are the minority).

Ablation (3 templates x 2 seeds): measured palette removed +0.46 (63) / -0.09 (13); neutral ground
removed +0.14 / +0.19 (ground chroma +1.4 / +1.6 IQR); one theme hue removed -0.06 / -0.03. The
last is a finding, not a bug: the references' whole-image hue spread is wide (median 27 degrees,
p75 56; figures are multi-hued), so a second hue in a placeholder template moves it toward them. The
"one theme hue" rule of the study is about the design layer (titles, marks), which pixel statistics
over the whole frame cannot separate from the figure: it stays a judgement rule.

### Nocturne Corridor board (shinbo style)

No owner-supplied Shinbo screenshots are on this machine and none were fetched. The board is the
experiment's reviewed final round (14 title cards, poster, two web screens, codex; text boxes and
sizes from its check output as `labels.jsonl`), our own original work in the style, which the
hand-made `shinbo` pack was written from. Run it again on real screenshots when the owner provides
them (`--images` + a provenance CSV).

| Check | Hand pack | Draft, 18 | Why |
| --- | --- | --- | --- |
| ground chroma | 0.014 | 0.014 | |
| ground lightness | 0.95 | 0.54 | the default render's ground is paper; the board mixes black, paper and red cards |
| hue spread max | under 5 degrees (provenance) | 3.2 (p75) | |
| main colour share | about 74% (provenance) | 0.71 (median, largest cluster) | |
| accent share max | 0.12 | 0.36 (3.0x, not same) | five red-ground cards: their whole frame is strong colour, so the draft's p75 is a main colour there, not an accent |

Palette: black #0D0B0B, paper #F2EEE4 and red #D10E1F come back within OKLab 0.006, grey 0.033, the
teal accent 0.041; only the shadow-only red_deep has no cluster (0.14). Title type: mincho in 11 of
14 cards (stem/bar median 3.2, high contrast, weight 700); the three gothic titles are the cards set
in Zen Kaku Gothic / Noto Sans. Small text: mixed (gothic 11, mincho 8, unclassified 5), so the role
is left unclassified, as the pack has both. Archetypes: centred titles -> `card.void-line` (0.00) and
`card.onechar-bleed` (0.00), left titles -> `card.collide` (0.04-0.07). Ablation: measured palette
removed +0.08, neutral ground removed +0.75 (ground chroma +5.1 IQR), one theme hue removed +0.25
(hue spread +2.2 IQR): here all three rules move the renders away from the references.

## File ownership

- `reference-measure.cjs`: decoding and the per-image features (the study's port), stroke style.
- `distill.cjs`: board, distributions, palette, archetypes, font roles, draft, comparison, report,
  ablation variants and distance. Rendering for the ablation stays in `cli-core.cjs`, which owns
  the browser path (`templatePng`).
- `bank.cjs`: `validateStyle`, shared by installed packs and drafts.

## Compatibility and migration

- New command and options only; `template list|render|check` are unchanged. `loadStyle` validates
  exactly as before plus the optional `checks.measured` block. No migration.
- Stacked on #291: `--compare` reads its `style` field and style packs; it does not touch #291's
  files' regions other than the `loadStyle` body (factored, same checks). No collision with #294
  (materials) or #290 (fonts: a hook only).

## Not in this change

- Installing a draft automatically, writing its templates, or using `checks.measured` in a check
  rule: a human reads the report first.
- Motion rhythm from video references (a reference board is stills), materials, alignment lines.
- Model-based signals (OCR, segmentation, CLIP typicality); see the study's Goodhart notes.
