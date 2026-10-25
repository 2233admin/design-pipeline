# Text motion recipes / 文字动效配方

Find a mechanism by the reading task, not by an effect label. These original studies cover the 248 factual text-category identities: 228 text-engine items and 20 legacy items. A source identity is an inspiration pointer, not a claim of source visual fidelity. The authoritative item configurations are the existing component-source catalogue; each item has an exact `motionRecipe.variantId`, supported authored parameters and mechanism rationale.

Open the [offline gallery](../../../tools/motion-recipes/full/index.html) and select an exact item through `#motion=<source-id>`. For bilingual discovery, use the existing `design-system search --kind doc --query` route with your selected snapshot. Do not add `--platform web`: that filter remains component-only.

## Find the reading problem / 按阅读问题选型

| Need / 场景 | Mechanism to inspect / 机制 | Adaptation boundary / 边界 |
| --- | --- | --- |
| Reveal text without breaking emoji / 多语字素入场 | Grapheme, word, logical-line reveal; explicit reveal order | A grapheme is not a Japanese phrase or a measured physical line |
| Change a value or phrase / 数字与文案换值 | Counters, reels, differential typing, two-state replacement | Logical value and announcement change once; do not announce every decorative frame |
| Caption a spoken cue / 字幕与歌词 | Cue blocks, word timing, fill progress, roll-up | Transcript/cue timestamps own timing, not a decorative duration |
| Japanese punctuation or vertical copy / 日语语义排版 | Authored Japanese phrase units, ruby and punctuation pauses, vertical order | Chinese adaptation uses Chinese word/punctuation rules, not invented Japanese bunsetsu |
| Let pointer or scroll reveal emphasis / 指针与滚动阅读 | Native distance fields and normalized scroll progress | `seek` studies reconstruct scripted input; production owns actual pointer/scroll state |
| Animate font design rather than scale / 真实字体轴 | Local Roboto Flex weight, width and slant axes | Actual covered Latin glyphs only; CJK stays readable in system fonts |
| Compose a title or broadcast graphic / 标题与播出包装 | Title framing, plates, tickers, light/color/filter/path channels | Decorative repetition belongs to authored film/broadcast composition, not ordinary UI by default |

## Common ownership, timing and lifecycle

The classic module [`text.js`](../../../tools/motion-recipes/full/text.js) exports `{ group: 'text', recipes }`; its original supporting modules are `text-core.js`, `text-glyph.js`, `text-media.js`, `text-semantic.js` and `text-interactive.js`. Load the core and four parts before `text.js` when using classic browser scripts. No renderer/runtime installation or upstream fetch is needed. These modules are offline studies, not a production interaction library.

Each descriptor validates its complete, explicit author parameters, creates the stage once, and returns `seek(progress)` and `dispose()`. `progress` is finite in `[0,1]`. Seeded random states depend on the absolute progress and seed, not on previous frames. The gallery owns playback. Cancel by disposing; replay/reverse/cold seek reconstruct the same authored state without a private animation loop. Dispose releases native listeners and removes the owned root. Recreate on sample-text or reduced-motion changes so segmentation and layout use the new text.

Start from the actual trigger and final readable state. A reveal generally allocates the early/middle interval to ordered appearance and reserves the end for reading. A swap separates outgoing and incoming states. Typing uses cumulative grapheme budgets and punctuation holds. Physics studies separate approach, contact and settle. Caption/broadcast sequences have cue/plate/read/exit phases. The catalogue's `studyDurationMs` is an original teaching clock; source-displayed action/loop durations are separate factual observations, neither is a product transition token.

Current project `DESIGN.md`, `MOTION.md`, motion budgets and semantic primitives override the study palette, sizes and timing. Existing text/replacement/value state primitives own the logical content. When no semantic motion primitive fits, choose the explicit DOM/CSS/SVG/Canvas channel shown by the mechanism; do not invent a new primitive ID.

**No motion / 不做动效:** use immediate text for validation errors, urgent information, dense repeated updates, legal copy, essential keyboard reading and anything whose timing would hide information. Reduced motion presents readable final/emphasis/cue state without decorative travel, shake, flashing or repeated accents. A user scrolling the native viewport is not permission to add motion when reduced is requested. Essential counters still show their meaningful values.

Visual glyph layers have a full semantic label. Production UI should retain actual semantic DOM, headings, focus, selection, links and restrained announcements; do not import the study's decorative `role="img"` wrapper into an interactive text control.

## Segmentation and language boundaries / 分词与语言边界

`text-core.js#segments` uses `Intl.Segmenter` for graphemes and words; unsupported capability throws explicitly instead of splitting surrogate pairs, combining marks, emoji ZWJ sequences or variation selectors. `char` means a complete grapheme. `word` uses a locale-aware boundary, preserving whitespace/punctuation. `line` means authored newline/sentence units: it is not a promise of physical browser-line detection. Use explicit newlines for line choreography; ordinary responsive reflow is a separate layout mechanism.

Use real mixed-language copy, for example `信息已更新 / Motion ready 👨‍👩‍👧‍👦` and multiline `第一行 / First line\n第二行 / Second line`. Never replace editable text with a decorative Latin alphabet just to make the effect fit. Scramble/code phases may temporarily use an explicit authored symbol repertoire, but preserve and restore every semantic grapheme.

Japanese-specific recipes below label their authored Japanese demonstration and the Chinese adaptation separately. A generic grapheme reveal does not establish bunsetsu, correct kanji pen order, phonetic ruby, IME conversion or lyric syllabification for arbitrary input. Those mechanisms require their explicit semantic demonstration/configuration and product data.

## Typing and decode / 输入与解码

Implementation: `text-interactive.js`, descriptors `text.typing` and `text.decode`.

- Typing `mode`: `plain`, `caret`, `human`, `terminal`, `loop`, `placeholder`. `pace` in `[0.2,3]` scales the authored input budget. Only `placeholder` accepts and requires `placeholder` text; that parameter is rejected for other modes. Human timing uses seeded duration per grapheme and longer punctuation holds. A caret/terminal cue is distinct from a static plain reveal; loop explicitly types, holds and erases.
- Decode `mode`: `scramble`, `code`, `flicker`, `center`, `slot`, `terminal`. All modes except `flicker` require an explicit `alphabet` with at least two graphemes; `flicker` rejects that parameter because it preserves glyph content and only changes visibility. `spread` in `[0.1,0.8]` separates lock-in times. `code` advances cyclic symbol positions, `center` locks outward, `slot` changes reel position, and terminal gives unlocked symbols a separate channel. Reduced motion restores the source text immediately.

Trigger: a new authored label, terminal response or controlled narrative beat. Initial state: placeholder/empty/unlocked glyphs; end state: complete source copy, except the explicitly cyclic type/erase study. Production streaming/IME input remains authoritative; do not overwrite live user composition or restart typing on every render. A production decode effect is decorative, not an encoding or security operation.

## Two-state replacement / 双状态换字

Implementation: `text-interactive.js`, descriptor `text.text-swap`. Parameters: explicit `target`, `spread` in `[0,0.75]`, and `mode` `crossblur`, `cube`, `wordflip`, `diff`, `cascade`, `spring`, `skew`, `flap`, `roll`, `glyphslot`, `letterflip`, `goo`.

The source and target have independent grapheme/word slots. Blur crossfade combines two opacity/filter states; cube rotates adjacent depth faces; letter/word flip changes the Y-facing surface; split flap has separately clipped upper/lower hinged halves; glyph-slot has deterministic intermediary reel symbols; word roll changes word units; cascade changes glyph-unit timing. Differential replacement preserves matching index glyphs and retypes differing slots. Goo uses an original SVG alpha-threshold filter on the two layers, not a promise of arbitrary outline morph topology. Spring and skew have different geometric paths.

Trigger: commit of a new text value. End state: exact target copy, including length changes. For continuous changes, the production owner cancels the presentation and derives a new source/target from the current committed state; focus and announcements stay with that owner. Reduced motion commits the target without two-layer blur/travel.

## Layout / 字形布局与重排

Implementation: `text-interactive.js`, descriptor `text.text-layout`; `extent` in `[0.1,1]` controls range and timeline shaping. `mode`: `counterweight`, `reflow`, `anagram`, `balance`, `truncate`, `fit`, `camera`, `insert`, `leading`, `justify`. Only `insert` accepts/requires `target`.

Container-width reflow changes actual wrapping; balanced reflow uses native balanced text wrapping rather than translating a line. Anagram changes seeded DOM visual order and flips back to reading order. Truncation expands a real grapheme-safe excerpt. Fitting measures actual font text width at creation and changes font-size with an 18px minimum; do not quietly shrink below the product's readable minimum. Word insertion allocates actual inline width; line spacing changes logical-line margins; justified stacking uses authored lines and actual typographic spacing. Counterweight changes alternating type hierarchy and offset. The camera is explicitly a composition transform, not a layout reflow.

Production layout remains responsive and content-driven: use semantic text, preserve reading order, and derive the new geometry after content/font/container changes. Do not animate arbitrary letter order in instructional content. Reduced motion presents the end layout immediately.

## Pointer and scroll / 指针与滚动

Implementation: `text-interactive.js`, descriptors `text.pointer-text` and `text.scroll-text`.

