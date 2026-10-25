# Web motion recipes / 网页动效配方

**Purpose:** discover an original mechanism by product scenario, inspect it in the offline gallery, and adapt its presentation into the current renderer without replacing application state. Audience: agents and engineers reusing interaction, layout, control and data motion. This guide describes the web group only; it does not certify the external examples' implementation or visual fidelity.

The group covers 157 exact catalogue identities: web-scroll 12, web-interaction 15, web-layout 19, web-feedback 12, form-state 8, gesture 8, ui-button 22, ui-control 14, ui-navigation 6, ui-loading 10, ui-feedback 8 and data-story 23. Source identity membership and factual display parameters are preserved by the catalogue's per-item records. The original recipes share utility code, not a catch-all animation. Each record selects an explicit mechanism/branch with supported author values and a concrete rationale.

## Entry points / 使用入口

- [Original offline gallery](../../../tools/motion-recipes/full/index.html): select an exact source ID, play/reverse/cold seek, toggle reduced motion, and try native interactions in the mounted study. `#motion=<source-id>` selects an exact identity; timeline and native state are explicitly separate channels.
- [Original web module](../../../tools/motion-recipes/full/web.js): classic browser script or CommonJS `{ group, recipes }`, with no DOM work at require time and no remote dependency. Each descriptor exposes strict `validate(parameters)` and `create(stage,parameters,options) → {seek,dispose}`. Required author parameters are not inferred from title or category.
- [Existing recipe entry](../README.md): retain the four standalone interaction specimens; use their state/revision/cancellation patterns where applicable rather than introducing a second workflow or runtime.

Browse by scenario / 按中文场景找机制：滚动阅读 reading scroll · 拖拽手势 drag/gesture · 列表重排 reorder · 跨视图身份 shared element · 折叠布局 intrinsic height · 导航切换 navigation · 表单反馈 form state · 等待进度 pending/progress · 数据关系 data relationships. The sections below name concrete branches, phase/state responsibilities and native-input adaptations.

## Operating contract / 运行边界

Study progress is finite `[0,1]`. The gallery owns playback; the module starts no perpetual animation scheduler. Cold and reverse seeks calculate the same authored presentation for the same progress and native input state, without replacing DOM every frame. Native intent remains authoritative even when the timeline reverses. Mount creates one owned subtree, and dispose removes its listeners/resources/subtree; it never removes another recipe's content. Measurements and input capture policies are specified per mechanism below.

The authored teaching duration is distinct from source-displayed action/loop duration and from production operational timing. Current DESIGN.md, MOTION.md, target renderer, component semantics and motion tokens override study values. Use no motion if it adds no causal explanation, delays interaction, or competes with important content. Reduced motion must keep meaning, readable values, available controls and logical state, not merely run the same trajectory faster.

## Provenance and interpretation / 来源与原创边界

