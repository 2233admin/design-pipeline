# Design

## 1. Layout samples inside the existing composition gate

`film check` already captures the composition's timeline in headless Chrome. After that capture,
in the same preview session, it now asks the same kernel (`capture-film-timeline.cjs
--layout-times`) to run `references/film-choreography/layout-probe.js` at a 5 fps grid
(0.1, 0.3, ... s) plus 50 ms either side of every beat boundary. At each time the probe seeks the
registered timeline (the runtime's `window.__player.seek` in the HyperFrames preview, or
`window.__hf.seek` in its render engine; otherwise the GSAP
timeline, applying `data-start`/`data-duration` clip windows itself) and returns, per element that
owns visible text: line boxes from `Range.getClientRects` clipped by `overflow` ancestors and
`clip-path: inset()`, effective opacity, rendered font size, `occluded` (an opaque non-ancestor
paints above every line centre, via `elementsFromPoint`), `within` (nesting) and
`data-layout-allow-overlap`. The viewport is set to the root's `data-width`/`data-height`.

`composition-core.checkFilmLayout` turns the samples into findings that join the composition
step's findings (with `atSec` and the containing `beatId`); the step gains
`layout: { status, samples, viewport }` or `layout: { status: "unavailable", reason }`. A failed
layout capture never blocks the check: the pixel part still runs and the reason is reported.
The timeline manifest and `timeline.json` are unchanged (its schema rejects extra keys).

| Finding | Severity | Rule |
|---|---|---|
| `text-overlap` | error | two unrelated, uncovered runs overlap by >= 20% of the smaller line box, both opacity >= 0.1 and summing >= 1.1 (not a dissolve), held for two consecutive samples spanning >= 0.15 s |
| `text-overlap` | warn | the same, caught in one sample only ("in passing"), or a faint copy (opacity 0.02-0.1, steady within 0.02) under text of opacity >= 0.5 for two samples |
| `text-edge-margin` | warn | text of opacity >= 0.5 at rest (identical boxes for >= 0.35 s) within 4% of the short side of the frame edge, or crossing it |
| `text-too-small` | warn | text at rest renders below 2.4% of the frame height (26 px at 1080p); one aggregated finding |

Overlaps starting at the same sample are reported as one finding listing up to three pairs.
Warnings take `film check --allow <code>` (newly wired; `checkFilmProject` already accepted
`allowComposition`). Deliberate layering takes HyperFrames' own `data-layout-allow-overlap`.

### Calibration (regression evidence)

Measured with the probe on the two dogfooding films. Finals are the accepted `index.html`
rebuilt byte-identically from `build.cjs`; earlier rounds are rebuilt from the values each round's
`REVIEW.md` documents (onboarding round 1: `termRecedeOpacity` 0.14 over 1.0 s, closing font 50,
bar labels 24; round 3: 0.05; round 4: 0 over 1.0 s; clone round 2: rows and labels starting
together). Captures are kept in `tests/fixtures/film-layout/*.layout.json.gz`.

| Capture | Owner's frame-review finding | Result |
|---|---|---|
| onboarding final | accepted | no findings |
| clone final | accepted | 1 warn `text-too-small` (24 px tick labels, footnote) |
| onboarding round 1 | terminal at 14% legible under bar and cards 23.5-26.5 s; closing line ~35 px from edge; 24 px labels small | errors `text-overlap` @23.3 and @24.3 (to 26.5 s); warn `text-edge-margin` 35 px; warn `text-too-small` |
| onboarding round 3 | 5% ghost still legible (owner rejected) | warns: faint copy @23.5 and @24.1, in passing @23.1; no error |
| onboarding round 4 | transient overlap at 23.13 s (HyperFrames info) | warn in passing @23.1 |
| clone round 2 | labels in flight cross the SSIM row | warn in passing @11.3 |

On the finals, the only raw overlaps are a caption crossfade (opacities 0.64 + 0.28) and a value
fading in at 0.08 under a flying label; both are excluded by the legibility/dissolve rule. The
probe's line boxes were checked against the rendered frame (onboarding `frames/026.png`). A 30 s
film takes ~2.3 s to sample (150 samples, up to 33 runs each).

### Rejected

- Shelling out to `npx hyperframes check --json --at-transitions`: 43 s on the accepted 30 s film
  with 45 layout findings, including `content_overlap` warnings for 25 ms caption crossfades, and it
  needs the HyperFrames install and font network fetches. Its layout pass stays available to
  authors; the gate does not depend on it.
- A pixel "empty transitional frame" detector: the reviewed defect frame (clone round 1, t=11.5 s)
  has 0.81% ink, while the accepted rounds 3-4 frame at the same time has 0.74% and 0.67%. No pixel
  threshold separates them; the per-second frame review (section 2) keeps this judgement.
- More pixel samples at 1 fps: the frame profile's warnings (dead band, balance) would multiply
  without measuring text, and blank-frame errors would hit deliberate fades through black.

### Limits

Only DOM text is measured; text drawn in canvas, WebGL or video is not. Projects with
`hyperframes.json` are sampled through the pinned preview (`hyperframes@0.8.137`, named in the
timeline step's `source`); in the 0.8.137 preview `window.__hf.seek` is listed but undefined, so
the probe uses `window.__player.seek` and reports `layout.seek: "hyperframes-runtime"` (smoke:
an injected boundary overlap was caught at 3.7-4.1 s that way). The QA test uses a stand-in with
that shape, since starting the real preview needs npx and ~30 s. Size and margin are
frame-relative; the onboarding owner's "32 px is small when embedded 900 px wide" depends on the
embed and stays a review judgement.

## 2. Quick film ends with the owner's review

`workflows/film.cjs` quick stages become `[PLAN, BUILD, CHECK, REVIEW]` (replicate: reference
first). Film uses the shared `REVIEW` stage with a `first` field: extract one frame per second
from the checked draft into `evidence/`, open every frame, fix and recheck, write the frame and
creative review in `qa.md`, then ask. `nextAction` prefixes an ask's `line` with `first`. The
existing `decide --stage review` contract is reused unchanged: it is allowed because the stage is
now in the quick stage list; rejection records a project rule and clears the film gate; `done`
requires the latest verdict to be an accept bound to the current check snapshot. Quick still has
no delivery render; `decide --stage deliver` stays optional and is accepted once `next` is `done`.
Standard and full film tiers get the same `first` instruction. Edit, web and UI quick tiers are
unchanged. This amends the "quick = route, build, gates, evidence" tier description for film only.

## 3. Pinned, offline-capable scaffold

`film-capture-core` exports `HYPERFRAMES_VERSION` ("0.8.137", the reviewed release in
`references/hyperframes.md`), `GSAP_VERSION` ("3.15.0") and `hyperframesCli(version)`;
`hyperframesPreview` and `fetchCatalog` default to the pin. `film scaffold` (both templates) writes
`package.json` with exact `devDependencies` pins and `check`/`render` scripts, and the composition
loads `node_modules/gsap/dist/gsap.min.js`. HyperFrames serves project files from its local server
(verified: a missing script path blocks the render, so it does not inject GSAP). After one
`npm install`, lint, check, render and film check need no network, except fonts that a composition
names without `@font-face`, which HyperFrames still fetches. Guides and `next` commands use
`npx --no-install hyperframes`.

Compatibility: an existing `package.json` is refused like the other scaffold files; with
`--replace` it keeps its fields and only gains the pins and missing scripts. The motion-study
template's reference HTML now loads GSAP from `node_modules` too; it is only used through the
scaffold.