Pointer parameters: `radius` `[30,240]`, `strength` `[5,80]`, modes `cloneroll`, `trail`, `lift`, `lens`, `magnet`, `reveal`, `repel`, `scramble`, `spotlight`. Real `pointermove`/`pointerleave` update a distance field; `seek` reconstructs a prescribed path with positions measured from a neutral state. Attraction and repulsion reverse the displacement field; lens scales by proximity; lift targets word units; spotlight changes filled/outlined visibility; reveal has a circular plate mask; scramble uses seeded proximity symbol states; trails use pre-created echo labels. Reduced motion disables decorative pointer reactions and shows readable content.

Scroll parameters are mode-specific, not a bag of ignored controls. Modes `chapter`, `columns`, `drop`, `parallax`, `echo`, `blurtilt`, `clip`, `skew`, `velocity`, `highlight`, `shrink`, `window`, `view`. `distance` `[20,240]` is accepted only for columns/drop/parallax/echo/blurtilt/skew/velocity. `spread` `[0.1,0.75]` is accepted only for drop/highlight/view. Native viewport scroll position drives presentation; programmatic seek records its exact scroll target so delayed native scroll events cannot overwrite a cold seek. Wheel deltas separately drive the velocity-marquee study. Chapter index changes semantic chapter state; dual columns use opposite-phase vertical columns; letter drop uses graphemes; word highlight/view uses words; clip/window/shrink use distinct geometry.

The study's fixed native viewport is not a drop-in document scroll controller. Production owns scrolling, pointer coordinates, velocities, sticky boundaries, reading/focus and touch/keyboard alternatives. Bind those states to the existing project's renderer; do not add a second animation loop. Scroll activation must not delay access to text. All owned native listeners are removed by dispose.

## Offline loading and renderer adaptation / 离线加载与渲染器适配

Load classic scripts in this dependency order: `text-core.js` → `text-glyph.js`, `text-media.js`, `text-semantic.js`, `text-interactive.js` → `text.js`. The four part scripts may appear in any order after the core; the final aggregator must follow all four. CommonJS consumers require `text.js`, which loads its local dependencies without accessing the DOM at require time. Keep the local TTF, complete OFL notice and font provenance beside these scripts; variable-axis creation loads `text-roboto-flex.ttf` relative to the gallery document, so a relocated page must preserve or explicitly adapt that authored URL.

The gallery owns the clock and supplies finite progress `[0,1]`; a descriptor supplies only `create`, deterministic `seek` and `dispose`. A cold/reverse seek derives authored geometry and seeded state from progress, not an accumulated frame count. Measurements depend on the current stage dimensions and loaded fonts: mount inside the intended viewport, wait for fonts where applicable, and recreate a measurement-dependent study after a production font/container change rather than treating cached teaching geometry as responsive layout.

For `web`/`ui`, bind the mechanism to existing semantic DOM, project typography and motion tokens. Content, focus, native input, scroll position, numeric state and accessibility announcements remain product-owned; decorative copies are not independent authoritative content. CSS 3D, filters, background/text clipping, balanced wrapping, SVG filters/text paths, Canvas 2D and `Intl.Segmenter` are browser capabilities, not portability promises. Missing grapheme segmentation fails explicitly. CSS visual glyph deformation is not a font-axis claim.

For `film`/`edit`, transfer the authored phase envelope and actual channel into the existing composition/scene renderer: positions/hinges become transform tracks, masks and ink become matte/compositing tracks, paths become renderer text-path geometry, caption windows become cue tracks, and font axes require a renderer/font combination with those real axes. DOM/SVG/Canvas studies do not establish a Blender/film renderer's font, mask or filter support. Keep semantic transcript/text and cue/value authority outside decorative layers; use the project's established renderer, timeline and render review instead of introducing this gallery as another production runtime.

Static reduced motion retains readable content and the meaningful result, removes repeated emphasis/travel/shake/flashing, and does not remove native scrolling or content access. Ordinary UI should prefer no motion when a transition communicates no new information; authored loops, glitching, bright strokes and particle breakup are bounded title/broadcast studies, not default reading treatments.

## Real variable-font capability / 真实字体轴能力

Implementation: `text-interactive.js`, descriptor `text.variable-axis`; local font [`text-roboto-flex.ttf`](../../../tools/motion-recipes/full/text-roboto-flex.ttf), [complete OFL notice](../../../tools/motion-recipes/full/text-roboto-flex-OFL.txt), [provenance and binary hash](../../../tools/motion-recipes/full/text-roboto-flex-provenance.json).

Roboto Flex 3.200 is acquired unchanged from the publisher's [release archive](https://github.com/googlefonts/roboto-flex/releases/download/3.200/roboto-flex-fonts.zip), independently of Motion Reference. Direct binary `fvar` parsing observed `wght` 100–1000 (default 400), `wdth` 25–151 (default 100), `slnt` −10–0 (default 0). This is actual font capability, not a CSS transform or stroke simulation. `fontSynthesis` is disabled.

| Mode | Required axis | Mechanism |
| --- | --- | --- |
| `pulse`, `breathe` | `wght` | Asymmetric pulse versus smooth breath envelope |
| `thinbold`, `wave` | `wght` | Per-grapheme lock-in versus propagating periodic weight |
| `pressure`, `proximity` | `wght` | Squared pressure-modulated field versus linear proximity field |
| `slant` | `slnt` | Real negative-slant axis swing |
| `width` | `wdth` | Sequential real glyph-width expansion |
| `velocity` | `wdth-slnt` | Width and slant from authored scrub/wheel magnitude |

Every mode requires explicit `axis`, `low`, `high`; ranges are validated against the actual axis limits and the mode/axis pairing is checked. The Latin capability line `Motion · Axis` is always present, including when editable input contains only CJK. CJK text stays readable through the system font stack; the study does **not** claim Chinese/Japanese variable-font glyph coverage, and does not fake it with scaling/stroke. Preserve local font/license/provenance together when adapting.

The study reports local font loading through `data-font-state` and an explicit visible error if unavailable. Await document font loading before inspecting real axis geometry. Publisher metadata lists Latin, Cyrillic and Greek families of coverage; it does not justify arbitrary CJK glyph claims. Product brand fonts override this teaching asset only after their supported axes, glyph coverage and redistribution rights are established.

## 字形、墨迹、空间与物理 / Glyph, Ink, Depth and Physics

This section covers the 72 exact catalogue identities in `tx-depth` (10), `tx-emphasis` (14), `tx-exit` (9), `tx-loop` (8), `tx-physics` (12), and `tx-reveal` (19). Its 64 descriptors are implemented in `tools/motion-recipes/full/text-glyph.js`; each short name below has the prefix `text.glyph-`. Exact variant parameters and source attribution live in the canonical catalogue. Parameters and teaching timelines are original project choices, not recovered upstream values.

**Discovery:** 字素/grapheme、逐词/word、遮显/mask、衰减场/falloff、折面/hinge、描边/stroke、重力/gravity、耦合弹簧/coupled spring. Use exact source IDs through the existing catalogue and gallery. The mappings preserve ten legacy `textItem:false` identities, including `line-by-line`, five `ty-*` entries, and four `catalog-kinetic-type-*` entries; category membership does not make them text-engine items.

### Reveal / 显现 — 19 identities, 14 descriptors

| Descriptor | Actual channel and controls |
| --- | --- |
| `rise` | DOM token opacity and Y translation; required `unit:char | word`,`distance:8–100`,`spread:0–0.85`.`tx-fade-up-chars` uses graphemes; `tx-fade-up-words` moves whole segmented words. |
| `line-reveal` | Line transforms plus directional clip paths; `direction:up | alternate`,`distance:12–160`,`spread`. Legacy`line-by-line` reveals vertically; `tx-alternating-line-direction` alternates left/right translation and side clipping. |
| `ordered-reveal` | Grapheme opacity ranked by logical index distance or seeded shuffle; `order:center | random`,`spread`. These are actual ranking branches, not different labels on one fixed stagger. |
| `elastic-pop` | Grapheme elastic scale and quick opacity; `oscillations:0.5–3`, `spread`. `tx-scale-pop-in` and `tx-emoji-grapheme-pop` share safe grapheme nodes; the latter needs caller-supplied emoji text to expose combined-emoji preservation. |
| `vertical-unfold` | Grapheme `scaleY` with one overshoot envelope; `overshoot:0–0.4`, `spread`. |
| `gather` | Measured/frozen grapheme positions; `distribution:spread | scatter`,`distance:20–240`,`spread`. Spread expands horizontally relative to layout center; scatter adds seeded two-dimensional offsets and rotations. |
| `random-pose-in` | Seeded initial tilt plus scale/opacity recovery; `rotation:5–100`, `initialScale:0.1–0.8`, `spread`. |
| `soft-range-reveal` | A moving logical-index selector uses smooth edge weights for opacity and lift; `softness:0.5–8`, `lift:0–50`. |
| `masked-descent` | Fixed overflow-hidden token windows with moving inner glyph faces; `distance:12–100`, `spread`. |
| `smear-in` | Moving glyph plus a separate stretched/skewed transient duplicate; `distance:20–160`, `stretch:1.2–5`, `spread`. This is an authored smear layer, not physical motion-blur sampling. |
| `stretch-rise` | Y translation/opacity combined with mid-phase vertical stretch; `distance:10–100`, `stretch:1.1–2.8`, `spread`. |
| `tracking-expand` | Measured glyph-center offsets expand compressed horizontal spacing; `compression:0.1–0.8`, `spread`. No glyph-scale substitution. |
| `word-ghost` | Word opacity/blur recovery and an independently offset fading duplicate; `offset:4–36`, `spread`. Maps legacy `ty-ghost`. |
| `kinetic-word-lines` | Three speed lines attached to one nonempty word, pulse-scaled with a short X accent; `targetRatio:0–1`, `length:12–90`. Maps legacy `ty-kinetic`; the study does not identify verbs. |