[Motion Reference](https://motion-reference.takayustudio.jp/) supplies factual item identity, category, short title, source link and displayed timing/easing observations. The observation kind is catalogue metadata, not a claim that all source animations were visually reviewed. All implementations, parameter choices, scenario descriptions and Chinese names here are original. No upstream code, descriptive prose, assets or fonts are copied. Upstream redistribution licence remains unverified; catalogue attribution is not permission to redistribute source material.

Ambiguous metadata is interpreted as an explicit original teaching mechanism in its mapping rationale. A timeline study is not automatically a production scroll, pointer, request, upload, modal, transaction or data service. Reuse the formulas/channels below inside the existing renderer and bind them to actual domain state; do not import the gallery as a second production runtime.



## Web scroll / 原生滚动与独立预览

These twelve original studies cover the assigned factual `web-scroll` identities. Each has an upper **real native scrollport** containing readable content and a lower **authored seek study**. Native scrolling changes the upper presentation; gallery `seek(t)` changes only the lower presentation. Neither surface borrows the other surface's scroll position, active chapter, focus or velocity history.

Implementation: the self-contained [web module](../../../tools/motion-recipes/full/web.js), with twelve concrete scroll descriptors and exact mapped identities. Schemas and phases are authored contracts, not browser-playback evidence. Module membership and native behavior require separate consumer/runtime verification.

| Find / 查找 | Section |
| --- | --- |
| Exact source identity and descriptor | Discovery table |
| Supported parameters and mapped values | Parameter schemas |
| Native range, start/end and study phases | Mechanism contracts |
| Native versus seek ownership, keyboard and cleanup | Input, interruption and cancellation |
| Reduced/no-motion behavior | Frequency and no-motion |
| Reuse in a target web/film renderer | Renderer adaptation |
| Unsupported or unverified behavior | Limitations and provenance |

### Discovery table

Names in Chinese and the mechanisms are original. Source IDs identify factual catalogue observations, not imported implementation branches.

| Exact source ID | 中文查找 | Recipe ID | Actual native mechanism | Authored study duration |
| --- | --- | --- | --- | ---: |
| `horizontal-scrub` | 滚动横向轨道 | `web.scroll-horizontal-track` | Measured rail overflow driven by measured vertical scroll extent | 2400ms |
| `image-clip-scrub` | 滚动图像开窗 | `web.scroll-image-clip` | Actual CSS crop aperture over an original SVG | 2200ms |
| `parallax-layers` | 分层滚动视差 | `web.scroll-parallax-layers` | Three real SVG layers with independent displacement rates | 2600ms |
| `pinned-story-steps` | 钉住分步叙事 | `web.scroll-pinned-story-steps` | CSS sticky grid diagram plus measured chapter activation | 3200ms |
| `scroll-depth-zoom` | 滚动透视纵深 | `web.scroll-depth-perspective` | CSS perspective and three independent `translateZ` planes | 2500ms |
| `scroll-marquee` | 滚动耦合字带 | `web.scroll-marquee-band` | Measured repeat width, bounded horizontal displacement from native scroll | 2400ms |
| `scroll-progress` | 实测阅读位置 | `web.scroll-reading-progress` | Accessible position progressbar from actual offset/extent | 2200ms |
| `scroll-reveal` | 按位置元素显露 | `web.scroll-element-reveal` | Per-element measured viewport entry ranges | 2500ms |
| `section-snap` | 原生分节吸附 | `web.scroll-native-section-snap` | Native CSS `scroll-snap-type` and `scroll-snap-align` | 3200ms |
| `sticky-pin` | 原生粘性锚点 | `web.scroll-native-sticky-pin` | Native sticky positioning bounded by a content-bearing section | 2800ms |
| `text-scroll-scrub` | 逐单元滚动释文 | `web.scroll-segmented-text` | Actual grapheme/word segments resolved from native position | 2800ms |
| `velocity-skew` | 实测滚速倾斜 | `web.scroll-measured-velocity` | Native offset delta divided by actual scroll-event time delta | 2600ms |

The authored durations describe gallery teaching playback only. They are neither source-displayed duration/loop values nor production operational budgets. Native scroll has no fixed duration and no autoplay clock.

### Parameter schemas

Every key listed for a recipe is required. Numbers are finite and bounded inclusively; enum strings match exactly. Missing, extra and unsupported parameters are rejected by `validate`, which is also called before `create` mounts anything. There are no aliases or fallback recipe IDs. These are author controls, not copied source settings.

| Recipe suffix (`web.` prefix) | Complete supported schema | Exact mapped parameters |
| --- | --- | --- |
| `scroll-horizontal-track` | `viewportHeight`: 180–360px; `cardWidth`: 130–260px; `gap`: 6–32px | `{ viewportHeight:240, cardWidth:180, gap:14 }` |
| `scroll-image-clip` | `viewportHeight`: 180–360px; `edge`: `inline-start` or `center`; `startAt`: 0–0.45; `endAt`: 0.55–1 | `{ viewportHeight:240, edge:'center', startAt:0.08, endAt:0.9 }` |
| `scroll-parallax-layers` | `viewportHeight`: 180–360px; `travel`: 12–70px; `nearRatio`: 0.9–1.8 | `{ viewportHeight:240, travel:44, nearRatio:1.6 }` |
| `scroll-pinned-story-steps` | `viewportHeight`: 220–360px; `stepHeight`: 180–380px; `pinTop`: 0–24px | `{ viewportHeight:260, stepHeight:220, pinTop:8 }` |
| `scroll-depth-perspective` | `viewportHeight`: 180–360px; `perspective`: 500–1200px; `depth`: 80–220px | `{ viewportHeight:240, perspective:720, depth:180 }` |
| `scroll-marquee-band` | `viewportHeight`: 180–360px; `direction`: `left` or `right`; `travelRatio`: 0.25–1 measured repeat | `{ viewportHeight:240, direction:'left', travelRatio:1 }` |
| `scroll-reading-progress` | `viewportHeight`: 180–360px; `indicator`: `bar` or `ring` | `{ viewportHeight:240, indicator:'bar' }` |
| `scroll-element-reveal` | `viewportHeight`: 180–360px; `threshold`: 0.5–1 viewport; `span`: 0.2–0.65 viewport; `travel`: 0–32px | `{ viewportHeight:240, threshold:0.85, span:0.45, travel:22 }` |
| `scroll-native-section-snap` | `viewportHeight`: 180–360px; `axis`: `vertical` or `horizontal`; `strictness`: `proximity` or `mandatory` | `{ viewportHeight:240, axis:'vertical', strictness:'proximity' }` |
| `scroll-native-sticky-pin` | `viewportHeight`: 180–360px; `pinTop`: 0–24px; `holdScreens`: 1.5–4 viewport-height units | `{ viewportHeight:240, pinTop:12, holdScreens:2 }` |
| `scroll-segmented-text` | `viewportHeight`: 180–360px; `unit`: `grapheme` or `word`; `spread`: 0.15–0.85 normalized progress; `travel`: 0–28px | `{ viewportHeight:240, unit:'grapheme', spread:0.68, travel:12 }` |
| `scroll-measured-velocity` | `viewportHeight`: 180–360px; `gain`: 0.002–0.03 degrees per (px/s); `maxSkew`: 1–14deg; `previewSpeed`: 100–1400px/s authored peak | `{ viewportHeight:240, gain:0.014, maxSkew:10, previewSpeed:650 }` |

`options.text` supplies the real phrase/paragraph for marquee and text scrub. If absent, an original CJK/Latin sample is used; an explicitly empty string stays empty. `options.reducedMotion` selects the no-travel representation at creation. These drawings contain no randomized state, so `options.seed` has no visual role. Options are not additional recipe parameters.

### Measurement and ownership

For ordinary vertical studies, native normalized position is `q = clamp(scrollTop / max(0, scrollHeight - clientHeight))`, with `q=0` when the extent is zero. Horizontal native snap reads `scrollLeft`, `scrollWidth` and `clientWidth` instead. Those offsets are **read only** throughout the fragment. No seek path assigns an offset, invokes scrolling, focuses a section or changes an upper-panel active item.

Geometry is collected after mounting, on `ResizeObserver` notification, window resize and font `loadingdone`. Static element positions are measured relative to the actual scrollport, accounting for its border and current scroll offset; changing the offset does not redefine their content-space positions. Rail widths, snap offsets, reveal anchors and sticky boundaries are cached rather than rediscovered by every study frame. Refresh reads the **current** native position; it does not return the panel to the beginning.

A native scroll callback updates only its native nodes and status. A seek callback updates only its preview nodes and cached last study progress. A geometry refresh redraws both from their separate state. Repeated, cold or reverse seeks therefore select the same authored pose at the same geometry without requiring a previous frame. The gallery owns study playback; this fragment starts no request loop, interval, timer or autonomous animation.

### Mechanism contracts

#### `web.scroll-horizontal-track`

- **Native trigger/range:** real vertical scroll from top to the bottom of a three-chapter panel. The four-card rail measures `max(0, rail.scrollWidth - railContentWidth)` after layout; `cardWidth` and `gap` change real overflow, not a label.
- **Start/end/phases:** at `q=0`, the rail starts at the first card; at `q=1`, its far edge reaches the clip's content edge. Translation is `-overflow × q`, continuously reversible, with no time-based easing or inertia.
- **Study:** the independently measured lower rail uses the same geometric formula with `t` instead of `q`. Native offset and presentation are not changed by replay or reverse study playback.
- **Reduced/no-motion:** all four cards wrap in ordinary readable layout; transform is removed and clip height becomes intrinsic. A zero-overflow rail has no displacement. No card or function is discarded.
- **Reuse:** feed measured overflow and the target renderer's existing scroll progress into its established transform channel. Keep any real card links in semantic DOM; the sample cards are not a production carousel or navigation model.

#### `web.scroll-image-clip`

- **Native trigger/range:** measured whole-panel `q`; the actual crop node contains an original landscape SVG.
- **Start/end/phases:** closed before `startAt`; smooth cubic opening over `[startAt,endAt]`; fully open after `endAt`. `inline-start` reduces the right-side inset from 100% to 0%; `center` reduces symmetric side insets from 50% to 0%. This is mask geometry, not opacity substitution.
- **Study:** the same aperture calculation affects a separate image node. Reverse seek closes the crop deterministically.
- **Reduced/no-motion:** remove the crop and show the complete image immediately. Semantic explanatory paragraphs are never children of the clipped image and remain readable in every mode.
- **Reuse:** bind a crop/mask to an existing CSS, SVG or renderer clip primitive; preserve the target image's semantic alternative and licensing. No image source is supplied or imported by this study.

#### `web.scroll-parallax-layers`

- **Native trigger/range:** measured whole-panel `q` drives three independent original SVG landscape layers.
- **Start/end/phases:** all layers start at their authored origin. At the bottom, far/middle/near displacements are `-travel × 0.2`, `-travel × 0.65`, and `-travel × nearRatio` pixels. All three tracks are linear in native position; none borrows a timeline derivative.
- **Study:** three distinct lower SVG nodes receive the same layer-rate calculation from `t`.
- **Reduced/no-motion:** all planes are retained at their static origins with no translation. No continuous emphasis runs while the user is idle.
- **Reuse:** map layers to the project's existing DOM/SVG scene nodes or camera layers. Limit foreground travel to the target viewport and preserve text/input as ordinary, untransformed content. Do not use decorative parallax as the only explanation of depth.

#### `web.scroll-pinned-story-steps`

- **Native trigger/range:** a real two-column grid contains a CSS sticky diagram and three flowing semantic chapter articles. The diagram's `top` is `pinTop`; its containing grid, not the gallery, bounds pinning.
- **Start/end/phases:** introduction → three chapters → trailing release content. Native chapter activation compares cached chapter starts to `scrollTop + 0.5 × viewportHeight`. Crossing a start changes the diagram emphasis and that chapter's `aria-current='step'`; reversing restores the prior chapter without rebuilding it.
- **Study:** `phase(t,0.12,0.88)` is divided into three discrete chapter states. The lower diagram and lower labels are separate from the native chapter articles. This is an authored step schematic, not a claim to simulate browser scroll physics.
- **Reduced/no-motion:** the diagram becomes an ordinary-flow block, the grid becomes a single reading column, and all three chapter names remain in the diagram. Measured native chapter emphasis may still update as non-travelling position feedback.
- **Reuse:** keep the target semantic chapters and native sticky containment. If an existing renderer owns the diagram, send it the active chapter index while preserving native document/focus authority. Pinning does not commit story, route or product state.

#### `web.scroll-depth-perspective`

- **Native trigger/range:** measured whole-panel `q`, eased by smooth cubic, feeds actual CSS perspective depth.
- **Start/end/phases:** with authored depth `d`, the landscape moves from `-0.5d` to `-0.34d`, the frame from `-0.35d` to `0.2d`, and the subject from `-d` to `0.45d` on independent `translateZ` tracks. `perspective` is a real container property, not a fake scaling parameter.
- **Study:** lower planes independently reproduce this Z configuration from `t`.
- **Reduced/no-motion:** remove every plane transform; all illustration planes and the route label remain visible at zero depth. The surrounding reading content never participates in camera travel.
- **Reuse:** if the target already has a scene/camera renderer, translate these relative depth tracks into its existing world/camera units and projection. Do not add another 3D runtime or assert that CSS pixel depth equals production world distance.

#### `web.scroll-marquee-band`

- **Native trigger/range:** native whole-panel position drives a text strip. Its repeat period is the first copy's measured width plus an 18px gap. There are exactly two visual copies per surface; each copy is at least one clip-content width, keeping a full repeat reachable without a large clone set.
- **Start/end/phases:** `left` moves from zero to `-period × travelRatio`; `right` traverses the same bounded interval in the opposite direction. There is no modulo jump, automatic loop or idle scrolling.
- **Study:** the lower band measures its own period and samples `t`. The native strip freezes if native position freezes, even while gallery playback continues below it.
- **Reduced/no-motion:** show one wrapping copy, hide the duplicate and remove translation. An empty phrase produces no text animation. A full semantic phrase is exposed once per labelled surface; both moving copies are accessibility-hidden.
- **Reuse:** replace the original teaching phrase with real approved copy, retain one semantic text owner, and use the existing horizontal transform channel. Continuous autoplay marquees are out of scope and would require their own pause/accessibility decision.

#### `web.scroll-reading-progress`

- **Native trigger/range:** actual panel offset divided by actual scroll extent. At zero extent the value is zero; at the bottom of a nonzero extent it is 100%.
- **Start/end/phases:** a `bar` scales a real fill from zero to full width; a `ring` changes an SVG circle's dash offset over its actual circumference. Both update `role='progressbar'`, label and `aria-valuenow` as position feedback without a transition.
- **Study:** an independently labelled progressbar consumes `t`, never a completion value from the native panel.
- **Reduced/no-motion:** retain accurate native and study values rather than forcing 100%. There is no travel, spring, pulse or smooth transition; direct data-driven fill is preserved for meaning. The native sticky container becomes ordinary flow.
- **Reuse:** use the target's existing accessible progress indicator and actual scroll geometry. Do not mark a lesson, reading task or workflow complete solely because this positional indicator reaches its end. Status text is not an aria-live announcement stream.

#### `web.scroll-element-reveal`

- **Native trigger/range:** four article anchors are measured independently in content coordinates. For anchor `yᵢ`, viewport height `H` and position `s`, reveal is `clamp((H × threshold - (yᵢ - s)) / (H × span))`.
- **Start/end/phases:** an article's decoration begins when its anchor reaches `H × threshold` inside the viewport and completes after a further `H × span` scroll distance. Each illustration fades from 0 to 1 and lifts from `travel` to zero. Reversal changes the same measured entry interval; this is not a one-shot intersection flag.
- **Study:** four independent lower cards stagger from `0.35 × (1-threshold) + 0.12i` for duration `0.75 × span`, eased smoothly. These are authored study phases, not guesses at native article positions.
- **Reduced/no-motion:** all four illustrations are visible with no translation. Every article heading and explanatory sentence is visible even before its decoration enters. A `travel` of zero intentionally keeps only decorative opacity resolution; reduced mode removes that concealment too.
- **Reuse:** apply the reveal only to approved decorative layers or preserve an equivalent semantic baseline for necessary content. Interactive focus targets should not be placed in an opacity-hidden decoration. Keep the target renderer's existing reveal/transform channel.

#### `web.scroll-native-section-snap`

- **Native trigger/range:** four actual sections live in a focusable overflowing panel. Vertical uses `scroll-snap-type: y <strictness>`; horizontal uses `x <strictness>` and a real flex row. Every section has `scroll-snap-align:start` and at least one authored viewport height of content. The nearest cached section start supplies only native location feedback.
- **Start/end/phases:** first section → intermediate sections → last section. Browser scroll input and CSS choose approach/settling; the fragment does not intercept wheel/touch keys, set offsets or approximate snap inertia.
- **Study:** four discrete lower poses use `min(3,floor(4t))`. Their track displacement uses measured preview overflow along the chosen axis. `strictness` controls actual native snapping, not an invented seek-time physics model.
- **Reduced/no-motion:** native snap is disabled, retaining free scrolling, semantic sections and focus reachability. The lower study shows all four tiles without movement, with a discrete border marker only.
- **Reuse:** use the target's native scroll-snap container rather than a scripted swipe replacement. Prefer `proximity` for reading; `mandatory` needs target-browser review for tall content and nested scroll interaction. Preserve keyboard access to every section and do not treat nearest-section feedback as route selection.

#### `web.scroll-native-sticky-pin`

- **Native trigger/range:** the content-bearing section contains a zero-height normal-flow anchor followed by the actual CSS sticky card. Introduction and trailing content make both approach and release reachable. `holdScreens` sets real reading-section extent, not blank timeline padding.
- **Start/end/phases:** let `a = anchorY - pinTop`, and `b = sectionY + sectionHeight - cardHeight - pinTop`. Before `a`, approach; between `a` and `b`, pinned; after `b`, released by the containing block. The strip inside the card reports normalized pin-range position without owning the positioning itself.
- **Study:** cached viewport, extent and pin boundaries supply a virtual position `v = range × t`. The lower card's Y pose is `(anchorY - v + clamp(v-a,0,b-a)) × previewHeight / viewportHeight`. This geometry study does not write a native offset or replace native CSS pinning.
- **Reduced/no-motion:** native card is ordinary flow and the lower card stays at a static 10px inset. The content-bearing section and all reading paragraphs remain accessible; only pin travel is removed. The position strip may retain meaningful direct position feedback.
- **Reuse:** retain the target containing block and measure its true card size after font/content changes. Native sticky should use the project's existing layout first; renderer diagrams can consume measured pin progress without moving document authority to an animation clock.

#### `web.scroll-segmented-text`

- **Native trigger/range:** measured whole-panel position resolves actual segments of the supplied text. `Intl.Segmenter` supplies grapheme clusters or word-granularity segments; whitespace is preserved but does not become a reveal track. Word granularity also preserves punctuation segments.
- **Start/end/phases:** for non-whitespace unit `i` of `n`, its start is `i / max(1,n-1) × spread`; its interval lasts `1-spread`. Smooth cubic resolves opacity 0.2→1 and lift `travel`→0. This changes actual text units, not a single substitute bar or whole-paragraph fade.
- **Study:** the lower paragraph has its own segment nodes and uses `t`; no native text, scroll value or velocity sample is mutated.
- **Accessibility:** each paragraph contains the full original semantic text once in a visually hidden span. Visual unit spans are accessibility-hidden, so CJK, Latin, emoji and punctuation are not announced as fragments or duplicate text. No input text is trimmed or silently shortened.
- **Reduced/no-motion:** every unit is fully opaque and untransformed, and the native paragraph becomes ordinary flow. Empty input yields zero reveal units rather than a fabricated phrase. Long text remains present, but this study does not virtualize it.
- **Reuse:** retain the target text component, licensed font and existing renderer's actual text-node/glyph channel. Segment once when content changes, not once per frame. For a film/edit renderer, preserve the full semantic/transcript text alongside the rendered units and drive reveal from its paused/seekable clock.

#### `web.scroll-measured-velocity`

- **Native trigger/range:** consecutive real `scroll` events. Signed speed is `(currentOffset - previousOffset) × 1000 / (currentEvent.timeStamp - previousEvent.timeStamp)` in px/s. The first event after mount/reset establishes a timestamp baseline and produces zero speed; nonpositive or unavailable time differences also produce zero rather than guessed velocity.
- **Start/end/phases:** instantaneous native skew is `clamp(speed × gain, -maxSkew, maxSkew)` degrees using `skewY`. Reversal changes the sign; it is not the derivative of gallery progress. `scrollend`, blur, pointer cancellation and document hiding reset to neutral. Geometry refresh resets velocity history but reads/preserves the current native position.
- **Study:** an explicitly authored profile has a positive sine pulse over `t=0.08–0.40`, a negative sine pulse over `0.55–0.88`, and zero elsewhere. `previewSpeed` is each pulse's peak in authored px/s units. Cold/reverse seeking samples this profile directly, independent of seek order or wall-clock elapsed time.
- **Reduced/no-motion:** keep measured velocity/status, but remove deformation. At rest the authored profile is neutral; native idle recovery depends on the actual reset event support described below.
- **Reuse:** source velocity from the target native/input system's measured delta/time samples and renderer's existing deformation channel. Do not derive operational speed from a normalized teaching timeline. Use the existing application lifecycle to cancel any production settling mechanism; this fragment supplies no timer-based decay.

### Input, interruption and cancellation

| Event | Native authority | Authored preview |
| --- | --- | --- |
| Wheel, touch or keyboard scroll | Browser changes actual panel offset; the scroll listener draws native nodes immediately | No effect unless its measured dimensions change |
| Native focus | Upper region shows a focus outline; section snap also exposes focusable semantic sections | Seek never moves focus |
| Gallery seek / replay / reverse / pause | No scroll, focus, chapter or velocity-history mutation | Recompute only the lower pose from finite progress |
| Rapid native reversal | Position-driven mechanisms reverse directly; velocity changes from signed native deltas | No previous-frame dependency |
| Resize / font load | Re-measure geometry and re-read current native position; velocity baseline becomes neutral | Recompute the same cached study progress with new dimensions |
| Native `scrollend` / blur / `pointercancel` / hidden document | Reset native velocity baseline and skew, preserving current scroll position | Preview state unchanged |
| Recipe switch / disposal | Remove owned scroll/focus/font/window/document listeners and disconnect the owned observer; remove the owned root | Same root disposal, no surviving clock or animation |
| Setup error | Dispose the partially mounted owned root/listeners/resources and rethrow the specific error | No fallback preview is returned |

The panel keeps native selection, browser scrolling and content reachability; no event calls `preventDefault`. Keyboard users focus the upper region and use native arrows, PageUp/PageDown or Home/End as the browser supports. For a horizontal snap panel, horizontal keys, a horizontal trackpad gesture or the browser's Shift-wheel behavior provide native input; tabbing a real section also preserves native focus scrolling. There is no custom key interception or application hotkey capture.

Repeated input does not queue animations. There are no owned CSS transitions, WAAPI animations, timers or request-animation-frame loops to cancel. Pausing the gallery stops only the parent-owned study playback; it does not lock native scrolling. Reduced preference changes require the parent to dispose/recreate with the new `options.reducedMotion`; the factory does not install a competing media-query owner.

### Frequency and no-motion

These are position/input studies, not attention loops. Decoration updates only on actual native input or authored gallery seek/geometry refresh. There is no idle repetition, flashing, shudder, one-shot replay on every scroll event, or automatic scroll restoration.

Use no motion when content is already understood, the panel does not overflow, the relevant track has no geometric travel, or the target task needs immediate reading/navigation rather than decorative explanation. Reduced substitution retains every real chapter/card/section and the full semantic phrase/paragraph. It removes travel, parallax, perspective advance, deformation, crop concealment and reveal concealment. Native progress and discrete location/chapter feedback retain meaning rather than being forced to an invented final logical state.

Native page/panel scrolling remains a user-controlled function. Removing decorative travel does not mean removing the ability to scroll to the rest of the content. The reduced snap study uses ordinary free scrolling and a static four-tile preview rather than inaccessible clipped targets.

### Renderer adaptation

- **Web/UI:** use the current project's `DESIGN.md`, `MOTION.md`, tokens and existing scroll/progress/reveal primitives. Reuse native CSS sticky and snap before adding a library. Bind these original tracks through the renderer already present; this fragment introduces no new production runtime or primitive taxonomy.
- **DOM/SVG:** reuse existing elements, clip channels, layer transforms, progress fills and text spans. Measure only the needed geometry on layout changes; consume native scroll samples without recreating DOM per frame. Keep necessary semantics outside clipped/deformed decorative layers.
- **Existing scene renderer:** parallax/depth drawings can become existing scene nodes/camera tracks, with world-unit and projection conversion chosen by the target renderer. Native input remains an input adapter, not a film clock.
- **Film/edit:** use the lower authored seek functions as teaching choreography only. Drive equivalent original layers/glyphs through the established paused/seekable renderer; exclude native scroll events and event timestamp history from deterministic film rendering. A native CSS sticky/snap study is not itself a portable film navigation system.
- **Ownership:** keep one native input owner and one existing timeline owner. Do not wire gallery `seek` to programmatic scrolling or native data commits. Map study progress into presentation, not route selection, completion, focus, reading history or user actions.

### Limitations and provenance

1. **Not runtime-certified here.** This slice intentionally performs no execution. Native geometry, CSS pin/snap behavior, normal/reduced/cold/reverse seeks, actual velocity events and disposal need the parent's integrated browser checks. Source-ID membership and implementation labels alone do not prove those behaviors.
2. **Modern connected DOM required.** Initial layout needs a connected measurable stage. `ResizeObserver` is used when available; window resize/font completion still refresh geometry, but without it arbitrary element/container resize is not continuously detected. No hidden-stage geometry or arbitrary DOM mutation watcher is claimed.
3. **Velocity idle boundary:** modern browser `scrollend` support is the normal idle reset. In a browser without that event, the last native skew may persist until blur, pointer cancellation, document hiding, another scroll sample or geometry refresh. There is deliberately no timer that fabricates a native velocity decay. The authored preview's neutral intervals do not certify native idle recovery.
4. **Native feature boundaries:** CSS sticky, scroll-snap, clip-path and CSS 3D perspective are required for their corresponding normal-motion mechanisms. An unsupported feature is not silently replaced by a different effect. The reduced representation retains content access but does not prove unsupported normal pin/snap/3D behavior.
5. **Segmentation boundary:** real text segmentation requires `Intl.Segmenter`; absence throws an explicit error and cleans the partial mount. There is no UTF-16 split fallback that could corrupt CJK/emoji graphemes. The study uses the browser's default locale and does not implement line-by-line or variable-font animation.
6. **Typography/performance:** all unit/illustration nodes are built once per creation. The text study does not cap, truncate or virtualize arbitrary large input, and grapheme-level inline blocks can produce different line wrapping from unsplit prose. Adapt real target text/locale/font/layout deliberately; use the target renderer's established text strategy for very long content.
7. **Direction/layout boundary:** the sample scrollports are explicitly LTR, and `inline-start` crop/physical horizontal transforms refer to this sample geometry. RTL/vertical writing, document-level scroll, nested application scroll locks, scroll history, dynamic content replacement and production navigation are not claimed. Rebind geometry and native authority in the existing target implementation rather than shipping a guessed direction shim.
8. **No production assets or state:** illustrations are original CSS/SVG shapes; there is no external fetch, upstream image, font, source script, backend or application router. Sample cards/chapters explain mechanisms but do not fabricate task completion or production story decisions.
9. **Provenance:** exact IDs, categories and short titles originate only from the assigned factual inventory `.items`. Mappings, Chinese labels, descriptions, rationale, parameters, choreography and illustrations are newly authored. No source code, long description or asset was copied; source redistribution licensing and visual fidelity are not asserted.



## Interaction and gesture mechanisms / 交互与手势机制

These 22 original branches pair **an independent timeline study** with **real native input in a separate local specimen**. Catalogue identity and short factual metadata are provenance, not source-fidelity evidence. No upstream implementation, assets or descriptive prose are included.

### Discovery / 查找

The exact source ID selects the mapping below. Every descriptor is prefixed `web.`; the table omits that prefix for readability. Teaching durations are authored study durations, **not** the source-displayed duration or the target application's latency budget.

|Exact source ID|Descriptor|Original mechanism / 原创机制|Study duration|
|---|---|---|---|
|`button-fill-hover`|`hover-fill-clip`|Left-origin rectangular clipping fill / 左侧矩形裁切填充|1100 ms|
|`card-spotlight`|`pointer-radial-spotlight`|Measured radial light field / 实测径向光场|1500 ms|
|`click-ripple`|`tap-origin-ripple`|Actual tap-origin radial expansion / 真实点击原点扩张|900 ms|
|`cursor-follow`|`pointer-lag-follower`|Separate target and finitely retargeted follower / 目标与有限迟滞跟随|1600 ms|
|`drag-inertia`|`drag-measured-inertia`|Timestamped velocity and analytic deceleration / 带时间戳速度与解析减速|1700 ms|
|`drag-snap`|`drag-nearest-slot`|Nearest discrete slot after free drag / 自由拖动后最近槽位|1500 ms|
|`hover-lift`|`hover-depth-lift`|Elevation plus depth shadow / 抬升与深度投影|1100 ms|
|`icon-morph`|`menu-close-path-morph`|Interpolated line endpoints and middle-stroke collapse / 线端点形变与中线收缩|1200 ms|
|`magnetic-button`|`magnetic-pointer-offset`|Bounded attraction inside a stable hit area / 稳定命中区内受限吸引|1500 ms|
|`pointer-tilt`|`pointer-perspective-tilt`|Measured X/Y surface normals in perspective / 实测双轴法线透视|1500 ms|
|`toggle-morph`|`toggle-thumb-glyph-morph`|Native checkbox, moving thumb, cross-to-check path / 原生复选框、滑块与叉勾路径|1300 ms|
|`ui-cursorarc`|`cursor-cubic-arc`|Cubic Bézier cursor geometry / 三次贝塞尔光标几何|1300 ms|
|`ui-fan`|`shared-pivot-card-fan`|Stable cards rotating about one shared pivot / 稳定卡片围绕共同枢轴|1400 ms|
|`ui-tooltip`|`hover-focus-tooltip`|Input-owned described tooltip / 输入拥有可描述提示|1000 ms|
|`bottom-sheet-drag`|`sheet-drag-detents`|Captured vertical drag and three detents / 捕获纵向拖动与三档|1600 ms|
|`drag-pickup`|`drag-pickup-depth`|Pick up, freely position and drop one card / 提起、自由定位与放下|1500 ms|
|`long-press-progress`|`elapsed-hold-confirm`|Actual elapsed release-time confirmation / 真实耗时、松开确认|1900 ms|
|`pinch-zoom`|`two-pointer-distance-zoom`|Two-pointer distance ratio and centroid anchor / 双指距离比与中心锚点|1500 ms|
|`pull-to-refresh`|`pull-threshold-local-refresh`|Resisted pull, release threshold and local revision / 阻尼下拉、释放阈值与本地版本|1600 ms|
|`reorder-drag`|`identity-preserving-reorder`|Gap preview and same-node order commit / 空位预览与同节点排序提交|1700 ms|
|`swipe-actions`|`swipe-local-action-reveal`|Real underlaid action buttons / 真实底层操作按钮|1300 ms|
|`swipe-dismiss`|`swipe-threshold-local-dismiss`|Threshold dismissal with same-node Undo / 阈值移除与同节点撤销|1300 ms|

### Supported parameters / 支持参数

Each row is one implemented mechanism, not an extensible `effect` label. All listed keys are **required**, numeric values must be finite, ranges are inclusive, and missing or unknown keys throw before mounting. No direction, glyph or gesture branch outside this table is silently substituted. Integer constraints and cross-field constraints are enforced in addition to the shared strict validator.

|Descriptor|Complete supported schema|Mapped values|
|---|---|---|
|`hover-fill-clip`|`durationMs`: 80–300|160|
|`pointer-radial-spotlight`|`radius`: 36–180 px; `strength`: .1–.7|110; .5|
|`tap-origin-ripple`|`radius`: 60–260 px; `durationMs`: 120–600|180; 360|
|`pointer-lag-follower`|`lagMs`: 0–240; `cursorSize`: 12–36 px|110; 22|
|`drag-measured-inertia`|`deceleration`: 350–2600 px/s²; `maxVelocity`: 200–1600 px/s; `studyVelocity`: 100–600 px/s, not above `maxVelocity`|900; 1200; 420|
|`drag-nearest-slot`|`slots`: integer 2–7; `durationMs`: 100–300|4; 180|
|`hover-depth-lift`|`liftPx`: 4–24; `durationMs`: 80–300|12; 160|
|`menu-close-path-morph`|`durationMs`: 100–300|180|
|`magnetic-pointer-offset`|`reachPx`: 4–28; `durationMs`: 60–240|18; 100|
|`pointer-perspective-tilt`|`angleDeg`: 3–22; `perspectivePx`: 220–900|12; 520|
|`toggle-thumb-glyph-morph`|`durationMs`: 100–300|180|
|`cursor-cubic-arc`|`bendPx`: 20–110; `durationMs`: 80–300|85; 160|
|`shared-pivot-card-fan`|`count`: integer 3–7; `spreadDeg`: 8–24; `durationMs`: 80–300; outer angle `(count−1)×spreadDeg/2` must not exceed 55°|5; 16; 180|
|`hover-focus-tooltip`|`offsetPx`: 4–20; `durationMs`: 100–220|8; 140|
|`sheet-drag-detents`|`travelPx`: 100–160; `durationMs`: 120–400|150; 220|
|`drag-pickup-depth`|`liftPx`: 4–24; `scale`: 1.01–1.12|12; 1.06|
|`elapsed-hold-confirm`|`holdMs`: 500–3000; `slopPx`: 4–30|1100; 14|
|`two-pointer-distance-zoom`|`minScale`: .5–1; `maxScale`: 1.5–4; `studyScale`: 1.2–3 and not above `maxScale`|.75; 3; 1.8|
|`pull-threshold-local-refresh`|`thresholdPx`: 40–100; `resistance`: .25–.7|70; .5|
|`identity-preserving-reorder`|`count`: integer 3–6; `rowHeightPx`: 44–64|4; 54|
|`swipe-local-action-reveal`|`revealPx`: 100–160; `threshold`: .2–.8 of reveal distance; `durationMs`: 100–300|132; .45; 180|
|`swipe-threshold-local-dismiss`|`distancePx`: 60–180; `fadeStart`: .2–.7 of authored progress / local distance ratio|120; .45|

`durationMs` and `lagMs` configure finite native presentation, not the teaching timeline. Parameters without a native duration use direct manipulation or explicit timing described below. Colors, dimensions and sample names are study defaults; existing project tokens override them during adaptation.

### Trigger, phases and endpoint / 触发、阶段与终点

`p` below is independent normalized study progress, not native input time. All study poses are recalculated from `p` and parameters; they have no prerequisite previous frame. Gallery reverse/cold seek can inspect any pose without executing a gesture.

|Mechanism|Native trigger and logical endpoint|Authored study phases|
|---|---|---|
|Fill|Hover/focus requests a filled clip; leaving/blur requests empty. Enter/Space counts a local activation. Repeated pointer movement does not restart the same hover transition.|0→1 smooth expansion from empty to full clip.|
|Spotlight|Pointer coordinates locate a radial gradient; focused arrows move the local light center. Enter/Space counts local activation.|A finite left-to-right light sweep with a curved vertical center; radius and strength remain exact.|
|Ripple|Pointerdown records the actual button-relative origin. Click activates a finite ripple; keyboard activation deliberately uses center. Activation count is event-owned.|Fixed authored 32%/60% origin, radius growth and opacity decay. End is the settled surface, not an activation commit.|
|Follower|Yellow target follows pointer/arrow coordinates immediately; green follower retargets from its sampled current transform over `lagMs`. Home resets; activation centers the local target.|Target travels through progress 0–.75; follower starts `lagMs/1600` later and settles before 1. A zero lag makes them coincide.|
|Inertia|Drag is direct. Release velocity comes from the most recent ≤90 ms timestamped position samples and is capped by `maxVelocity`. Its computed final position commits immediately; finite motion is presentation only.|0–.4 authored drag to x=78 in a 290-unit travel space; .4–1 evaluates the analytic coast from `studyVelocity`, finishing at its bounded endpoint. This teaching segment is time-scaled, not a physical wall-clock simulation.|
|Snap|Release selects the nearest of `slots` measured positions; arrow/button input commits an adjacent slot without fabricating drag velocity.|0–.6 free drag to 68% travel; .6–1 settle to the nearest supported slot.|
|Lift|Hover/focus requests depth; a native activation toggles the sample's local saved state and `aria-pressed`.|0→1 elevation and shadow depth. No saved state is inferred from this pose.|
|Menu/close morph|Enter/Space/click toggles the local glyph. The button does **not** pretend to open a menu.|All three corresponding path segments interpolate; middle stroke collapses while outer strokes form an X.|
|Magnet|A stable outer hit area measures pointer position; displacement is limited to `reachPx` on each axis. Leaving returns to center; keyboard arrows offer offset control.|One bounded sideways/vertical attraction excursion ending at center; no repeated cycle is started.|
|Tilt|Stable outer coordinates rotate X/Y normals with `perspectivePx`; focus plus arrows provides the same input path. Home resets.|One finite two-axis orientation sweep.|
|Toggle morph|The labelled native checkbox is authority. Change updates thumb geometry and an actual cross/check two-segment path.|0→1 thumb travel and continuously corresponding path endpoints. The study cannot check the checkbox.|
|Cursor arc|Real pointer/key endpoints and current visual cursor pose generate cubic control points offset along the chord normal. A finite nine-sample native path retargets the cursor.|Evaluate a fixed cubic curve from (30,145) to (330,125); `bendPx` changes both control-point heights.|
|Fan|A native button requests fold/spread; each existing card remains individually focusable and selectable.|0→1 per-card angles around the shared pivot, not uniform translation.|
|Tooltip|Hover/focus reveals the described tooltip; touch/click can pin it. Escape suppresses until new entry/refocus, and blur closes. Hovering the hint remains within its local hover area.|.15–.65 enter using `offsetPx` and opacity; then stable readable hint.|
|Bottom sheet|Captured handle drag clamps vertical offset. Release chooses peek/half/open detent; explicit buttons and keyboard commit the same detents.|0–.7 travel toward 84% open; .7–1 settle fully open.|
|Pickup|Pointerdown lifts, movement directly positions, release drops freely. There is no slot or automatic reordering. Keyboard pickup/move/drop updates the same local card.|.15 lift; .2–.85 move; .85 drop; endpoint is a static placed card.|
|Hold|Pointer or Enter/Space down starts native elapsed time. **Matching release** confirms only after `holdMs`, otherwise rejects. Progress is decoration, never the deciding signal.|.1–.8 linear progress toward the hold threshold; .8–1 static threshold-reached explanation. No native confirmation is fired.|
|Pinch|Only two actual tracked pointers supply distance and midpoint; their ratio and anchor determine local map zoom/translation. Last release retains the view.|0→1 scale from 1 to `studyScale`; two illustrated pointer positions reflect the distance increase.|
|Pull refresh|Resisted positive pull reaches `thresholdPx`; release then increments the existing local rows' revision. Explicit refresh button is equivalent local authority.|0–.65 pull to 115% threshold; at .65 study rows show revision 1; .65–1 return content.|
|Reorder|Drag previews a gap without committing order. Release splices the local identity array and moves **the existing DOM rows**. Keyboard moves those same identities.|.1–.9 move the first row to the last position while all remaining rows shift one row height; endpoint preserves all study identities.|
|Swipe actions|Left drag reveals a real action tray; release compares actual displacement to `revealPx×threshold`. Explicit reveal/close and item keyboard activation are alternatives. Archive/Mark only toggle local state.|0→1 translate the item to expose its underlaid tray.|
|Swipe dismiss|Right drag release at `distancePx` hides this local item and focuses Undo. Button/Delete also dismiss; Undo restores the **same node** and focuses it.|0→1 finite travel to 1.5×distance with decay starting at `fadeStart`; reduced mode substitutes a static dismissed/Undo explanation.|

#### Inertia is not snapping / 惯性不是吸附

Native `drag-measured-inertia` uses position differences divided by event-time differences, in px/s. Let release velocity be `v`, constant positive deceleration be `a`, and signed travel direction be `sign(v)`:

- Natural travel distance is `v²/(2a)` and natural time is `|v|/a`.
- A container edge truncates travel. The bounded time is solved from `distance = |v|t − at²/2`; it is not an invented fixed transition duration.
- The finite native transform curve uses this same quadratic displacement, including an early collision with an edge. No slot, grid, spring or easing name chooses the destination.
- A new drag during coasting samples the finite animation's current time, evaluates the current analytic position, then cancels that animation before taking new samples. Keyboard commands stop coasting and move 24 px or to Home/End; they never invent a release velocity.
- A held-still release, one usable timestamp or a zero time interval produces zero velocity. Samples older than the release window cannot create a stale flick.

This is a bounded one-dimensional teaching model: constant deceleration, no bounce, friction variation, multidimensional collision or persistent physics engine.

#### Pinch and reorder authority / 双指与排序权威

Pinch tracks at most two pointer IDs and measures **both actual positions**. The second pointer establishes baseline distance and a world-space anchor at the midpoint. The content transform retains that anchor under midpoint translation and distance-ratio scaling. One pointer never becomes a fake pinch; after one pointer releases, zoom pauses until another valid pair establishes a baseline. The first pointer starts the rollback snapshot, and cancelling the still-active gesture restores it. Plus/minus buttons and keys intentionally change scale by .2, rather than manufacturing pointer distance.

Reorder uses original keyed rows (`row-0`…`row-N`) and native `<ol>/<li>` DOM order. Pointer movement only offsets rows to expose the candidate gap. On commit, the order array is spliced and those same rows are appended in the committed order; no card is cloned or recreated. Focus returns to the moved handle. The timeline has its own original rows and cannot change this native order.

### Input authority, interruption and resources / 输入权威、打断与资源

**The two panels never share semantic state.** The study panel is decorative, `aria-hidden` and inert. Every `finish(render)` call writes only its study elements; native model values, `checked`, `hidden`, order, status, focus, pointer collections and finite animation handles are only changed by native input handlers or disposal. Seeking does not cancel a native hold, pinch, drag or animation, and does not resurrect a dismissed native item. A study endpoint is not proof of a native action.

There is no RAF/request loop, interval, recurring timeout or automatic domain callback. Native presentation uses bounded CSS hold progress or finite WAAPI animations with one iteration. The gallery owns study playback. Replacing native motion cancels the previous owned animation; finishing only removes the presentation animation and never commits an application operation. No DOM is created by study render.

Single-pointer drags accept the primary left/touch pointer, listen for matching movement/release on the document and request pointer capture. A browser capture failure does not orphan release ownership because those recorded document listeners still receive pointer events. The final release coordinates are included before choosing the endpoint. Pointer cancellation, lost capture, Escape, handle blur, window blur and document hiding cancel an active drag. Disposal releases captures and removes the recorded listeners and owned animations. Pinch releases both captures and clears its tracked pointers on cancel/dispose. Hold also clears its progress transition and active pointer/key on cancel/dispose.

|Branch|Cancel/interruption result|
|---|---|
|Pointer fields|Leave/blur resets the local field intent or coordinate center. Reduced mode removes optional spatial decoration. Finite retargeting samples the current visual transform where applicable.|
|Ripple|Pointer cancel/blur clears an unused origin and cancels its owned ripple presentation; activation count is not undone by seek.|
|Icon/toggle|New activation retargets compatible SVG path geometry from current computed presentation; blur settles to the input-owned endpoint. Checkbox authority never waits for animation.|
|Tooltip|Escape, pointer cancel and blur remove the semantic description/visibility immediately; no delayed show/hide callback can reopen a cancelled hint.|
|Snap/sheet|Cancelled drag restores the committed starting slot/detent, even if an earlier finite settlement was interrupted.|
|Inertia|Cancelled drag restores its starting position and commits no release velocity. Native input can interrupt an existing coast; an animation finish never supplies logical position.|
|Pickup|Escape/blur/cancel restores the pickup snapshot instead of dropping. Keyboard pickup also cancels on window blur/document hiding.|
|Hold|Movement beyond `slopPx`, wrong/early release, Escape, blur, hidden document, lost capture and pointer cancel never confirm. Only matching native release time can confirm.|
|Pinch|Cancellation restores the view captured at the first pointerdown of the active gesture. No later animation is allowed to replace that state.|
|Refresh|Cancel resets pull presentation without incrementing local revision; below-threshold release is unchanged.|
|Reorder|Cancel removes gap offsets and leaves the original local order and row identities intact.|
|Swipe actions|Cancel restores the starting open/closed state. A drag-generated click is suppressed; keyboard activation remains available.|
|Swipe dismiss|Cancel/below-threshold release retains the item. Only an accepted native release or explicit action hides it. Undo retains node identity.|

### Keyboard, focus and no-motion / 键盘、焦点与无动画

Native buttons use Enter/Space and a visible focus ring; their hit height is at least 44 px. No browser focus indicator is removed. Labelled checkboxes retain native checkbox behavior. SVGs and timeline controls are decorative, not fake accessible inputs. Pointer coordinates are always measured against an owned local area; an ornamental cursor never replaces the operating-system cursor.

|Native mechanism|Non-pointer access|
|---|---|
|Fill, spotlight, lift, magnet, tilt, follower, arc|Tab to the native button; Enter/Space activates. Spotlight/follower/magnet/tilt/arc support arrows and Home to move/reset their field. Pure hover effects also respond to focus.|
|Ripple|Enter/Space activates at the documented center origin.|
|Icon and toggle|Native button/labelled checkbox; no separate SVG click target is required.|
|Fan|Fold/spread button plus individually focusable stable card buttons. A focused card rises in stacking order for visibility.|
|Tooltip|Focus exposes the actual described hint; Enter/Space can pin; Escape closes; Tab away closes. No focus trap or interactive controls are hidden inside the tooltip.|
|Snap|Focused drag button Left/Right/Home/End, plus explicit Previous/Next buttons.|
|Inertia|Left/Right moves 24 px; Home/End selects a bound; Escape stops the coast. Explicit Left/Right buttons provide the same local positioning.|
|Sheet|Focused handle Up/Down/Home/End, plus explicit peek/half/open buttons. This is not a modal and creates no focus trap.|
|Pickup|Enter/Space picks up or drops; arrows move 12 px; Escape or blur restores the pre-pickup position.|
|Hold|Enter/Space down/up uses the same measured elapsed threshold, ignores repeated keydown and cancels on Escape/blur. A plain click cannot confirm.|
|Pinch|Focused area +/− and Home, or labelled zoom buttons. Escape cancels an active two-pointer gesture.|
|Refresh|Explicit labelled local Refresh button; a gesture is never required to update the specimen.|
|Reorder|Focused row Up/Down/Home/End immediately moves the same row identity; focus follows it.|
|Swipe actions|Item activation or Left/Right/Escape, plus explicit Reveal/Close and native action buttons. Closed tray is inert and absent from accessibility navigation.|
|Swipe dismiss|Focused item Delete/Backspace or labelled Dismiss button; Undo restores the same item and focus. A Right key adjusts its local offset without inventing a fling or implicit confirmation.|

Reduced studies show a static meaningful endpoint: full fill/light, static ripple mark, coincident target/follower, intended card position, completed path/glyph/selection, fully spread deck, readable tooltip, open sheet, placed card, elapsed-threshold explanation, intended map scale, local revision 1, final identity order, exposed action tray, or dismissed/Undo explanation. They have no travel, shake, spinner, flashing or repeated emphasis.

Reduced native interaction remains functional: direct user drag/pinch responds to actual input; optional lag, ballistic settlement animation, magnetic travel, tilt, lift scaling, ripple celebration and morph travel are omitted. Logical destinations, checked values, cancellation thresholds, order, confirmation text and Undo remain correct. Hold's optional time-filling bar is suppressed while reduced; release still measures real elapsed time. Do not disable important input or messages just to disable motion.

Use optional hover/depth/light feedback only where it helps express current intent. Run a ripple once per user activation, spread/tooltip transitions only on actual requests, and gesture settlement only after actual manipulation. No periodic attention or automatic confirmation is introduced. In production use no motion for repeated utility actions when immediate state is clearer; preserve direct manipulation and text feedback.

### Reuse and limitations / 接入与边界

These are **offline DOM/CSS/SVG studies**, not a new production interaction runtime. Reuse the target project's native controls, gesture arbitration, existing sheet/menu/list primitives, state model and renderer. Adapt the actual mechanism into its owned presentation channel:

- CSS clip/radial field for fill/spotlight; one owned clipped radial layer for tap feedback.
- CSS transform/depth/perspective for follower, magnetic offset, tilt, pickup and sheet detents; finite WAAPI retargeting where the renderer already supports it.
- Corresponding SVG `d` commands for menu/close and cross/check; separate native checkbox authority. This is path-coordinate morphing, not an opacity swap.
- Explicit cubic control points for cursor arc and shared pivot/individual angle geometry for fan.
- Native described tooltip visibility, native keyed list order and explicit focus restoration, rather than visual styles acting as domain state.
- Actual timestamped position samples for inertia, actual two-pointer distance for pinch, and actual release thresholds for pull/swipe. Never use gallery progress as a request result or gesture distance.

Keep the current project's DESIGN.md, MOTION.md, motion tokens, measured geometry, operational timing and reduced-motion policy authoritative. The 100–400 ms native transition examples and longer teaching durations do not introduce another token scale. A production retarget must sample its current presentation and invalidate old cleanup before taking new intent; do not derive logical state from the transformed pixels.

**Deliberate limits:**

1. All native effects are local to the mounted specimen. Save/archive/mark/dismiss/order/revision/confirmation do not call a server, modify account state, persist across mounts or navigate. Refresh has no fabricated pending request, loader or asynchronous success. Hold confirms on release, not automatically while held; it is not production approval or security enforcement.
2. Native Pointer Events and SVG support are assumed. WAAPI supplies finite native presentation when available; without it the input-owned endpoint is applied directly, so follower lag/coasting/morph playback is unavailable. Inertia explicitly reports this limitation in its local status. It still computes actual release velocity and bounded physical endpoint; it does not substitute snapping. SVG CSS `d` animation additionally needs the renderer/browser's compatible path-interpolation support; deterministic study interpolation and native final glyph geometry do not depend on that animation support.
3. Arc native playback uses nine finite samples of a true cubic curve, not a frame loop or recorded human motor model. Its control points are clamped inside the local drawing area, so edge gestures reduce the requested bend rather than losing the cursor outside the surface. Fan rotation is a bounded local deck; narrow production layouts need suitable card size/spread rather than assuming the specimen's desktop dimensions.
4. The sheet is non-modal with exactly three detents. It does not implement scroll locking, navigation, modal focus trapping or scroll/drag handoff. Tooltip is text-only and locally placed, not a full viewport collision/portal primitive. Reuse an existing governed tooltip/sheet primitive for those requirements.
5. Pinch changes only its local map. It supports two simultaneous pointers, anchor-aware scaling and pairwise midpoint translation, not rotation, one-finger panning, browser page zoom, inertia or offscreen-content bounds. One pointer never supplies synthetic pinch velocity or distance.
6. Pull refresh uses a dedicated bounded specimen and locally resisted drag. It does not replace native browser overscroll, implement a scrolling feed or resolve nested-scroll gesture competition. Production must begin only at the real scroll boundary and bind refresh completion to the actual operation.
7. Reorder is a single fixed-height list, not cross-list, virtualized, nested or variable-height sorting. Each original row identity and DOM node is retained. Swipe actions exposes one left-side travel convention with local reversible actions; dismiss is a rightward local threshold with explicit Undo, not irreversible deletion.
8. Native gesture semantics and application authority must not be inferred from authored studies. The fragment has not itself run browser/runtime/build/test/lint/formatter checks in this assignment; the integration owner supplies exercised evidence. Metadata coverage, executable branch verification, source visual fidelity and owner visual acceptance are separate claims.


## Layout, identity and native surfaces / 布局、身份与原生层

|Descriptor|Implemented branches and exact parameter contract|Scenario / 场景|
|---|---|---|
|`web.measured-reflow`|`effect`: grid-reorder / masonry-filter; integer `count`4–8, integer `columns`2–4≤count; `gapPx`6–24; `durationMs`80–280|FLIP身份重排 / measured identity reorder; filtering retains surviving entities, masonry uses different content heights.|
|`web.intrinsic-height`|integer `paragraphs`2–5; `durationMs`80–280|原生details折叠、自然换行高度 / native accordion and intrinsic height.|
|`web.shared-identity`|`effect`: shared-art / detail-row / hero-art / modal-shell; `targetRatio`.55–.95; `durationMs`80–280|同一实体跨列表/详情/主图/模态 / same entity across list, detail, hero and modal.|
|`web.native-top-layer`|`effect`: dialog / popover / command / modal / spring-sheet; `durationMs`80–280; `offsetPx`4–24 **only popover**; `travelPx`8–48 **only modal**; `overshoot`.02–.12 **only spring-sheet**|真实顶层、命令检索、模态焦点 / native top layer and searchable command surface.|
|`web.discrete-presence`|`exitDistancePx`4–24; `durationMs`80–220|立即关闭语义，当前退场结束才离散隐藏 / semantic close before visual display removal.|
|`web.navigation-disclosure`|`effect`: menu-origin / sidebar / stagger-nav; `durationMs`80–280; `widthRatio`.24–.44 **only sidebar**; `travelPx`4–28 **only other branches**; `staggerMs`12–48 **only stagger-nav**, 2×staggerMs<durationMs|菜单、真实占位侧栏、逐项导航 / menu, intrinsic sidebar, staggered destinations.|
|`web.measured-tabs`|integer `fromIndex/toIndex`0–2 and distinct; `durationMs`80–220|真实页签选择和独立实测指示器 / actual tab selection and measured underline.|

### Triggers, phases and authority / 触发、阶段与权威

Layout studies use fixed authored endpoints measured from connected elements. Reflow interpolates before/after rectangles and the actual filtering result; intrinsic height opens its independent preview between .1–.8; shared identity and tabs interpolate geometry between .12–.84. Native intent is immediate and separate: buttons change the real order/filter, `details.open` owns collapse, actual tabs own `aria-selected` and panels, and A17 retains the same DOM identity and Save state when moved between list and detail. No study seek moves the actual entity, opens a modal or commits selection. Shared-art/hero-art measure the retained image; detail-row/modal-shell measure the retained shell. Text is naturally reflowed, never scaled as a bitmap.

Top-layer preview phases are enter .05–.4, hold to .72, then exit to1; spring-sheet uses measured height and bounded overshoot, not unbounded travel. Native dialog uses `showModal`, Escape/cancel and close; popover uses `showPopover`, real trigger geometry plus offset and light-dismiss semantics. Missing Dialog/Popover APIs fail explicitly rather than masquerading as modality. Command search filters an actual local command list; arrows/Home/End and activation work inside the real surface; Ctrl/Meta+K is local to the study. These commands navigate only authored local content, never invoke a service.

Navigation disclosure previews enter .08–.78; stagger offsets are explicit per destination. Native sidebar occupies real flex space and causes text to reflow. Menu items support arrow/Home/End, Escape and focus return. Native tabs use roving tabindex and arrows/Home/End; varying label widths and wrapping are measured rather than estimated. In production reuse existing menu-switch state/revision discipline and the current renderer's menu/tab primitives. Never infer selection from indicator position.

Discrete presence makes a dismissed panel inert immediately and returns focus before retaining its painted exit. Only the current native completion may set hidden; cancelling and reopening invalidates older completions. Its independent preview exits .15–.84 then explicitly reaches `display:none`. This is a dedicated semantic/display lifetime mechanism, not a fallback for other concepts.

### Continuous input, geometry and reduced motion / 连续输入、几何与减弱

Native motion is bounded WAAPI, never a permanent loop. ResizeObserver, window resize and font loading trigger remeasurement. Changes cancel the existing visual interpolation and restore authoritative layout before measuring; disconnected or zero-size studies show natural content rather than claim a measured rectangle. Reverse/cold seeks touch only presentation. Dispose disconnects observers, cancels owned animations, closes owned native layers, removes registered listeners and the owned subtree. Rapid native requests invalidate older completion callbacks. Focus restoration belongs to native state changes, never to timeline frames.

Reduced mode skips native travel and presents meaningful static preview outcomes: expanded readable text, destination geometry, open surface, selected underline, or an explicitly dismissed result. Forms/Save state remain usable. Production should also suppress unnecessary emphasis, not hide important result text. Trigger transitions once per actual user action, not on every render; use no motion where a direct layout or semantic change is clearer. Adapt measured boxes/FLIP, CSS intrinsic layout, clipping and WAAPI into existing primitives/tokens; this gallery is not a layout engine or second runtime.

## Page compositing and local history / 页面合成与本地历史

`web.route-compositing` uses eight real compositing branches. All require `effect` and `durationMs`120–400. Parameters irrelevant to the selected branch are rejected:

|Effect|Additional required parameters|Mechanism|
|---|---|---|
|slide|`distance`40–180|Incoming page travels from outside its full width; outgoing page moves in the opposite direction.|
|stack|`distance`40–180|Incoming front layer advances while old page scales back; real local forward/back stack preserves each page's note input.|
|crossfade|none|Two distinct pages have independent reciprocal opacity; no shared-identity claim.|
|wipe|none|Rectangular inset clipping reveals the new page over the old page.|
|circle|`originX/originY`0–100|An explicitly positioned circle reveals the new local DOM page.|
|view-circle|`originX/originY`0–100|Native `document.startViewTransition` captures a uniquely named local container; its new snapshot is circularly clipped using real container geometry. The API is required; unsupported browsers fail explicitly.|
|flip|`perspective`400–1200|Two pages act as opposite card faces with perspective, Y-axis rotation and hidden backs.|
|parallax|`distance`40–180, `backgroundRatio`.15–.6|Page foreground and original CSS texture background have distinct relative displacement.|

Native Open A/B changes local requested route; Back or Alt+Left uses the specimen's actual local stack. It deliberately does **not** push/replace browser history, overwrite gallery hashes or install an application router. Each page keeps its input node/value. Route changes mark inactive content inert, preserve requested state during cancellation and focus the destination heading. Real view transitions are only initiated by native route intent, never by seek. Reduced native routing is instantaneous. Resize/dispose cancels owned animation and snapshot transitions; delayed snapshot callbacks are generation-guarded. Playback's separate noninteractive A→B layers interpolate .08–.9; cold/reverse never navigates.

Use motion on actual hierarchy changes only, and skip it when it delays reading or makes repeated navigation distracting. Production must bind direction/history to its existing router and committed route state, use actual shared identity when it exists, and retain existing focus/announcement handling. The snapshot branch may capture the surrounding document as part of the browser's View Transition implementation; only its unique container receives these authored custom styles. This is an original local mechanism study, not a source-identical route implementation or proof of production routing/fidelity.


## Controls, forms and measurement / 控件、表单与计量

Discovery: 按压 press · 确认 confirmation · 选择 selection · 行内校验 inline validation · 进度 progress · 占比 share · 乐观回退 optimistic rollback. The exact item selector and bilingual catalogue names lead to the mapped original branch; an item name is not a fidelity claim.

|Descriptor|Implemented branches and supported parameters|Trigger, phases and final state|
|---|---|---|
|`web.button-deformation`|`effect`: bounce, squash, push-depth, inner, wobble, error, heartbeat, elastic; `amount` 2–32; `cycles` 1–4 **only** for bounce/wobble/error/heartbeat/elastic|Press/failure/intent study: rest → maximum bounded geometry/inset/depth change → rest. Error retains a readable Retry label. Elastic has actual pointer capture and release/cancel, in addition to the independent study trajectory.|
|`web.button-surface`|border SVG stroke; gradient color field; splash circular clip; sweep rectangular clip; glow shadow; shine highlight; ripple tap-position clip; confetti radial particle paths. `extent` 40–240 only splash/ripple/confetti; `cycles` 1–3 only gradient/glow|Tap/confirmation or opt-in emphasis: 0–1 authored reveal or bounded pulse. Actual tap coordinates are measured against the button rect at input time. No perpetual attention loop is started.|
|`web.button-state-morph`|hold (`holdMs` 500–3000), icon, loading, send, shape; other branches reject holdMs|Hold has real pointer/Enter/Space hold-time confirmation **on release**, and cancel/blur rollback. Other branches have native local activation state plus independent shell/path study. Loading/send are explicitly illustrative, never a fabricated request.|
|`web.control-indicator`|bubble circle radius; jump parabolic dot; blob Bézier contour; stretch liquid bridge; pill occupied rectangle; underline rectangle; spring bounded overshoot; tint RGB state. `settleAt` .5–1|Study of A → B selection, completing by settleAt. Real labelled checkbox commits immediately; seeking changes only preview geometry.|
|`web.control-glyph`|check stroke; day/night occlusion; heart contour/fill; lock shackle opening; mute cross/sound symbol; play/pause polygon topology. `settleAt` .5–1|Local binary state and separate independently seekable glyph transition. Heart/play/lock are actual shape or topology changes, not renamed fades.|
|`web.form-field-state`|label, validation, strength; `minLength` 3–12|Actual labelled input and focus lift the label; validation checks local length; strength counts three clearly labelled sample rules. The password meter is **not** a security guarantee. Study preview does not overwrite typed text, focus, validity or checked state.|
|`web.form-submit-state`|`completionAt` .4–.9|Native form validation and local submit acceptance; no network. Separate SVG shell rounds and check stroke draws only after the authored study completion phase. Production derives this phase from confirmed operation state.|
|`web.upload-progress-state`|`target` 10–100|Optional native file selection reads neither bytes nor contents. A clearly labelled local simulation advances in 25% steps; independent visual study fills toward target. It is not an upload service.|
|`web.skeleton-content`|resolve (`revealAt` .3–.8), shimmer (rejects revealAt)|Resolve replaces placeholder lines with readable authored content after its phase; shimmer crosses clipped placeholder geometry. Actual request resolution must own production replacement.|
|`web.value-chart`|line, bars, donut; `valueA/B/C` 1–100; `stagger` 0–.2 only bars/donut|Line coordinates and bar heights encode the actual A/B/C values. Donut shares divide by their actual sum; stagger changes reveal timing, not data. Numeric labels remain present throughout.|
|`web.determinate-progress`|track or circle; `target` 0–100|Horizontal fill or arc length encodes percentage with readable `/100` output. Production uses completed work, never elapsed animation time, as authority.|
|`web.numeric-interpolation`|`start/end` 0–10000|Interpolate a displayed integer between explicit measurements; the actual endpoint is separately labelled. Not an ersatz fetch or rolling random digit effect.|
|`web.pending-cycle`|dots or arc; `cycles` 1–5|Phase-separated dot trajectories or open arc rotation/span. Both are explicitly indeterminate and never pretend to report completion percentage.|
|`web.optimistic-transaction`|`base` 0–99; `increment` 1–9|Study: committed baseline → pending increment → baseline restoration. Separate native request/accept/reject controls exercise both outcomes of a local transaction and disallow a second unresolved increment. No asynchronous response is fabricated.|
|`web.toast-stack`|`gap` 8–24; integer `count` 1–3|Gap-dependent original notice stack reveal. Native notice slots can be dismissed/restored independently. Seeking cannot resurrect a dismissed native slot. No automatic semantic expiration.|

### Authority, interruption and accessibility / 状态权威、打断与无障碍

Every study has a bounded `seek(0…1)` presentation channel. Native counts, typed inputs, checkbox choices, file selection, confirmation and transaction state are separate variables or native properties; seek never commits them. Do not read transformed geometry or opacity to infer app state. A native action updates intent immediately. In production, keep the existing menu-switch specimen's requested-state/revision discipline: retarget from current visual position; invalidate older completion cleanup; a cancelled exit must not hide newer content. The studies have no delayed domain callbacks and start no uncontrolled loop. Dispose releases recorded listeners/captures and removes only the owned subtree. Native state is deliberately local to a mounted specimen, not persistence across recipe switches.

Use labelled native buttons, inputs and form submission: Enter/Space activates, Tab preserves natural order, and visible browser focus is not removed. Hold confirmation uses Enter/Space down/up, ignores key repeat and cancels on blur. Production checkbox/switch glyphs are decorative beside a true checked control; do not turn the SVG into a fake accessible control. For multi-option indicator adaptation use native radio or existing tabs with their keyboard contract, not a checkbox masquerading as tabs. Success/error must be available in text; bind actual production messages to the current accessible status channel, not a per-frame live region. Toast dismissal must restore a meaningful nearby focus target in the target renderer; destructive notices must not expire automatically. Real dialogs/navigation focus contracts are described in the layout section.

Reduced studies use readable intended result or static pending feedback: no shake, travel, moving shimmer, heartbeat, spinner rotation or confetti. Native input remains effective. Static progress retains its explicit target; optimistic rollback retains the real baseline; charts retain original values and exact proportions. Suppress optional hover/press celebration entirely for reduced-motion production; never suppress important error/result text. Use state changes as often as users request them; use confirmation once per actual completed action and avoid recurring attention. Pending repeats only while the real operation remains pending; use no motion when no state change or explanation benefits.

### Reuse existing renderer / 接入当前渲染器

These are offline DOM/CSS/SVG studies, not a new production runtime. Reuse the current component's native input/state model and existing project primitive where available. The motion channel is explicit: transforms and inset shadow for deformation, CSS clipping/gradient for surface, SVG path/occlusion for glyph, measured rect for tap origin, SVG stroke/ratio for charts. Transfer branch equations into the existing CSS/WAAPI/renderer channel; keep the current project's DESIGN.md, MOTION.md, motion tokens, operational latency and reduced-motion policy authoritative over sample colors and teaching duration. Do not import this gallery's elapsed progress as loading, upload, confirmation, selection or real data state. A production render uses actual values and relationship data, not the examples' fixed measurements.

The sample minimum length/strength checks, request phases and send/submit success are original teaching interpretations of catalogue identity, not source-verified business rules. No network, upstream code, assets, licence inference or production fidelity claim is included.


## Data relationships, loading and local feedback / 数据关系、等待与本地反馈

All rows below name dedicated descriptors, not aliases of a fade. Required parameters and bounds are explicit; integer parameters are marked `integer`. Unknown, missing or out-of-range values are rejected. Source short titles remain catalogue metadata; these authored scenarios and datasets are original.

|Descriptor / discovery|Supported author parameters|Actual mechanism / 原创机制|
|---|---|---|
|`web.data-budget-bloom` · 径向预算 / Radial budget|`total:[40,400]`|用比例扇区展示三项预算，金额总和保持为总预算。|
|`web.data-calendar-density` · 日历密度 / Calendar density|`peak:[4,24]; integer peak`|四周日期格以固定每日计数编码密度并逐日显露。|
|`web.data-cluster-merge` · 簇成员合并 / Cluster membership merge|`separation:[40,100]`|两组六条记录归入一个十二条记录簇，保留原始成员身份。|
|`web.data-confidence-band` · 预测区间 / Forecast confidence band|`uncertainty:[8,26]`|预测中线两侧显示随预测期限扩大的上下界。|
|`web.data-delta-split` · 对比分差 / Diverging comparison delta|`change:[8,35]`|基线柱和以零为中心的正负差值分栏比较。|
|`web.data-event-domino` · 事件前置链 / Prerequisite event sequence|`lag:[.1,.22]`|按前置依赖显露四个事件节点与固定账本数量。|
|`web.data-goal-projection` · 目标趋势投影 / Goal trend projection|`goal:[80,140]`|实测折线之后用虚线曲线投影到明示目标线。|
|`web.data-heatmap-focus` · 热图邻域聚焦 / Heatmap neighbourhood focus|`gain:[.6,1.4]`|固定热图数值保留，用轮廓扩展解释所选单元邻域。|
|`web.data-kpi-relay` · 指标接力聚焦 / KPI spotlight relay|`target:[60,100]`|三项百分比卡保留数值与目标门槛，聚焦框依次换位。|
|`web.data-milestone-gates` · 里程碑跨门槛 / Milestone threshold crossing|`end:[70,100]`|完成量沿进度轨道前进，仅在跨过阈值后点亮里程碑。|
|`web.data-odometer-cascade` · 多指标滚轮 / Metric odometer cascade|`increment:[10,90]; integer increment`|三项明确起止整数用十进制数字滚轮错峰更新。|
|`web.data-queue-compression` · FIFO队列压缩 / FIFO queue service|`served:[1,3]; integer served`|队首任务移入完成通道，待办队列按原顺序补位。|
|`web.data-rank-ladder` · 名次重排 / Value-driven rank reorder|`gain:[12,32]`|某组分数增加后，柱条按终点值稳定排序换位。|
|`web.data-sankey-conservation` · 守恒流量 / Conserved Sankey flow|`total:[40,120]`|用带宽表示两源两目标间四条流量，节点与流量合计守恒。|
|`web.data-sentiment-spectrum` · 情绪分布迁移 / Sentiment distribution shift|`shift:[5,20]`|负面份额转到正面，三个区间的总份额一直保持百分之百。|
|`web.data-signal-map` · 信号位置与强度 / Signal map strength|`strength:[.6,1.4]`|四个固定坐标的点面积编码信号量，轮廓表示一次采样。|
|`web.data-stacked-stream` · 堆叠流图 / Conserved stream stack|`variation:[.5,1.5]`|三条时间序列按共享累计边界构建面积层，数值倍率驱动厚度变化。|
|`web.data-threshold-crossing` · 阈值越界告警 / Threshold crossing|`threshold:[50,72]`|固定折线上逐样本比较阈值，高值采用持续颜色而不闪烁告警。|
|`web.data-timeline-trail` · 时间轴数据拖读 / Time-series scrub trail|`window:[2,5]; integer window`|原生滑条选择数据点与此前窗口，虚线游标仅属教学时间轴。|
|`web.data-network-topology` · 显式邻接网络 / Explicit adjacency network|`radius:[65,92]`|六个节点按确定位置展开，八条连线来自明确邻接表。|
|`web.data-map-pins` · 有坐标的地图点 / Coordinate map pins|`drop:[25,70]`|带计数的地图针落到固定样本坐标，保留地点身份。|
|`web.data-scatter-relation` · 二维散点关系 / Bivariate scatter reveal|`slope:[.5,1.2]`|数值坐标与残差定义散点关系，逐点显露不改变观测值。|
|`web.data-stat-comparison` · 统计卡差值 / Stat card numeric comparison|`value:[60,240]`|统计卡从明确基线解释到当前值的数值差与百分比。|
|`web.loading-bouncing-dots` · 弹跳等待点 / Bouncing pending dots|`bounce:[12,38]`|三个等待点按错位正弦正半周期改变高度，无进度百分比。|
|`web.loading-equalizer-bars` · 高度节奏等待 / Pending equalizer bars|`height:[35,75]`|五根锚定基线的条按不同相位改变高度，明确不是音频测量。|
|`web.loading-gradient-arc` · 多段渐变弧 / Segmented gradient arc|`sweep:[180,320]`|十二段有序颜色弧组成有缺口圆环并旋转。|
|`web.loading-orbit-trail` · 轨道尾迹等待 / Orbital pending trail|`radius:[28,64]`|不同尺寸与透明度的点在同一圆轨道上保留固定角度尾距。|
|`web.loading-progress-success` · 进度收束成勾 / Authored progress-to-check|`completeAt:[.6,.85]`|明示教学进度达到百分之百后隐藏环并描画勾形。|
|`web.loading-skeleton-shimmer` · 结构占位换内容 / Skeleton shimmer to sample content|`rows:[3,5]; integer rows`|保留头像与文本行几何的占位卡扫光后显示本地样本文字。|
|`web.loading-typing-indicator` · 输入状态省略号 / Typing status ellipsis|`beats:[1,4]; integer beats`|对话气泡内的固定位置省略号按节奏改变强度，不提交消息。|
|`web.loading-indeterminate-bar` · 无百分比等待条 / Indeterminate travel bar|`segment:[.18,.4]`|短段在等待轨道上改变位置和长度，不暴露虚假百分比。|
|`web.loading-pulse-ring` · 扩径等待圈 / Expanding pending ring|`radius:[30,72]`|圆环向外扩径并淡去，静态中心保留等待位置。|
|`web.loading-square-morph` · 方块角形变 / Morphing square corners|`size:[18,34]`|四块的圆角、间距和角度在一段教学周期内连续变化。|
|`web.feedback-clap-counter` · 拍手提交计数 / Committed clap counter|`initial:[0,100], step:[1,5]; integer initial, step`|原生点击立即增加拍手数，射线与单次教学计数不掌握实际总数。|
|`web.feedback-heart-burst` · 喜欢切换与心形爆散 / Like toggle and heart burst|`initial:['off','on'], petals:[4,12]; integer petals`|喜欢按钮立即切换布尔状态，周围心形径向散开不修改喜欢。|
|`web.feedback-emoji-choice` · 表情选择提交 / Committed emoji choice|`choice:['calm','happy','surprised']`|原生单选提交本地表情，教学卡只突出明确作者选项。|
|`web.feedback-number-ticker` · 整数提交与滚轮 / Integer commit and digit ticker|`initial:[0,9000], increment:[1,99]; integer initial, increment`|本地加数立即提交整数，四位滚轮独立演示一次端点变化。|
|`web.feedback-star-rating` · 评分原生提交 / Native star rating|`initial:[0,5], rating:[1,5]; integer initial, rating`|五项单选提交评分，教学星形依次填充至作者目标值。|
|`web.feedback-confetti-rain` · 本地确认与纸片雨 / Local acknowledgement and confetti|`pieces:[8,24], spread:[70,170]; integer pieces`|本地确认立即记数，固定种子的纸片雨只解释一次庆祝。|
|`web.feedback-island-expansion` · 状态胶囊展开 / Native disclosure and status pill morph|`width:[130,220]`|原生详情开合独立，教学胶囊宽高与圆角扩展为状态面板。|
|`web.feedback-toast-notice` · 通知显隐与确认 / Native local notice and toast|`travel:[20,70]`|显示和关闭按钮掌握本地通知，教学通知另有到达、停留和离场阶段。|

### Data authority and truthful encoding / 数据权威与真实编码

The 23 data-story descriptors use explicit original datasets, real numeric geometry and readable units. Budget sectors encode 50/30/20 shares; sentiment remains100%; Sankey input/output and ribbon widths conserve flow; stream bands share cumulative boundaries; rank order follows actual values and stable tie order; clusters retain12 distinct records; queue service retains all6 FIFO identities. Confidence bands are an illustrative uncertainty envelope, **not** a statistical confidence guarantee. Goal projection is an authored extrapolation, **not** a forecast service. Map/sensor coordinates and network adjacency are explicit original data, not fetched geography or live connectivity. Area/radius, thickness, coordinate, ranking and clipping mechanisms remain distinct.

Native Inspect selects a real record and reports its labelled numeric value. Timeline trail uses an actual range-selected sample and preceding window; the independently dashed study cursor never writes the range. Study progress may reveal/interpolate fixed data or point to a sample, but cannot claim an external measurement, alarm, new record, queue transaction or data update. Numeric labels/datasets remain available even at unrevealed progress. Production should keep its existing data source/selection model, scales, units, conservation and stable identity; bind geometry to actual values, not elapsed progress.

Each study recomputes from bounded0–1 progress; most data reveals use the full interval, domino/odometer/queue use explicit per-record phases, and threshold/KPI choose a deterministic current study index. Native inspection highlight is separate from the animated cursor/geometry. Reverse/cold seek changes only authored visualization. No asynchronous data source, request, alarm or automatic native completion is invented.

### Pending is not completion / 等待不是完成

The10 loading descriptors are bounded teaching cycles: real dot trajectories, bar heights, segmented gradient arc, orbit trail, progress→check shell, reserved-content skeleton, discrete ellipsis beats, indeterminate moving segment, expanding ring and square-corner deformation. They do not start an infinite scheduler. Only progress-success is an explicit authored completion sequence with `completeAt`; production completion must come from a confirmed operation. Skeleton sample content is created once and has meaningful reserved geometry; it is not a real response. Do not display fabricated percentages for indeterminate work. Repeat pending presentation only while a real operation remains pending, under the existing renderer's scheduler; do not repeatedly celebrate a loading loop.

### Local feedback and accessible intent / 本地反馈与无障碍意图

Clap and integer ticker buttons commit actual local counts exactly once per activation; their preview counters are separate. Heart uses native `aria-pressed`; emoji and stars use labelled radio fieldsets. Confetti has a local acknowledgement counter, not a fabricated reward or transaction. Status island uses actual details/summary disclosure. Toast Show/Dismiss owns a real local banner; dismissal returns focus to Show when needed. Seek never increments counts, toggles radios/like, opens details, displays a native toast or acknowledges an action. Native status announcements are input-driven, not per-frame live updates. Enter/Space and normal radio/tab order remain native; decorative SVG never acts as a fake control.

Feedback preview phases are distinct: clap/rays .15–.65, heart petals .12–.9, emoji spotlight .1–.7, staggered digit columns, star threshold sequence, seeded paper rain, island shell .15–.8, and toast arrive0–.25 / hold / depart .75–1. These phase budgets are teaching values, not operational latency. Use confirmation once per real action; suppress optional celebration or repeated attention when no causal explanation benefits.

Reduced mode is a meaningful static result: exact data ratios/labels, settled digits, readable pending symbol/track, completed authored check, static disclosure/notice and usable native controls. It eliminates travel, rotation, pulsing, moving shimmer and decorative rain/hearts; it does not simulate faster motion or erase important messages. Disposing removes the owned subtree and all listeners; selection, counts and acknowledgements are intentionally specimen-local and not persisted after unmount.

Reuse explicit DOM/CSS/SVG channels inside the existing renderer: SVG sectors/ribbons/paths/coordinates for data, reserved DOM geometry for skeletons, SVG arc/dot/shape channels for pending, native input plus separate decorative presentation for feedback. Current DESIGN.md, MOTION.md, tokens, request lifecycle and accessible announcements override the sample palette/duration. No upstream assets, code, fonts, descriptions or source visual-fidelity claim are included.


## Exact identity discovery / 精确条目索引

Select the exact item in the offline gallery; its catalogue record contains the complete supported authored parameter set and source timing observations. This table links identities to original mechanisms, not source visual-fidelity evidence.

|Source ID|English / 中文 discovery|Concrete recipe|
|---|---|---|
|[accordion-open](../../../tools/motion-recipes/full/index.html#motion=accordion-open)|Accordion Open / 原生折叠自然高度|`web.intrinsic-height`|
|[auto-height-expand](../../../tools/motion-recipes/full/index.html#motion=auto-height-expand)|Intrinsic Height Expand / 多段自然高度展开|`web.intrinsic-height`|
|[bar-chart-stagger](../../../tools/motion-recipes/full/index.html#motion=bar-chart-stagger)|Staggered Bar Chart / 数值柱错峰|`web.value-chart` · bars|
|[bottom-sheet-drag](../../../tools/motion-recipes/full/index.html#motion=bottom-sheet-drag)|Bottom Sheet Drag / 底部面板拖动档位|`web.sheet-drag-detents`|
|[button-fill-hover](../../../tools/motion-recipes/full/index.html#motion=button-fill-hover)|Button Fill Hover / 悬停填充|`web.hover-fill-clip`|
|[card-spotlight](../../../tools/motion-recipes/full/index.html#motion=card-spotlight)|Card Spotlight / 卡片径向光场|`web.pointer-radial-spotlight`|
|[catalog-data-story-budget-bloom](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-budget-bloom)|Radial Budget Bloom / 径向预算展开|`web.data-budget-bloom`|
|[catalog-data-story-calendar-density](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-calendar-density)|Calendar Density Sweep / 日历计数扫读|`web.data-calendar-density`|
|[catalog-data-story-cluster-merge](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-cluster-merge)|Data Cluster Merge / 数据簇守数合并|`web.data-cluster-merge`|
|[catalog-data-story-confidence-fog](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-confidence-fog)|Forecast Confidence Fog / 预测不确定区间|`web.data-confidence-band`|
|[catalog-data-story-delta-split](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-delta-split)|Comparison Delta Split / 基线与差值分栏|`web.data-delta-split`|
|[catalog-data-story-event-domino](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-event-domino)|Event Sequence Domino / 前置事件接力|`web.data-event-domino`|
|[catalog-data-story-goal-projection](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-goal-projection)|Goal Projection Arc / 目标投影曲线|`web.data-goal-projection`|
|[catalog-data-story-heatmap-ripple](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-heatmap-ripple)|Heatmap Ripple Focus / 热图邻域聚焦|`web.data-heatmap-focus`|
|[catalog-data-story-kpi-relay](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-kpi-relay)|KPI Spotlight Relay / 指标聚焦接力|`web.data-kpi-relay`|
|[catalog-data-story-milestone-firefly](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-milestone-firefly)|Progress Milestone Firefly / 里程碑跨阈值|`web.data-milestone-gates`|
|[catalog-data-story-odometer-cascade](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-odometer-cascade)|Metric Odometer Cascade / 指标滚轮级联|`web.data-odometer-cascade`|
|[catalog-data-story-queue-compress](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-queue-compress)|Live Queue Compression / FIFO服务压缩|`web.data-queue-compression`|
|[catalog-data-story-rank-ladder](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-rank-ladder)|Rank Ladder Climb / 按分数重排名次|`web.data-rank-ladder`|
|[catalog-data-story-sankey-flow](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-sankey-flow)|Sankey Flow Reveal / 守恒桑基流量|`web.data-sankey-conservation`|
|[catalog-data-story-sentiment-spectrum](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-sentiment-spectrum)|Sentiment Spectrum Shift / 情绪占比迁移|`web.data-sentiment-spectrum`|
|[catalog-data-story-signal-pulse-map](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-signal-pulse-map)|Live Signal Pulse Map / 位置强度信号图|`web.data-signal-map`|
|[catalog-data-story-stream-breathe](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-stream-breathe)|Stream Graph Breathing / 数值堆叠流图|`web.data-stacked-stream`|
|[catalog-data-story-threshold-wave](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-threshold-wave)|Threshold Alarm Wave / 样本阈值越界|`web.data-threshold-crossing`|
|[catalog-data-story-timeline-trail](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-timeline-trail)|Timeline Scrub Trail / 时间轴拖读尾迹|`web.data-timeline-trail`|
|[catalog-data-story-topology-bloom](../../../tools/motion-recipes/full/index.html#motion=catalog-data-story-topology-bloom)|Network Topology Bloom / 邻接网络展开|`web.data-network-topology`|
|[catalog-ui-button-border-draw](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-border-draw)|Border Draw / 边框描绘|`web.button-surface` · border|
|[catalog-ui-button-bounce-press](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-bounce-press)|Bounce Press / 回弹按压|`web.button-deformation` · bounce|
|[catalog-ui-button-breathing-gradient](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-breathing-gradient)|Breathing Gradient / 渐变呼吸|`web.button-surface` · gradient|
|[catalog-ui-button-color-splash](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-color-splash)|Color Splash / 色面扩散|`web.button-surface` · splash|
|[catalog-ui-button-confetti-burst](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-confetti-burst)|Confetti Burst / 确认彩片|`web.button-surface` · confetti|
|[catalog-ui-button-elastic-drag](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-elastic-drag)|Elastic Drag / 弹性拖拉|`web.button-deformation` · elastic|
|[catalog-ui-button-error-shake](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-error-shake)|Error Shake / 错误摆动|`web.button-deformation` · error|
|[catalog-ui-button-fill-sweep](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-fill-sweep)|Fill Sweep / 填充扫过|`web.button-surface` · sweep|
|[catalog-ui-button-heartbeat](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-heartbeat)|Heartbeat / 心跳强调|`web.button-deformation` · heartbeat|
|[catalog-ui-button-hold-confirm](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-hold-confirm)|Hold to Confirm / 按住确认|`web.button-state-morph` · hold|
|[catalog-ui-button-icon-swap](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-icon-swap)|Icon Swap / 图标切换|`web.button-state-morph` · icon|
|[catalog-ui-button-inner-press](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-inner-press)|Inner Press / 内凹按压|`web.button-deformation` · inner|
|[catalog-ui-button-jelly-squash](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-jelly-squash)|Jelly Squash / 果冻压缩|`web.button-deformation` · squash|
|[catalog-ui-button-loading-success](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-loading-success)|Loading to Success / 加载转成功|`web.button-state-morph` · loading|
|[catalog-ui-button-pulse-glow](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-pulse-glow)|Pulse Glow / 柔光脉冲|`web.button-surface` · glow|
|[catalog-ui-button-push-3d](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-push-3d)|3D Push / 立体压入|`web.button-deformation` · push-depth|
|[catalog-ui-button-send-morph](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-send-morph)|Send Morph / 发送转确认|`web.button-state-morph` · send|
|[catalog-ui-button-shine-sweep](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-shine-sweep)|Shine Sweep / 高光扫过|`web.button-surface` · shine|
|[catalog-ui-button-tap-ripple](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-tap-ripple)|Tap Ripple / 落点涟漪|`web.button-surface` · ripple|
|[catalog-ui-button-wobble-tilt](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-button-wobble-tilt)|Wobble Tilt / 扭摆倾斜|`web.button-deformation` · wobble|
|[catalog-ui-control-bubble-expand](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-bubble-expand)|Bubble Expand / 圆泡展开|`web.control-indicator` · bubble|
|[catalog-ui-control-check-draw](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-check-draw)|Check Draw / 勾线描绘|`web.control-glyph` · check|
|[catalog-ui-control-day-night](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-day-night)|Day and Night / 日夜遮罩|`web.control-glyph` · day|
|[catalog-ui-control-heart-like](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-heart-like)|Heart Like / 心形喜欢|`web.control-glyph` · heart|
|[catalog-ui-control-jumping-dot](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-jumping-dot)|Jumping Dot / 跳跃选点|`web.control-indicator` · jump|
|[catalog-ui-control-liquid-blob](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-liquid-blob)|Liquid Blob / 液团切换|`web.control-indicator` · blob|
|[catalog-ui-control-liquid-stretch](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-liquid-stretch)|Liquid Stretch / 液桥伸展|`web.control-indicator` · stretch|
|[catalog-ui-control-lock-unlock](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-lock-unlock)|Lock and Unlock / 锁扣开合|`web.control-glyph` · lock|
|[catalog-ui-control-mute-pop](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-mute-pop)|Mute Pop / 静音切换|`web.control-glyph` · mute|
|[catalog-ui-control-pill-indicator](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-pill-indicator)|Pill Indicator / 胶囊指示|`web.control-indicator` · pill|
|[catalog-ui-control-play-pause](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-play-pause)|Play and Pause / 播放暂停|`web.control-glyph` · play|
|[catalog-ui-control-sliding-underline](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-sliding-underline)|Sliding Underline / 下划线选中|`web.control-indicator` · underline|
|[catalog-ui-control-spring-switch](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-spring-switch)|Springy Switch / 弹簧开关|`web.control-indicator` · spring|
|[catalog-ui-control-tint-shift](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-control-tint-shift)|Tint Shift / 色调切换|`web.control-indicator` · tint|
|[catalog-ui-feedback-clap-counter](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-feedback-clap-counter)|Clap Counter / 拍手独立计数|`web.feedback-clap-counter`|
|[catalog-ui-feedback-confetti-rain](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-feedback-confetti-rain)|Confetti Rain / 确认后的纸片雨|`web.feedback-confetti-rain`|
|[catalog-ui-feedback-emoji-bar](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-feedback-emoji-bar)|Emoji Bar / 表情选择条|`web.feedback-emoji-choice`|
|[catalog-ui-feedback-heart-burst](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-feedback-heart-burst)|Heart Burst / 喜欢与心形爆散|`web.feedback-heart-burst`|
|[catalog-ui-feedback-number-ticker](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-feedback-number-ticker)|Number Ticker / 数值提交滚轮|`web.feedback-number-ticker`|
|[catalog-ui-feedback-star-rating](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-feedback-star-rating)|Star Rating / 原生星评分|`web.feedback-star-rating`|
|[catalog-ui-loading-bouncing-dots](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-loading-bouncing-dots)|Bouncing Dots / 等待点弹跳|`web.loading-bouncing-dots`|
|[catalog-ui-loading-equalizer-bars](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-loading-equalizer-bars)|Equalizer Bars / 等待条高度节奏|`web.loading-equalizer-bars`|
|[catalog-ui-loading-gradient-arc](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-loading-gradient-arc)|Gradient Arc / 渐变弧等待|`web.loading-gradient-arc`|
|[catalog-ui-loading-orbit-trail](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-loading-orbit-trail)|Orbit Trail / 轨道尾迹等待|`web.loading-orbit-trail`|
|[catalog-ui-loading-progress-success](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-loading-progress-success)|Progress to Success / 进度环收束为勾|`web.loading-progress-success`|
|[catalog-ui-loading-skeleton-shimmer](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-loading-skeleton-shimmer)|Skeleton Shimmer / 结构占位扫光|`web.loading-skeleton-shimmer`|
|[catalog-ui-loading-typing-indicator](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-loading-typing-indicator)|Typing Indicator / 输入省略号节奏|`web.loading-typing-indicator`|
|[catalog-ui-navigation-card-flip](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-navigation-card-flip)|Card Flip / 双面透视翻页|`web.route-compositing` · flip|
|[catalog-ui-navigation-circular-reveal](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-navigation-circular-reveal)|Circular Reveal / 偏心圆形揭页|`web.route-compositing` · circle|
|[catalog-ui-navigation-hero-expand](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-navigation-hero-expand)|Hero Expand / 共享主图扩展导航|`web.shared-identity` · hero-art|
|[catalog-ui-navigation-parallax-push](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-navigation-parallax-push)|Parallax Push / 分层视差推页|`web.route-compositing` · parallax|
|[catalog-ui-navigation-spring-sheet](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-navigation-spring-sheet)|Spring Sheet / 有界弹性底部层|`web.native-top-layer` · spring-sheet|
|[catalog-ui-navigation-staggered-reveal](../../../tools/motion-recipes/full/index.html#motion=catalog-ui-navigation-staggered-reveal)|Staggered Reveal / 逐项导航揭示|`web.navigation-disclosure` · stagger-nav|
|[chart-draw](../../../tools/motion-recipes/full/index.html#motion=chart-draw)|Chart Draw / 折线描绘|`web.value-chart` · line|
|[checkbox-stroke](../../../tools/motion-recipes/full/index.html#motion=checkbox-stroke)|Checkbox Stroke / 复选勾线|`web.control-glyph` · check|
|[circular-progress](../../../tools/motion-recipes/full/index.html#motion=circular-progress)|Circular Progress / 环形进度|`web.determinate-progress` · circle|
|[click-ripple](../../../tools/motion-recipes/full/index.html#motion=click-ripple)|Click Ripple / 点击坐标波纹|`web.tap-origin-ripple`|
|[command-palette-open](../../../tools/motion-recipes/full/index.html#motion=command-palette-open)|Command Palette Open / 可检索本地命令面板|`web.native-top-layer` · command|
|[count-up](../../../tools/motion-recipes/full/index.html#motion=count-up)|Count Up / 数值递增|`web.numeric-interpolation`|
|[cursor-follow](../../../tools/motion-recipes/full/index.html#motion=cursor-follow)|Cursor Follow / 指针迟滞跟随|`web.pointer-lag-follower`|
|[detail-expand](../../../tools/motion-recipes/full/index.html#motion=detail-expand)|List-to-Detail Expand / 身份详情行扩展|`web.shared-identity` · detail-row|
|[dialog-top-layer](../../../tools/motion-recipes/full/index.html#motion=dialog-top-layer)|Top Layer Dialog / 原生顶层对话框|`web.native-top-layer` · dialog|
|[discrete-exit](../../../tools/motion-recipes/full/index.html#motion=discrete-exit)|Discrete Property Exit / 语义关闭与离散退场|`web.discrete-presence`|
|[donut-segments](../../../tools/motion-recipes/full/index.html#motion=donut-segments)|Donut Segment Draw / 占比圆环分段|`web.value-chart` · donut|
|[drag-inertia](../../../tools/motion-recipes/full/index.html#motion=drag-inertia)|Drag Inertia / 实测拖动惯性|`web.drag-measured-inertia`|
|[drag-pickup](../../../tools/motion-recipes/full/index.html#motion=drag-pickup)|Drag Pickup / 拖动提起层级|`web.drag-pickup-depth`|
|[drag-snap](../../../tools/motion-recipes/full/index.html#motion=drag-snap)|Drag Snap / 拖动最近槽位|`web.drag-nearest-slot`|
|[dropdown-origin](../../../tools/motion-recipes/full/index.html#motion=dropdown-origin)|Dropdown Origin Reveal / 触发器菜单展开|`web.navigation-disclosure` · menu-origin|
|[dv-pins](../../../tools/motion-recipes/full/index.html#motion=dv-pins)|Map Pins Drop / 地图坐标落点|`web.data-map-pins`|
|[dv-scatter](../../../tools/motion-recipes/full/index.html#motion=dv-scatter)|Scatter Reveal / 二维散点显露|`web.data-scatter-relation`|
|[dv-stat](../../../tools/motion-recipes/full/index.html#motion=dv-stat)|Stat Card / 统计卡基线差|`web.data-stat-comparison`|
|[filter-reflow](../../../tools/motion-recipes/full/index.html#motion=filter-reflow)|Filter Reflow / 实测筛选瀑布流|`web.measured-reflow` · masonry-filter|
|[flip-reorder](../../../tools/motion-recipes/full/index.html#motion=flip-reorder)|FLIP Reorder / 实测网格身份重排|`web.measured-reflow` · grid-reorder|
|[floating-label](../../../tools/motion-recipes/full/index.html#motion=floating-label)|Floating Label / 悬浮标签|`web.form-field-state` · label|
|[horizontal-scrub](../../../tools/motion-recipes/full/index.html#motion=horizontal-scrub)|Horizontal Scrub / 滚动横向轨道|`web.scroll-horizontal-track`|
|[hover-lift](../../../tools/motion-recipes/full/index.html#motion=hover-lift)|Hover Lift / 悬停深度抬升|`web.hover-depth-lift`|
|[icon-morph](../../../tools/motion-recipes/full/index.html#motion=icon-morph)|Icon Morph / 菜单关闭路径形变|`web.menu-close-path-morph`|
|[image-clip-scrub](../../../tools/motion-recipes/full/index.html#motion=image-clip-scrub)|Image Clip Scrub / 滚动图像开窗|`web.scroll-image-clip`|
|[inline-validation](../../../tools/motion-recipes/full/index.html#motion=inline-validation)|Inline Validation / 行内校验|`web.form-field-state` · validation|
|[ld-bar](../../../tools/motion-recipes/full/index.html#motion=ld-bar)|Indeterminate Bar / 不确定进度条|`web.loading-indeterminate-bar`|
|[ld-pulse](../../../tools/motion-recipes/full/index.html#motion=ld-pulse)|Pulse Ring / 扩径等待圈|`web.loading-pulse-ring`|
|[ld-squares](../../../tools/motion-recipes/full/index.html#motion=ld-squares)|Morphing Squares / 方块圆角形变|`web.loading-square-morph`|
|[loading-dots](../../../tools/motion-recipes/full/index.html#motion=loading-dots)|Loading Dots / 加载点节奏|`web.pending-cycle` · dots|
|[long-press-progress](../../../tools/motion-recipes/full/index.html#motion=long-press-progress)|Long Press Progress / 实耗时长按确认|`web.elapsed-hold-confirm`|
|[magnetic-button](../../../tools/motion-recipes/full/index.html#motion=magnetic-button)|Magnetic Button / 磁吸按钮偏移|`web.magnetic-pointer-offset`|
|[modal-morph](../../../tools/motion-recipes/full/index.html#motion=modal-morph)|Modal Morph / 共享实体模态外壳|`web.shared-identity` · modal-shell|
|[optimistic-update](../../../tools/motion-recipes/full/index.html#motion=optimistic-update)|Optimistic Update / 乐观更新与回退|`web.optimistic-transaction`|
|[page-transition-stack](../../../tools/motion-recipes/full/index.html#motion=page-transition-stack)|Page Stack Transition / 本地历史页栈|`web.route-compositing` · stack|
|[page-wipe](../../../tools/motion-recipes/full/index.html#motion=page-wipe)|Page Wipe / 矩形遮罩换页|`web.route-compositing` · wipe|
|[parallax-layers](../../../tools/motion-recipes/full/index.html#motion=parallax-layers)|Parallax Layers / 分层滚动视差|`web.scroll-parallax-layers`|
|[password-strength](../../../tools/motion-recipes/full/index.html#motion=password-strength)|Password Strength / 口令检查反馈|`web.form-field-state` · strength|
|[pinch-zoom](../../../tools/motion-recipes/full/index.html#motion=pinch-zoom)|Pinch Zoom / 双指距离缩放|`web.two-pointer-distance-zoom`|
|[pinned-story-steps](../../../tools/motion-recipes/full/index.html#motion=pinned-story-steps)|Pinned Story Steps / 钉住分步叙事|`web.scroll-pinned-story-steps`|
|[pointer-tilt](../../../tools/motion-recipes/full/index.html#motion=pointer-tilt)|Pointer Tilt / 指针透视倾斜|`web.pointer-perspective-tilt`|
|[popover-transition](../../../tools/motion-recipes/full/index.html#motion=popover-transition)|Popover Enter and Exit / 原生浮层定位展开|`web.native-top-layer` · popover|
|[progress-fill](../../../tools/motion-recipes/full/index.html#motion=progress-fill)|Progress Fill / 进度填充|`web.determinate-progress` · track|
|[pull-to-refresh](../../../tools/motion-recipes/full/index.html#motion=pull-to-refresh)|Pull to Refresh / 下拉阈值本地刷新|`web.pull-threshold-local-refresh`|
|[reorder-drag](../../../tools/motion-recipes/full/index.html#motion=reorder-drag)|Reorder Drag / 保留身份拖动排序|`web.identity-preserving-reorder`|
|[route-slide](../../../tools/motion-recipes/full/index.html#motion=route-slide)|Route Slide / 同轴路由滑移|`web.route-compositing` · slide|
|[scroll-depth-zoom](../../../tools/motion-recipes/full/index.html#motion=scroll-depth-zoom)|Scroll Depth Zoom / 滚动透视纵深|`web.scroll-depth-perspective`|
|[scroll-marquee](../../../tools/motion-recipes/full/index.html#motion=scroll-marquee)|Scroll Marquee / 滚动耦合字带|`web.scroll-marquee-band`|
|[scroll-progress](../../../tools/motion-recipes/full/index.html#motion=scroll-progress)|Scroll Progress / 实测阅读位置|`web.scroll-reading-progress`|
|[scroll-reveal](../../../tools/motion-recipes/full/index.html#motion=scroll-reveal)|Scroll Reveal / 按位置元素显露|`web.scroll-element-reveal`|
|[section-snap](../../../tools/motion-recipes/full/index.html#motion=section-snap)|Section Snap / 原生分节吸附|`web.scroll-native-section-snap`|
|[shared-element](../../../tools/motion-recipes/full/index.html#motion=shared-element)|Shared Element / 共享图块身份接续|`web.shared-identity` · shared-art|
|[sidebar-reveal](../../../tools/motion-recipes/full/index.html#motion=sidebar-reveal)|Sidebar Reveal / 真实侧栏布局揭示|`web.navigation-disclosure` · sidebar|
|[skeleton-resolve](../../../tools/motion-recipes/full/index.html#motion=skeleton-resolve)|Skeleton Resolve / 骨架转内容|`web.skeleton-content` · resolve|
|[skeleton-shimmer](../../../tools/motion-recipes/full/index.html#motion=skeleton-shimmer)|Skeleton Shimmer / 骨架光带|`web.skeleton-content` · shimmer|
|[spinner-arc](../../../tools/motion-recipes/full/index.html#motion=spinner-arc)|Spinner Arc / 旋转弧线|`web.pending-cycle` · arc|
|[sticky-pin](../../../tools/motion-recipes/full/index.html#motion=sticky-pin)|Sticky Pin / 原生粘性锚点|`web.scroll-native-sticky-pin`|
|[submit-success](../../../tools/motion-recipes/full/index.html#motion=submit-success)|Submit Success Morph / 提交确认变形|`web.form-submit-state`|
|[success-check](../../../tools/motion-recipes/full/index.html#motion=success-check)|Success Check Draw / 成功勾线|`web.control-glyph` · check|
|[swipe-actions](../../../tools/motion-recipes/full/index.html#motion=swipe-actions)|Swipe Actions Reveal / 滑动本地操作展开|`web.swipe-local-action-reveal`|
|[swipe-dismiss](../../../tools/motion-recipes/full/index.html#motion=swipe-dismiss)|Swipe Dismiss / 滑动阈值本地移除|`web.swipe-threshold-local-dismiss`|
|[switch-state-spring](../../../tools/motion-recipes/full/index.html#motion=switch-state-spring)|Switch State Spring / 开关弹簧状态|`web.control-indicator` · spring|
|[tab-indicator](../../../tools/motion-recipes/full/index.html#motion=tab-indicator)|Tab Indicator / 真实页签实测指示器|`web.measured-tabs`|
|[text-scroll-scrub](../../../tools/motion-recipes/full/index.html#motion=text-scroll-scrub)|Text Scroll Resolve / 逐单元滚动释文|`web.scroll-segmented-text`|
|[toast-stack](../../../tools/motion-recipes/full/index.html#motion=toast-stack)|Toast Stack / 通知堆叠|`web.toast-stack`|
|[toggle-morph](../../../tools/motion-recipes/full/index.html#motion=toggle-morph)|Toggle Morph / 开关滑块字形形变|`web.toggle-thumb-glyph-morph`|
|[ui-cursorarc](../../../tools/motion-recipes/full/index.html#motion=ui-cursorarc)|Human Cursor Path / 光标三次弧线|`web.cursor-cubic-arc`|
|[ui-fan](../../../tools/motion-recipes/full/index.html#motion=ui-fan)|Card Stack Fan / 共享枢轴卡片扇形|`web.shared-pivot-card-fan`|
|[ui-island](../../../tools/motion-recipes/full/index.html#motion=ui-island)|Dynamic Island / 状态胶囊展开|`web.feedback-island-expansion`|
|[ui-modal](../../../tools/motion-recipes/full/index.html#motion=ui-modal)|Modal Enter / Exit / 模态外壳因果入场|`web.native-top-layer` · modal|
|[ui-morph](../../../tools/motion-recipes/full/index.html#motion=ui-morph)|One Shape, Never Cut / 共享按钮形态|`web.button-state-morph` · shape|
|[ui-press](../../../tools/motion-recipes/full/index.html#motion=ui-press)|Button Press / 按压深度|`web.button-deformation` · push-depth|
|[ui-toast](../../../tools/motion-recipes/full/index.html#motion=ui-toast)|Toast / 可关闭本地通知|`web.feedback-toast-notice`|
|[ui-tooltip](../../../tools/motion-recipes/full/index.html#motion=ui-tooltip)|Tooltip / 悬停聚焦提示|`web.hover-focus-tooltip`|
|[upload-progress-state](../../../tools/motion-recipes/full/index.html#motion=upload-progress-state)|Upload Progress State / 上传阶段进度|`web.upload-progress-state`|
|[velocity-skew](../../../tools/motion-recipes/full/index.html#motion=velocity-skew)|Scroll Velocity Skew / 实测滚速倾斜|`web.scroll-measured-velocity`|
|[view-crossfade](../../../tools/motion-recipes/full/index.html#motion=view-crossfade)|View Crossfade / 双页透明合成|`web.route-compositing` · crossfade|
|[view-transition-circle](../../../tools/motion-recipes/full/index.html#motion=view-transition-circle)|Circular View Transition / 原生视图圆形快照|`web.route-compositing` · view-circle|