`char` means an `Intl.Segmenter` grapheme, not a UTF-16 code unit; `word` uses language segmentation, including CJK. `line` uses explicit newlines, or sentence segments if no newline exists—not the browser's automatic wrapping rows. A center/falloff selection is logical token order, not a geometric two-dimensional selection. Use a multiline sample for alternate lines and a deliberate combined-emoji sample for grapheme inspection.

### Depth / 空间 — 10 identities, 9 descriptors

All depth studies use CSS perspective, `preserve-3d`, and actual axes/layers. They are not mesh extrusion or fake font axes.

| Descriptor | Actual channel and controls |
| --- | --- |
| `hinge-3d` | `hinge:bottom | left`,`angle:60–110`,`spread`; bottom uses X rotation around the bottom edge (`tx-flip-up-3d`), left uses Y rotation around the left edge (`tx-swing-door`). Both hide backfaces. |
| `tumble-3d` | Three-axis rotation plus Y and negative-Z entrance; `distance:30–240`, integer `turns:1–3`, `spread`. |
| `depth-flight` | Negative-Z elastic arrival, with size changes from perspective rather than scale; `depth:100–900`, `spread`. |
| `paper-fold` | Measured line content copied into alternating clipped Y-hinged panels; integer `panels:2–6`, `spread`. |
| `roll-cube` | Two actual text faces, front and top, connected by a 90-degree X roll; `depth:10–60`, `spread`. Source `tx-roll-flip-hover` is a timeline study here, not an installed hover handler. |
| `cylinder` | Grapheme faces arranged around a Y-axis cylinder and rotated as a group; `radius:60–220`, integer `turns:1–3`. |
| `layered-depth` | Whole-text copies separated in Z while the group tilts; integer `layers:2–8`, `spacing:4–40`, `tilt:5–35`. |
| `depth-falloff` | Moving index field produces simultaneous Z displacement and X tilt; `radius:1–8`, `depth:20–160`, `angle:5–65`. Adapts `tx-motext-falloff`, not a MoText plugin. |
| `type-tunnel` | Repeating full-text frames cycle through negative-Z depth, slight Z rotation and depth-dependent opacity; integer `layers:3–9`, `depth:250–1600`, integer `turns:1–3`. Maps the legacy type-tunnel concept. |

### Emphasis / 强调 — 14 identities, 14 descriptors

| Descriptor | Actual channel and controls |
| --- | --- |
| `marker` | Background strip sweeps behind stationary whole text; `coverage:0.25–0.75` em. |
| `underline` | Original SVG curved underline draws via normalized path dash offset; `thickness:1–6`. |
| `scribble-circle` | One or two distinct SVG circle-like paths around a selected word; `targetRatio`, integer `turns:1–2`. |
| `pointer-box` | SVG box stroke draws while an ornamental cursor travels its four edges; `padding:2–12`. No native pointer control or live selection. |
| `strike-correct` | A selected-word line grows during 0–45%; an explicit correction annotation appears during 35–100%; `targetRatio`, required nonblank `correction` string of at most 80 characters. Root accessible text includes the correction. This does not mutate business copy or perform proofreading. |
| `keyword-punch` | Selected word retains accent color and receives one scale pulse; `targetRatio`, `scale:1.1–1.8`. |
| `focus-explosion` | Frozen word layout; target scales while neighbors move with distance attenuation and row offsets; `targetRatio`, `distance:8–100`, `scale:1.1–1.6`. Maps the legacy focus-word-explosion concept. |
| `bump-wave` | Cubic falloff field lifts and slightly enlarges nearby graphemes; `radius:1–7`, `height:8–50`. |
| `attention-bounce` | Selected word follows one to three decreasing parabolic hops; `targetRatio`, `height:8–70`, integer `bounces:1–3`. |
| `comic-pop` | Whole-text entrance/pop, tilt and radial accent strokes; `scale:1.1–1.8`, `tilt:2–15`, integer `rays:6–16`. |
| `rubber-band` | Grapheme scaleX and reciprocal scaleY with damped oscillation/skew; `stretch:0.1–0.6`, `spread`. |
| `elastic-whole` | The same area-preserving deformation applied to one whole-text node; `stretch:0.1–0.6`. Legacy `ty-elastic` retains its whole-text distinction from per-character jelly. |
| `slam` | Whole text enters from positive Z during 0–35%, then contact squash decays and a ring expands/fades; `depth:80–350`, `squash:0.05–0.3`. Maps legacy `ty-slam`. |
| `jitter` | Smooth interpolation between seeded noise samples for XY displacement and tilt, with a zero-ended amplitude envelope; `amplitude:0.5–8`, integer `frequency:4–32`. Frequency counts subdivisions of this study, not a measured source frame rate. |

`targetRatio` selects among nonempty segmented words (0 first, 1 last); it is not automatic keyword/verb detection. The source `phrase` items—marker, underline and pointer box—operate on the whole string supplied as the desired short phrase. Product code must supply the actual range/target and authoritative correction. Ornament and duplicate text remain presentation-only.

### Exit / 退场 — 9 identities, 8 descriptors

| Descriptor | Actual channel and controls |
| --- | --- |
| `direction-exit` | Grapheme translation and opacity with quadratic local phase; `direction:up | down`,`distance:16–120`,`spread`. Up and down are separate signed-Y branches. |
| `evaporate-exit` | Word lift, slight enlargement, blur and opacity; `distance:8–80`, `blur:2–18`, `spread`. |
| `center-collapse-exit` | Measured graphemes move to the two-dimensional layout center while scaling away; `spread`. |
| `scatter-exit` | Seeded radial directions, ballistic downward contribution, spin and opacity; `distance:50–300`, `spin:20–270`, `spread`. |
| `gravity-exit` | Quadratic gravity drop with seeded horizontal velocity/spin and opacity; `gravity:100–600`, `spin:0–180`, `spread`. |
| `noise-dissolve` | Real rasterized text cleared by seeded grid thresholds; integer `cellSize:2–18` pixels. This is not a whole-layer fade. |
| `reverse-erase` | Reverse token ranking with increasing per-token left clipping; `spread`. |
| `scale-vanish` | Grapheme scale/opacity decreases by quadratic local phase; `spread`. |

Normal exit endpoints are visually empty, but reduced-motion studies retain readable original text. That is a study convention, not authority to retain a removed item: production code performs its logical hide/removal immediately without motion, preserves focus and announcements, and cancels presentation when state changes.

### Loop / 有界周期 — 8 identities, 8 descriptors

| Descriptor | Actual channel and controls |
| --- | --- |
| `wave-loop` | Grapheme Y sine wave with index-dependent phase; `amplitude:3–28`, integer `cycles:1–4`. |
| `hanging-sway` | Whole board and two hanging cords rotate around the top anchor; `angle:2–16`, `length:20–90`, integer `cycles:1–3`. |
| `marquee` | Measured text-plus-gap width, enough repeated copies for coverage, modulo horizontal travel; integer `cycles:1–3`, `gap:20–100`. |
| `sequential-hop` | A moving local field makes graphemes hop in sequence; `height:5–40`, integer `cycles:1–4`. |
| `loading-dots` | Stable whole text plus separate decorative dot nodes with phase-shifted lift/opacity; integer `dots:2–5`, integer `cycles:1–4`. The source char unit is adapted to decoration, not animated business text. |
| `scale-breathe` | Grapheme scales with independently seeded phases; `amount:0.02–0.18`, integer `cycles:1–4`. |
| `sparkles` | Stable text with seeded SVG stars and soft scale/opacity modulation; integer `count:3–16`, integer `cycles:1–3`. |
| `y-spin-loop` | Grapheme Y-axis full rotation, hidden backfaces and index phase offset; integer `turns:1–3`, `spread`. Here spread controls angular phase offset, not delayed onset. |

Source labels such as “Infinite Marquee” describe inspiration, not permission for an uncontrolled loop. Studies are bounded; the gallery/caller owns repeat, pause, visibility handling and cancellation. Default to no repetition for reading content, reduced motion, offscreen elements and routine status. A loading animation neither starts work nor determines whether work completed; use the real operation state, a semantic busy indicator and a stable label.

### Physics / 物理 — 12 identities, 11 descriptors

| Descriptor | Actual channel and controls |
| --- | --- |
| `floor-bounce` | Quadratic fall followed by three decreasing parabolic bounces; `height:30–220`, `restitution:0.15–0.85`, `squash:0–0.4`, `spread`. `tx-drop-bounce-in` sets squash to zero; `tx-squash-landing` enables contact-driven width increase and height decrease with equal deformation magnitude. |
| `falling-pile` | Four seconds of bounded word-body gravity, floor/wall restitution and pair overlap/impulse resolution, precomputed at creation; `gravity:150–900`, `restitution:0.05–0.65`, `spin:0–35`. Collision bounds are axis-aligned despite decorative rotation. |
| `pair-collision` | Three seconds of neighboring same-row pair approach, target spring and momentum exchange; `approach:10–80`, `restitution:0.1–0.85`. Maps legacy letter-collision; no arbitrary cross-row collision claim. |
| `pendulum` | Graphemes follow fixed-length arcs; SVG cord endpoints move with them; `angle:8–55`, `length:25–110`, `damping:0.2–4`, integer `cycles:1–4`. |
| `spring-chain` | Three seconds of precomputed neighboring spring coupling, damping and a short lead drive; `stiffness:30–180`, `damping:4–24`, `drive:10–70`. This propagates state, unlike independent delayed sine waves. |
| `magnet-assembly` | Seeded spatial/rotational offsets decay using the analytic under/critical/overdamped spring solution; `radius:40–220`, `stiffness:40–260`, `damping:3–22`. Maps legacy character-magnetize. |
| `particle-assembly` | Canvas text alpha pixels supply real glyph targets; particles spring inward, then the clear raster replaces them at 98%; integer `spacing:2–8`, `scatter:30–260`, `size:0.7–3`. |
| `domino` | Measured glyph width/height estimates contact angle and cumulative propagation onset; `angle:65–88`, `hold:0–0.25`. This is a contact-timed construction, not a rigid-body engine. |
| `rain` | Seeded random rank and initial height, quadratic drops with small horizontal recovery; `height:40–240`, `spread`. |
| `zero-gravity` | Seeded XY drift/rotation with a zero-ended envelope; `distance:5–65`, `turns:0.05–0.5`. No gravity or collisions. |
| `inertia` | Exponentially damped horizontal sine motion plus displacement-related tilt; `distance:10–100`, `damping:1–8`, integer `cycles:1–4`, `spread`. Maps legacy `ty-inertia`, not the coupled chain. |

### Timeline, semantic ownership and adaptation

- All listed fields are required. Schemas are closed: unknown, missing, out-of-range or inapplicable parameters throw rather than selecting a fallback. `spread` is 0–0.85 throughout; `targetRatio` is 0–1. Angles use degrees; geometric values are authored CSS pixels unless noted. Teaching timelines in the records range from 1000 to 6000 ms and are separate from every attributed source duration/easing. Current DESIGN/MOTION and existing tokens override study colors, spacing, amplitude and operational timing.
- Most entrances progress from displaced/hidden presentation to readable rest; exits do the reverse; emphasis is a finite attack/recovery; loops contain explicit bounded cycles. Coupled physics samples immutable precomputed frames, while analytic paths, ink dashes, noise thresholds and particle state derive directly from progress. No private playback loop or frame-order integration is started. Call `seek` after creation; finite [0,1] cold and reverse progress are the intended contract, not exercised evidence from this recovery.
- `text-core.js` creates a labeled presentation root; token and duplicate layers are hidden from assistive technology. Keep authoritative selectable DOM text, language, focus, live-region announcements and actual control semantics in the host. This study is an image-like presentation, not a drop-in editable/readable-text component. Do not announce every grapheme or every loading-dot frame.
- Reduced motion resolves to readable static content without travel, shake, repetition or decorative stars/particles. Marker, underline, circle, box and correction may show the final meaningful annotation; pointer travel disappears. Accent color can remain. Native pointer/keyboard/hover and actual loading, content, correction and removal states are host-owned; none are inferred from the study timeline. Interrupted content/state supersedes the old study. Dispose before switching variants; the lifecycle removes its root, listeners and diagnostic recipe marker.
- Frozen layout, paper panels, collision bodies and marquees require a visible measurable stage and settled fonts. Recreate after meaningful width/font/text changes. Canvas glyphs additionally require Canvas 2D, resolved font metrics and pixel-read support; use real licensed local/system fonts. Large word piles have pairwise collision work, and dense particles scale with glyph pixels: these are bounded short-text studies, not unbounded document layouts. CSS 3D/backface appearance, system fonts, ligatures and inline segmentation vary by platform; splitting graphemes may disrupt contextual shaping. Use a shaped run/renderer when the language requires it.
- For web/UI, adapt the smallest needed CSS/DOM/SVG/Canvas channel to existing semantic primitives. For film/edit, translate axes, panels, masks, strokes, particle targets and fixed sample trajectories into the established renderer/frame timeline; browser pixels do not prove the exported result, real 3D geometry or motion-blur fidelity. Scale geometry and timeline intentionally rather than importing sample duration as a functional UI budget.
- Provenance is catalogue metadata only: source effect/unit/concept or legacy pattern is traced in every record's rationale. No upstream prose, code, font, image or asset was copied; upstream redistribution remains `unverified`. No source-wide visual fidelity, runtime conformance or owner Visual Acceptance is claimed. Integration acceptance separates exact membership/schema validation, branch mount/seek/reverse/reduced/disposal evidence and representative playback review.

## Text media: blur, light, masks, glitch and path / 文字媒体

### Explicit descriptors and author controls

All IDs below have prefix `text.`. Every configuration includes its closed-schema `unit`; unsupported or omitted fields are errors. Values in the authored configurations are original study choices, not upstream implementation parameters. `spread` distributes per-segment starts over the normalised timeline and must leave a positive completion interval. Browser text remains native text; Canvas studies keep a semantic label and visible caption.

| Descriptor | Unit | Actual channel / mechanism | Required controls (supported bounds) |
| --- | --- | --- | --- |
| blur-in-3step | word | CSS blur/opacity with three focus phases | blurPx 1–32, spread 0–0.8 |
| blur-in-chars | char | Ordered grapheme blur reveal | blurPx 1–32, spread 0–0.8 |
| blur-random-in | char | Seed-ranked grapheme focus order | blurPx 1–32, spread 0–0.8 |
| text-generate | word | Smoothstep clarity plus early opacity build | blurPx 1–32, spread 0–0.8 |
| directional-blur-slide | whole | SVG anisotropic Gaussian blur plus horizontal translation | blurPx 1–32, distancePx 8–120 |
| scale-blur-zoom | whole | CSS blur, opacity and authored starting scale | blurPx 1–32, startScale 0.65–1.4 |
| tracking-blur-build | char | Shrinking inline margins plus blur and opacity | blurPx 1–28, trackingEm 0.05–0.8, spread 0–0.65 |
| rack-focus | line | Line-plane focus transfer; one line is duplicated as a second plane | blurPx 2–22 |
| true-focus | word | Focus border on non-whitespace words, then full-text clarity | blurPx 2–20, focusSpan 0.15–0.8 |
| aurora-text | whole | Moving layered radial-gradient fill clipped to text | turns 0.2–2, intensity 0.3–1 |
| blend-overlap | char | Isolated screen-blended coloured duplicates and temporary overlap | shiftPx 2–22, overlapEm 0.02–0.25 |
| color-band-sweep | char | HSL band moving across glyph indices | bandWidth 1–8, hue 0–360 |
| conic-spin | whole | Rotating conic gradient clipped to text | turns 0.2–3 |
| gradient-flow | whole | Translation of a 300%-wide linear gradient | travelPercent 40–240 |
| glow-pulse | whole | Bounded text-shadow intensity pulse | glowPx 2–36, pulses integer 1–3 |
| hue-cycle | char | Continuous per-grapheme hue rotation and spatial hue spread | turns 0.25–2, hueSpread 20–300 |
| line-shadow | whole | Native stroked text echoes orbiting at increasing offsets | offsetPx 2–24, lineCount integer 2–8 |
| long-shadow-grow | whole | Layered zero-blur shadows grow along a fixed vector | lengthPx 4–56, directionDeg 10–80 |
| neon-flicker | char | Seeded stepped ignition before stable glow | glowPx 4–32, flickers integer 2–6 |
| random-color-pop | char | Seeded discrete palette steps | steps integer 2–8, saturation 40–85 |
| shiny-sweep | whole | Narrow specular gradient traverses glyph fill | bandPercent 4–30 |
| bar-wipe-reveal | line | Inset clip plus moving leading bar | barPx 4–24, spread 0–0.7 |
| blinds-reveal | whole | Duplicate layers exposed through opening horizontal slats | slats integer 3–12 |
| char-mask-rise | char | Vertical translation inside grapheme clipping wrappers | distanceEm 0.5–2, spread 0–0.8 |
| line-mask-rise | line | Vertical translation inside line clipping wrappers | distanceEm 0.5–2, spread 0–0.8 |
| slide-x-mask | char | Horizontal translation inside grapheme clipping wrappers | distanceEm 1–3, spread 0–0.8 |
| diagonal-cut-reveal | word | Slanted polygon edge travels across each word | slopePercent 4–28, spread 0–0.75 |
| iris-reveal | whole | Expanding circular aperture | originXPct 20–80, originYPct 20–80 |
| outline-fill-sweep | whole | Native CSS text stroke plus inset-clipped fill layer | strokePx 0.6–2 |
| shape-mask-cut | whole | Cubically expanding regular polygon aperture | corners integer 3–8 |
| soft-mask-wipe | whole | Gradient alpha mask with feathered edge | featherPercent 8–40 |
| split-halves | word | Oppositely translated top/bottom clipped duplicates | distanceEm 0.3–2, spread 0–0.75 |
| texture-fill | whole | Original procedural woven gradient texture | texture exactly woven, travelPx 20–120 |
| ascii-render | whole | Canvas glyph alpha coverage mapped to ASCII cells, then original raster crossfade | cellPx integer 6–16, resolveStart 0.55–0.85 |
| pixel-mosaic | whole | Precomputed coverage grids, coarse-to-fine stepped reconstruction | coarsePx integer 18–48, steps integer 3–8 |
| fuzzy-text | whole | Seeded one-pixel row displacement | jitterPx 1–12, frames integer 8–40 |
| slice-glitch | whole | Seeded multirow band displacement | slices integer 4–14, shiftPx 4–50, frames integer 4–16 |
| rgb-split-glitch | whole | Canvas source-in RGB masks additively composited with screen | splitPx 2–24, frames integer 3–12 |
| vhs-scanline | whole | Dark raster scanlines plus travelling displaced tracking band and seeded noise | spacingPx integer 3–8, trackingPx 3–22 |
| turbulence-wobble | whole | SVG fractalNoise drives SourceGraphic displacement | displacementPx 2–18, frequency 0.015–0.09 |
| melt-drip | char | Glyph-bottom alpha samples grow raster extensions and liquid tips | depthPx 24–90, dripsPerGlyph integer 2–5 |
| text-along-path | char | Native SVG textPath advances on an authored cubic curve | travelPercent 10–65 |
| circular-text-spin | char | Paired textPaths circulate around a closed circle | radiusPx 80–150, turns 0.1–2 |
| curved-loop-marquee | line | Paired textPaths follow an authored closed curved lane per line | cycles integer 1–3, amplitudePx 20–70 |
| shape-contour-text | char | Paired textPaths circulate along an original heart contour | contour exactly heart, travelTurns 0.1–2 |
| spiral-text | char | Native textPath on an authored arithmetic spiral | turns 1.2–3, startRadiusPx 24–60, travelPercent 5–40 |
| morphing-path-ride | line | Cubic path control points morph while text offset advances | bendPx 20–90, travelPercent 5–30 |
| path-inertia | char | Independently positioned native SVG graphemes follow path tangents with analytic damped tracking | trackingEm 0.1–0.9, damping 3–10, overshootPx 12–80 |
| outline-draw | char | Canvas alpha-cell boundaries become SVG dashed paths; final native text fill | spread 0–0.75, strokePx 0.6–2 |
| handwriting | char | Original serpentine SVG pen mask reveals native glyphs; terminal full mask ensures readability | spread 0–0.75, penWidthPx 10–40 |

### Phases, authority and readability

The gallery owns the clock, text, seed and reduced-motion option. Create allocates the study once; `seek` derives state from finite progress in [0,1], including cold/reverse seeks, without starting a private loop. Dispose releases the scene and owned Canvas resources. `Intl.Segmenter` provides grapheme/word boundaries; lines use explicit newlines or punctuation segmentation. Do not split Unicode code units or treat words as necessarily space-delimited CJK tokens.

Blur entrances end clear. Three-stage focus changes at local progress 0.30 and 0.68; generation uses smoothstep clarity. True-focus removes residual blur during the last 15%; rack-focus intentionally leaves non-target planes blurred in normal motion, rather than pretending all text is readable. Masks end fully open; bar heads disappear at the endpoints. Blend overlap and bounded slice/fuzzy/RGB/turbulence envelopes return to undeformed text. ASCII starts its raster crossfade at `resolveStart`; mosaic finishes with the native-font raster. Neon stabilises at progress 0.58. Outline trace adds fill over the last 16% per glyph, and handwriting's full mask grows over the last 10%. Melt ends in a drip extension; VHS ends with persistent scanlines; continuous fills/path lanes express decorative motion, not completed application state.

Reduced motion selects a clear terminal entrance/mask state, removes blur focus isolation, translational overlap, glitch displacement, drips, flashing and repeated glow variation, and uses a static fill or bounded shadow. Path, boundary-trace and pen-mask SVGs are hidden in favour of the visible plain-text caption. The reduced state is deliberately not a slowed version. Do not loop neon/glitch or use them for essential UI status; use an unanimated text state whenever contrast, focus or comprehension is at risk. Film/edit contexts may schedule decorative bounded studies; web/UI variants must remain optional and subordinate to semantic text and user preferences.

Trigger entrance studies once at reveal/selection. Decorative studies have only the bounded count in their explicit parameters; do not extrapolate catalogue `loopDurationMs` into an infinite operational loop. Author the final project budget from current DESIGN/MOTION tokens; authored `studyDurationMs` is an original teaching timeline, not copied source duration or a product default. For real UI, application state, native focus, selection, keyboard navigation and document text are authoritative; presentation must never delay their update. Interruption/cancellation disposes the old instance or seeks an authoritative static state; reverse inspection does not imply reversing user actions.

### Font, trace, media and platform constraints

`outline-draw` does **not** import a font outline or font parser: it thresholds locally rasterised glyph alpha, extracts oriented pixel-cell boundary loops (including holes/disconnected components), and writes SVG dash progress. It is a coarse raster-derived boundary trace, not true Bézier font geometry or linguistic stroke order. Production vector typography requires a separately licensed outline source and an explicit renderer adaptation. `outline-fill-sweep` uses native CSS text stroke, not the boundary extractor.

`handwriting` uses an original serpentine coverage path per measured glyph, with a terminal full-mask reveal. It is pen-like wipe choreography, **not** real handwriting, CJK stroke order or a recovered font-writing path. Actual handwriting needs separately authored/licensed stroke trajectories; never claim the study supplies them.

`texture-fill` supports **only** `texture: woven`, made from original CSS gradients. The catalogue label mentions video, but this mapping deliberately studies a real procedural texture-fill branch; it does not decode, import or play video and does not accept a media URL. Production video-in-text needs separately authorised/licensed media, native playback lifecycle and reduced/static poster ownership in the target renderer. This record does not claim video coverage.

Canvas raster mechanisms measure and draw installed system fonts locally; no external font, source asset or network request is needed. Installed glyph coverage, shaping differences, resolution and text length affect appearance. SVG textPath may compress long text with native `textLength`/`spacingAndGlyphs` to fit at most 55% of its guide length; captions retain the full uncompressed content. Path-inertia places grapheme nodes and is not an OpenType shaping or physical-simulation engine. Native SVG tangent/path geometry, CSS mask/clip/background-text support, Canvas 2D/pixel access and browser compositing are real prerequisites, not silent fallback branches.

For web/UI, retain DOM semantic text and use native CSS/SVG/Canvas capabilities with accessibility/contrast review. For film/edit, recreate the named masks, gradient/composite channels, paths or raster operations in the renderer's native layer system and explicitly validate font/layout/timing; descriptor availability is not proof of an AE/Blender/NLE adapter. These studies use no variable-font-axis simulation.

## 语义文字、字幕、数值与标题 / Semantic text, captions, numbers and titles

本节覆盖 tx-caption 13、tx-counter 9、tx-broadcast 12、tx-japanese 14、tx-title 13：共 61 个原始身份，各对应现有 text-semantic.js 的一个专用 descriptor。保留三个 Atlas 项 catalog-kinetic-type-echo-caption、catalog-kinetic-type-headline-ribbon、catalog-kinetic-type-mono-data-shuffle 的 textItem=false；其余 58 项为 textItem=true。来源类别、effectId/unit 或 catalogConcept 是机制归因，不是对源站画面逐项复刻的证据。

### 调用、参数与时间 / Calling, controls and phases

- 本地入口：tools/motion-recipes/full/index.html#motion=<原始 ID>；指南路径为 references/motion-recipes/families/text.md。每项的 recipeId 为下表的 text.<descriptor>，variantId 仍为源 ID。经典脚本需先加载 text-core.js，再加载 text-semantic.js，并由现有 text.js 集成；不引入另一套运行器。
- 每个配置必须列出全部 schema 字段，不允许缺字段、未知字段、未知枚举或无关参数。下面列的是原创支持值示例，不是源站参数转录。durationMs/motionDurationMs/loopDurationMs/easing 只属于来源观察；studyDurationMs 是下表的有界教学轴，不是生产动效预算。
- 将 seek 的 [0,1] 映射到教学轴秒数。revealEnd/settleEnd 指完成点；cueAt/cutAt/updateAt/impactAt 为起点；impactEnd/textEnd/plateEnd/barEnd 为结束点；transition、impactDuration、emphasisDuration、frameFraction 是整轴占比。fadeFraction、travelFraction、transitionFraction、pulseFraction、leadFraction、burstFraction 是相应 cue/局部步的占比；spread/entrySpread/digitSpread 决定 token 的起点分布，不是毫秒。
- caption-spring 的 seconds 只用于弹簧求解，与整轴 studyDurationMs 不同。charactersPerSecond、minimumSeconds、gapSeconds 建立相对字幕阅读预算；日语预算显示的总秒数可能比教学轴长，不能拿压缩后的预览长度当阅读标准。stopWeight/commaWeight 是标点显示后占用的相对时权重。
- Px 字段是 CSS 像素（SVG 组件内部采用自身 viewBox 坐标）；Em 字段是原生排版字距/行距；Percent 字段是指定局部容器百分比。steps/frames/swaps 表示有界时间量化，不创建独立时钟；seed 来自 create options，使任意冷寻址/逆向寻址的扰动确定。
- 数值起终点 from/to、value、start、decimals 直接控制作者数值；它们不改变用户输入正文。numeric-count 允许 0–999999 且 decimals 为 0–2；odometer/score/seven-segment 的起终点及 scramble 的 value 为 0–999999 安全整数；price 为 0–99999 且两位小数；ring 为 0–100 且零位小数；countdown 的 start 为 2–9 整数。要扩展 schema，先改真实机制，而不是让数据悄悄带入新分支。
- 字体、颜色、几何强度和教学节奏均为原作示范，不是新 design tokens。当前 DESIGN.md、MOTION.md、目标字号、可读性和已有动效 primitive 优先。

### 字幕 / Captions

叠层回声、物理弹簧、句窗淡变、实测词框胶囊、词强调、词内染色、临时提交、累积显词、边界分行、整句硬切、双行滚入、中心词呈现和当前词着色是独立 descriptor，不是一个通用入场的标签。

| 原始 ID → descriptor（均以 text. 为前缀） | 完整原创配置；教学轴 | 实际机制 |
| --- | --- | --- |
| `catalog-kinetic-type-echo-caption` → `caption-echo` | `{"echoes":3,"distance":18,"delay":0.09,"revealEnd":0.72}`；3.6 s | 以多层发光副本的延迟位移和衰减透明度形成字幕回声，主文本在揭示窗内落稳。 |
| `tx-caption-spring-pop` → `caption-spring` | `{"stiffness":145,"damping":14,"mass":1,"seconds":1.05,"spread":0.42}`；4.4 s | 完整词元按相位错开，通过质量、刚度与阻尼计算位移及缩放回弹。 |
| `tx-forced-narrative-fade` → `caption-cue-fade` | `{"fadeFraction":0.12,"screenPosition":"bottom"}`；5.6 s | 标点或换行形成整句 cue，按字素长度分配时间窗，各句在窗边淡入淡出。 |
| `tx-highlight-pill` → `caption-pill` | `{"travelFraction":0.38,"paddingPx":6,"palette":"blue"}`；5.2 s | 胶囊读取实际词元的宽高及位置，在当前词与前词之间插值移动并改变宽度。 |
| `tx-hormozi-caption` → `caption-word-pop` | `{"popScale":1.18,"emphasis":"amber","revealEnd":0.8}`；5.0 s | 粗体带阴影词元逐个出现，当前词以颜色和过冲缩放强调，已出现的词保持可读。 |
| `tx-karaoke-fill` → `caption-karaoke` | `{"fillColor":"amber","timing":"grapheme-weighted"}`；6.2 s | 全文底层保持可读，每个词的重叠色层按字素权重的局部进度连续横向染色。 |
| `tx-live-caption-block` → `caption-live-block` | `{"lineCapacity":20,"rows":2,"commitLag":2}`；6.4 s | 字素逐步进入双行字幕块，末尾若干字用点线与颜色标记临时假设，末端全部提交。 |
| `tx-paint-on-caption` → `caption-paint-on` | `{"revealEnd":0.72,"unit":"word"}`；5.0 s | 词元按离散揭示数量逐步累积，已揭示部分不退出，空白布局始终保留。 |
| `tx-phrase-line-break` → `caption-phrase-wrap` | `{"boundaries":"punctuation-or-newline","spread":0.42,"lineGapEm":0.3}`；5.0 s | 显式换行或句末标点形成不同文本行，每行以独立遮罩相位依次展开。 |
| `tx-pop-on-subtitle` → `caption-pop-on` | `{"timing":"grapheme-weighted","cuePlate":"black"}`；6.0 s | 整句黑底字幕按字素权重分配 cue，只有当前句窗可见，切换无移动。 |
| `tx-roll-up-caption` → `caption-roll-up` | `{"lineCapacity":18,"rows":2,"transitionFraction":0.28}`；6.2 s | 容量分行的字幕条随新行逐步上移，裁切窗保留两行，尚未到达的行不可见。 |
| `tx-rsvp-flash` → `caption-rsvp` | `{"timing":"grapheme-weighted","focusMark":"center"}`；6.2 s | 非空词元按长度权重逐个在中心呈现，固定焦点标记辅助定位。 |
| `tx-word-highlight-caption` → `caption-word-highlight` | `{"color":"amber","timing":"grapheme-weighted"}`；6.0 s | 全文保持可读，仅按字素权重选择当前语词并改变其颜色。 |

### 数字 / Numeric representations

数据洗牌重排正文字素位置；其余八个 descriptor 使用作者明确数值，不从可编辑正文解析数字。插值、倒数、随机锁位、进位滚轮、百分比环、变更位更新、七段多边形与价格方向各有独立表示。

| 原始 ID → descriptor（均以 text. 为前缀） | 完整原创配置；教学轴 | 实际机制 |
| --- | --- | --- |
| `catalog-kinetic-type-mono-data-shuffle` → `data-permutation` | `{"swaps":12,"settleEnd":0.74,"spreadPx":16}`；3.2 s | 按种子与时间步重排完整字素的视觉位置，等宽字列伴随衰减竖向扰动后恢复原序。 |
| `tx-count-up` → `numeric-count` | `{"from":0,"to":12840,"decimals":0,"revealEnd":0.76,"easing":"exponential-out"}`；3.0 s | 显式起终数值经指数减速插值并定精度显示，等宽数字避免宽度跳动。 |
| `tx-countdown-zoom` → `numeric-countdown` | `{"start":5,"zoom":1.28,"pulseFraction":0.4}`；5.0 s | 时间轴划分为整数步，当前倒计时数字在每步起点缩放后落稳，末端显示零。 |
| `tx-number-scramble` → `numeric-scramble` | `{"value":48276,"steps":16,"settleEnd":0.76,"digitSpread":0.36}`；3.2 s | 数字位按种子生成离散随机值并依次锁定到显式最终数字，位间锁定相位可调。 |
| `tx-odometer-roll` → `numeric-odometer` | `{"from":98,"to":126,"revealEnd":0.78,"carryWindow":0.18}`；4.2 s | 各十进制位的双周期数字条竖向滚动，高位仅在进位窗口内跨到下一数字。 |
| `tx-progress-percent` → `numeric-ring` | `{"from":0,"to":87,"revealEnd":0.8,"decimals":0}`；3.2 s | 同一个插值百分比同时驱动数字和 SVG 圆环的描边缺口，保证两者对应。 |
| `tx-score-update` → `numeric-score` | `{"from":1240,"to":1285,"updateAt":0.26,"transition":0.22,"deltaTravelPx":24}`；3.4 s | 只有发生变化的数字位在旧新双层间竖向切换，增量标注独立上浮后消退。 |
| `tx-seven-segment` → `numeric-seven-segment` | `{"from":8,"to":2048,"steps":12,"color":"mint"}`；4.0 s | SVG 七段多边形按每个数字的位掩码点亮，显式起终值在离散时间步更新。 |
| `tx-ticker-flash` → `numeric-price` | `{"from":102.35,"to":101.8,"decimals":2,"updateAt":0.3,"emphasisDuration":0.24}`；3.4 s | 价格在切点换为显式新值，方向箭头及差值同时更新，底色只进行一次低幅强调。 |

### 广播字幕 / Broadcast compositing

底板、主文、原生字形描边、SVG 星芒与 Canvas 点阵拥有不同视觉通道。平面职员滚屏、单轨信息爬行及话者轮次与标题的透视爬行、多轨弹幕不能混同。

| 原始 ID → descriptor（均以 text. 为前缀） | 完整原创配置；教学轴 | 实际机制 |
| --- | --- | --- |
| `tx-breaking-banner` → `broadcast-breaking` | `{"revealEnd":0.42,"textDelay":0.16,"accent":"red"}`；3.0 s | 红色双边底带先由横向裁切窗展开，整句文字延迟进入自己的揭示窗。 |
| `tx-credits-roll` → `broadcast-credits` | `{"windowPx":210,"travel":"bottom-to-top","speed":"linear"}`；8.0 s | 完整职员文本沿平面裁切窗口由下向上匀速经过，行布局保持连续。 |
| `tx-led-dot-matrix` → `broadcast-led` | `{"pitch":4,"steps":60,"direction":"left","ink":"amber"}`；6.2 s | 本机字形先光栅采样成亮点坐标，Canvas 点阵按量化步数向左滚动。 |
| `tx-lower-third` → `broadcast-lower-third` | `{"barEnd":0.2,"plateEnd":0.54,"textDelay":0.28,"accent":"blue"}`；3.2 s | 底侧标识竖条先展开，姓名底板随后扩宽，正文再从独立遮罩中显露。 |
| `tx-news-ticker` → `broadcast-ticker` | `{"direction":"left","label":"NEWS","speed":"linear"}`；7.6 s | 一条保持单行宽度的信息条匀速横穿裁切窗口，固定 NEWS 标签独立于滚动正文。 |
| `tx-telop-comment-follow` → `broadcast-speaker-follow` | `{"speakers":["話者 A / 甲","話者 B / 乙"],"palette":"blue-amber","transitionFraction":0.28}`；6.2 s | 句窗按作者话者轮次交替分色与落点，当前话者标签及弹性入场同步更新。 |
| `tx-telop-kirakira` → `broadcast-sparkle` | `{"sparks":8,"radius":62,"revealEnd":0.5}`；3.2 s | 文本一次过冲出现，SVG 星芒沿椭圆向外散开并在显露终点收去。 |
| `tx-telop-pop-outline` → `broadcast-double-outline` | `{"outerPx":5,"innerPx":1.5,"revealEnd":0.44}`；2.8 s | 两层同字形使用不同宽度和颜色的原生描边叠合，整个字群一次过冲弹出。 |
| `tx-telop-shake` → `broadcast-shake` | `{"steps":18,"amplitudePx":5,"settleEnd":0.54}`；3.2 s | 文本按量化时间步从种子生成位置与角度扰动，振幅在落稳窗内持续衰减。 |
| `tx-telop-side-super` → `broadcast-side-super` | `{"side":"right","writingMode":"vertical-rl","revealEnd":0.52}`；3.4 s | 右侧底板中的正文采用原生纵排，整块从左侧裁切边界渐次显露。 |
| `tx-telop-tsukkomi` → `broadcast-slam-comment` | `{"angleDeg":-9,"impactAt":0.26,"impactDuration":0.14}`；2.8 s | 文本在冲击点从右侧以平方加速缩小撞入，保留少量斜角与强调下划线。 |
| `tx-telop-zabuton` → `broadcast-plate-wipe` | `{"plateEnd":0.42,"textStart":0.22,"textEnd":0.74,"plate":"amber"}`；3.4 s | 金色底板先横向擦出，深色正文随后通过竖向裁切窗揭示。 |

### 日语排版与作者演示 / Japanese typography and authored demonstrations

将语言数据与编辑正文分开。笔触、文节、IME 候选、木字四笔及 ruby 读音都是明确作者数据；原生纵排、阅读预算、显式约物表与 CJK/Latin 评论/歌词/冲击适配另有专门通道。

| 原始 ID → descriptor（均以 text. 为前缀） | 完整原创配置；教学轴 | 实际机制 |
| --- | --- | --- |
| `tx-brush-write-on` → `japanese-brush` | `{"demoLanguage":"ja-authored","editableTextMode":"unaltered-cjk-latin","illustration":"one-horizontal-stroke","revealEnd":0.7}`；3.6 s | 原创「一」几何墨面与干笔纹同步裁切，笔尖沿横笔移动；编辑正文另行完整保留。 |
| `tx-bunsetsu-reveal` → `japanese-bunsetsu` | `{"demoLanguage":"ja-authored","editableTextMode":"unaltered-cjk-latin","phrases":["朝の光が","窓から","届く。"],"spread":0.52}`；4.4 s | 作者明确标注的日语文节逐段横向揭示，下划线呈现已给定的边界。 |
| `tx-cinema-handwritten-subtitle` → `japanese-handwritten-cue` | `{"layoutLanguage":"ja","editableTextMode":"unaltered-cjk-latin","fontPolicy":"system-handwritten-preference","cueAt":0.24}`；4.2 s | 底侧整句字幕在指定时间点切入，字体仅使用本机手写偏好栈。 |
| `tx-danmaku-comments` → `japanese-danmaku` | `{"lanes":3,"entrySpread":0.4,"speed":"linear","adaptation":"cjk-latin-comments"}`；7.0 s | 按行分配评论轨道，各评论从右侧分时进入并向左匀速离开。 |
| `tx-eva-mincho-card` → `japanese-mincho-card` | `{"layoutLanguage":"ja","editableTextMode":"unaltered-cjk-latin","fontPolicy":"system-mincho-preference","cutAt":0.22}`；2.8 s | 高对比整句标题在指定节点直接硬切显示，使用系统明朝偏好与紧字距。 |
| `tx-ime-conversion` → `japanese-ime` | `{"demoLanguage":"ja-authored","editableTextMode":"unaltered-cjk-latin","kana":"あさ","candidates":["朝","麻"],"selected":0,"commitAt":0.8}`；5.6 s | 作者假名逐字输入后出现显式候选列表，再提交指定候选；编辑正文另行保留。 |
| `tx-jp-subtitle-timing` → `japanese-reading-time` | `{"layoutLanguage":"ja","editableTextMode":"unaltered-cjk-latin","charactersPerSecond":4.5,"minimumSeconds":1.5,"gapSeconds":0.4}`；6.4 s | 整句时长取最小阅读秒数与日语字素数除字速的较大值，句间留空窗再归一化。 |
| `tx-kanji-stroke-order` → `japanese-stroke-order` | `{"demoLanguage":"ja-authored","editableTextMode":"unaltered-cjk-latin","glyph":"木","pathPolicy":"original-geometric-illustration","spread":0.66}`；5.2 s | 原创「木」的横、竖、撇、捺四条 SVG 路径按顺序展开，编号明确标注笔次。 |
| `tx-lyric-tame-tsume` → `japanese-tame-tsume` | `{"adaptation":"editable-cjk-latin-lyric","holdFraction":0.46,"spread":0.45,"travelPx":24}`；5.4 s | 每个词先在局部相位中等待，再用四次加减速曲线压缩行进到原位。 |
| `tx-onomatopoeia-impact` → `japanese-onomatopoeia` | `{"adaptation":"editable-cjk-latin-impact","rays":12,"impactAt":0.26,"revealEnd":0.66}`；3.2 s | 粗体拟声文本旋转缩放撞入，周围原创 SVG 放射线在冲击阶段短暂增强。 |
| `tx-ruby-sync` → `japanese-ruby` | `{"demoLanguage":"ja-authored","editableTextMode":"unaltered-cjk-latin","pairs":[{"base":"朝","reading":"あさ"},{"base":"光","reading":"ひかり"}],"spread":0.4}`；4.6 s | 原生 ruby/rt 将作者给定的基字与读音作为同组，一起按相位裁切和显露。 |
| `tx-tategaki-reveal` → `japanese-tategaki` | `{"layoutLanguage":"ja","editableTextMode":"unaltered-cjk-latin","writingMode":"vertical-rl","latinOrientation":"mixed","spread":0.48}`；5.2 s | 正文通过原生 vertical-rl 排列，日语字素逐个显露，拉丁方向服从 mixed 规则。 |
| `tx-vertical-subtitle` → `japanese-vertical-cue` | `{"layoutLanguage":"ja","editableTextMode":"unaltered-cjk-latin","writingMode":"vertical-rl","latinOrientation":"mixed","cueAt":0.3}`；4.6 s | 右侧完整字幕采用纵排混合字符方向，在指定 cue 点硬切出现。 |
| `tx-yakumono-pause` → `japanese-yakumono` | `{"punctuationProfile":"ja-cjk-latin-explicit","commaWeight":3,"stopWeight":6,"revealEnd":0.88}`；6.2 s | 字素逐个显露，显式逗号类与句末类标点占用更大时间权重，使停顿发生在标点出现后。 |

### 标题与剪辑 / Cinematic title mechanisms

折带、双卡黑桥、胶片层、一次低亮切帧、遮幅、光漏、透视爬行、线先行职员卡、纵深撞入、两种字距曲线、条带切片及阶梯纸印分别处理空间或合成机制。

| 原始 ID → descriptor（均以 text. 为前缀） | 完整原创配置；教学轴 | 实际机制 |
| --- | --- | --- |
| `catalog-kinetic-type-headline-ribbon` → `title-ribbon` | `{"foldDegrees":58,"revealEnd":0.6,"ribbon":"blue"}`；3.2 s | 前带与两侧背折分别绕纵轴展开，主标题由独立裁切窗显露。 |
| `tx-fade-through-black` → `title-black-bridge` | `{"before":"第一幕 / BEFORE","after":"第二幕 / AFTER","blackStart":0.4,"blackEnd":0.6}`；4.0 s | 前卡淡出至全黑区间后后卡才淡入，两张卡共享正文但具有独立标题。 |
| `tx-film-scratch-jitter` → `title-film-jitter` | `{"scratches":7,"frames":48,"jitterPx":2,"dust":16}`；3.6 s | 种子控制的逐帧门位抖动与 SVG 细刮痕、尘点叠加在完整标题上。 |
| `tx-flash-frame-cut` → `title-flash-cut` | `{"before":"序章 / BEFORE","after":"开场 / AFTER","cutAt":0.35,"frameFraction":0.03,"exposure":0.12}`；3.0 s | 卡片标签在切点离散替换，一层低亮暖色曝光只占短暂帧窗，标题字距同步改变。 |
| `tx-letterbox-reveal` → `title-letterbox` | `{"finalBarPercent":10,"revealEnd":0.64}`；3.4 s | 上下黑色遮幅从覆盖一半画面收至最终比例，使居中的完整标题经开口显露。 |
| `tx-light-leak-burn` → `title-light-leak` | `{"revealEnd":0.66,"leakWidthPercent":48,"intensity":0.28}`；3.6 s | 暖色径向光漏以 screen 混合扫过文本，正文另由裁切窗展开，光漏强度在终点归零。 |
| `tx-opening-crawl` → `title-perspective-crawl` | `{"tiltDegrees":58,"windowPx":220,"speed":"linear"}`；9.0 s | 连续文本在透视窗口内倾斜并向远处匀速爬行，区别于平面职员滚屏。 |
| `tx-racing-credits` → `title-racing-lines` | `{"leadFraction":0.14,"burstFraction":0.24,"direction":"alternating"}`；6.4 s | 每句职员卡先展开引导线再快速进入，奇偶句交替从左右落位。 |
| `tx-slam-in-title` → `title-slam` | `{"depthPx":190,"impactAt":0.22,"impactEnd":0.6,"reboundPx":6}`；3.2 s | 完整标题沿纵深以三次加速撞入，垂直回弹振幅随后衰减为零。 |
| `tx-slow-tracking-expand` → `title-tracking-expand` | `{"fromEm":0.02,"toEm":0.18,"easing":"linear","font":"system-serif"}`；6.2 s | 系统衬线标题保持字符内容不变，CSS letter-spacing 在整条时间轴上匀速扩大。 |
| `tx-split-bars-title` → `title-sliced-bars` | `{"slices":5,"travelPx":110,"revealEnd":0.62,"direction":"alternating"}`；3.4 s | 多层相同标题分别裁成水平条带，交替从左右错时滑回并拼成完整字形。 |
| `tx-stamp-cutout` → `title-stamp` | `{"steps":2,"spread":0.46,"angleDegrees":6,"paper":"cream"}`；4.0 s | 词元裁成不规则纸块，用两阶缩放与种子角度依次落印，空白不涂纸底。 |
| `tx-tracking-in-contract` → `title-tracking-contract` | `{"fromEm":0.48,"toEm":0.02,"revealEnd":0.82,"easing":"quartic-out"}`；5.4 s | 标题从宽字距经四次减速曲线收束到紧凑排版，文字本身不缩放。 |

### 语言、字幕与原生权威 / Language, caption and native authority

**字素与边界。** text-core 使用 Intl.Segmenter 进行 grapheme/word 分割，保留空格和真实 CJK/Latin 正文；缺少该 API 会明确报错，没有按 UTF-16 单元拆字的退路。phrase/line 的示范边界只取显式换行或有限句末标点规则，不是完整语言分析。lineCapacity 按词元累计字素决定换行，长词不会被强制截断，因此不是保证固定列宽或自动中文字幕排版。emoji、组合附标与混合文字需按目标字体实看。

**字幕 cue。** grapheme-weighted 为教学分配，不是真实媒体时码；paint-on 的均分词计数、pill 的等步词选择、RSVP 的长度加权及 roll-up 的容量分行不能彼此互换。生产需接既有 WebVTT/字幕 cue、媒体 currentTime 与实际语词时间戳；暂停、跳转、速率改变和取消由媒体所有者控制。live-block 的点线末字表示作者临时假设，不是语音识别；真实 ASR provisional/committed 事件与修订内容不能由动画猜测。话者轮次仅以 speakers 循环教学，不作说话人识别。

**日语作者数据。** bunsetsu 的 phrases、IME 的 kana/candidates/selected、ruby 的 pairs 都必须显式提供正确日语；本配置选用「朝の光が｜窓から｜届く。」、假名「あさ」候选「朝/麻」、读音「朝/あさ」「光/ひかり」。selected 必须小于候选数；ruby pair 只允许 base/reading 两字段。brush 仅画「一」的一笔原创墨面，stroke-order 仅画「木」的四条原创几何路径，不适用于任意字形。示范板有作者标签，并在旁保留编辑正文；不推断文节、读音、候选、笔顺，也不把中文词分割标为日语文节。

**原生输入与排版。** IME 示范没有输入控件，不拦截 compositionstart/update/end，不提交文本；生产仍使用原生 input/textarea/contenteditable 与系统 IME，应用提交状态不能由候选动画替代。ruby/rt、writing-mode: vertical-rl、text-orientation: mixed、letter-spacing、tabular-nums 和字形描边是实际 DOM/CSS 通道，而非整段 scale 或旋转伪装。日语字速和约物表只是明确演示选择，不是跨语言可读性标准。纵排仍需目标语言的禁则、标点、拉丁转向、溢出和字体覆盖审阅。

**数值状态。** 作者数值的 root aria-label 说明演示值，编辑正文仅为独立说明。production 的价格、分数、倒计时、完成度必须来自状态模型/业务时钟；不要发布随机锁位中间数、插值显示值或动画完成回调作为真值。图形数字、滚轮和七段管不替代语义 DOM 数值；方向变化用箭头与差值，不只靠颜色。live region 的播报频率由产品可访问性设计决定，不按每帧播报。

### 通道、终态与频率 / Channels, reduced motion and frequency

- **DOM/CSS：** 普通词元、全文及句窗的 visibility/opacity；pill 的布局测量；plate/letterbox/sliced-bars 的裁切与几何；字体描边双层；native tracking；vertical-rl。布局测量意味着字体加载/换行会影响几何，生产应接自身尺寸、字体就绪与布局管理，不加猜测坐标。
- **SVG：** percent ring 的描边缺口、七段管的数字位掩码、sparkle 的星芒、onomatopoeia 的射线、作者笔触与笔顺、film-jitter 的细刮痕/尘点。这些都是原创几何，不含源站资产或笔画字库。
- **Canvas 2D：** LED 先从本机 monospace 字形采样，再绘制点阵并量化滚动。需要 2D context、measureText/getImageData；不支持时明确报错，不以模糊字体代替点阵。采样宽度有 4096 上限，长文本可能被压缩绘入源画布；目标内容要按生产版面分段，完整文本需另有语义可见入口。无外部字体/图像请求。
- **CSS 3D/合成：** ribbon 的相反背折与前带、perspective-crawl 的投影、slam 的 translateZ、light-leak 的 screen 混合。平台需支持 CSS perspective/transform、clip-path 和混合；导出到 film/edit 时将相同几何与明确 cue 改编到既有渲染器/合成层，浏览器预览不等于生产渲染验收。系统 Mincho、handwritten、serif、monospace 字体只是偏好栈，无授权字体包，也不保证目标机字形一致；真实字体必须走项目资产许可流程。

Reduced motion 不只是放慢：所有字词最终可读，回声/星芒/胶片尘痕/光漏等装饰层隐藏，震动与纵深/缩放/旅行归零；数字显示终值、countdown 显示零、IME 显示作者已提交值；pill/当前词高亮/RSVP 焦点不再追逐，RSVP 展开全文；cue 序列、roll-up、credits/crawl 与弹幕展开内容；双卡过渡和低亮切帧直接呈现后卡，笔顺/墨面完整展示。ribbon 保留静态折带、letterbox 保留最终遮幅、stamp 保留纸块、onomatopoeia 保留低强调静态放射线：这些不是运动。静态选择不允许改变真实输入、焦点、业务计时或字幕权限。

字幕和新闻在需要时触发；标题撞入、底板接力、星芒、价差强调只做一次。RSVP 必须允许用户调速/暂停并保留全文；新闻爬行/弹幕必须有停止或静态读法。胶片抖动仅列 film/edit，不作为常规 UI 反馈。flash-cut 只有一次低亮暖色短窗，减弱档删曝光；这是有意受控的机制改编，不声称源站亮度复现或光敏风险自动验收。禁止以源 loopDurationMs 建立无限闪烁/摇晃循环。

### 生命周期、适配与证据 / Lifecycle, adaptation and evidence

所有 study 在 create 建立节点，seek 只从归一进度、参数和种子计算呈现；gallery 拥有播放循环，不创建私有计时器。冷/逆向寻址不依赖上一帧，切换由 dispose 释放所属节点/资源。暂停不提交业务状态；取消或反向仍由生产所有者决定真实 cue/输入/值。study 的 role=img 与隐藏视觉副本仅用于避免读屏重复，不是完整可交互产品字幕/输入组件的可访问性实现。生产保留原生控件、键盘、焦点、全文文本、合理播报和现有语义 primitive。

web/ui 接入实际媒体、状态与布局；film/edit 接入镜头时码、剪辑表、授权字体和画幅安全区。不创建公共新 gate、receipt 或动画运行时。每条记录归因到 Motion Reference 的 detail URL、catalogue-metadata 与真实来源时长/缓动，codeCopied/assetsCopied 均为 false，redistributionLicense 为 unverified。配置与说明为原创机制教学，不含源站长文、代码、字体或媒体。身份覆盖、schema 校验、实际分支/播放观察和 owner Visual Acceptance 分开报告；实际配置、生命周期与播放证据由集成验收单独记录。

## Source and evidence boundaries

The [Motion Reference catalogue](https://motion-reference.takayustudio.jp/) supplies factual short names, exact identity/category, source-displayed duration/easing and item/legacy provenance. Each exact source link remains in its catalogue record. No source code, descriptions, implementation paths or assets are copied. Source redistribution licensing remains unverified; the separate Roboto Flex font has its own confirmed SIL OFL 1.1 license, which does not grant rights to Motion Reference.

These recipes are original adaptations, not measured copies of all source animations. Configuration labels do not establish runtime behavior. Integration acceptance separately exercises each branch under normal/reduced/cold/reverse seek, disposal and real native input, with representative playback. This guide does not grant owner Visual Acceptance or report checks that have not been run.
