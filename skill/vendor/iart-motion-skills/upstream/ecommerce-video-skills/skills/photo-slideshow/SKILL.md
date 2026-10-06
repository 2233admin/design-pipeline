---
name: photo-slideshow
description: This skill should be used when the user asks to "make a photo slideshow", "turn photos into a video", "create a photo montage video", "make a picture slideshow with music", "build a memories/recap video from photos", "add Ken Burns pan/zoom to photos", "sync slide changes to the music beat", or "render a video from a folder of images". Covers per-photo Ken Burns motion, transitions, beat-synced timing, mixed aspect-ratio handling, captions/dates, intro/outro cards, and templating a photo folder into a finished video.
version: 0.1.0
---

# Slideshow Video

Turn a set of photos into a finished video that feels shot, not assembled. The craft is giving each still its own gentle motion (Ken Burns), changing slides on the music, handling photos of different shapes gracefully, and reading a whole folder so the same template renders any set of images.

## When to use

- A folder of photos → one finished MP4 (the headline use case).
- "Memories", recap, year-in-review, wedding/trip montage with music.
- Any still-image set that needs motion, transitions, and synced pacing.

## The one rule that makes a slideshow look professional

**No two slides may move the same way.** The instant-giveaway of an amateur slideshow is every photo doing the identical slow zoom-in. Vary direction, zoom in vs. out, and start scale per photo — but make it **deterministic** (seeded by index), so re-renders are identical and a frame-based renderer stays stable.

```js
// seeded PRNG → same photo always gets the same motion, but each photo differs
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
```

## Per-photo Ken Burns

Each slide picks one move from a small vocabulary so the set has rhythm without repetition. Animate `scale` and `translate` together; never animate `width`/`height` (it reflows and flickers).

| Knob | Range | Why |
|---|---|---|
| Zoom | in `1.0→1.12` or out `1.12→1.0` | subtle; over ~1.15 it feels like a crash-zoom |
| Pan | one of L/R/up/down/diagonal | direction chosen by seed, never all the same |
| Ease | `easeInOutSine` | slow, continuous — Ken Burns has no acceleration jolt |
| Anchor | `transform-origin` toward the subject | keeps a face/horizon in frame while panning |

```js
import { useCurrentFrame, interpolate, Easing } from "remotion";
const frame = useCurrentFrame();              // the ONLY clock
const p = interpolate(frame, [0, durInFrames], [0, 1], {
  extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin),
});
const scale = startScale + (endScale - startScale) * p;   // e.g. 1.0 → 1.10
const x = panX * p, y = panY * p;                          // px, sign from seed
// style: transform: `scale(${scale}) translate(${x}px, ${y}px)`
```

Always start scale ≥ `1.05` so a pan never exposes an empty edge. See `references/ken-burns.md` for the full seeded `<KenBurnsImage>` component with subject-aware anchoring.

## Transitions between photos

Pick **one** transition and keep it consistent — mixing wipes, spins and cubes screams "template." A 0.4–0.6s crossfade is the safe, timeless default; a soft push works for travel sequences. Overlap outgoing and incoming slides so the cut is never hard unless cutting on a beat.

```jsx
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
// <TransitionSeries.Sequence durationInFrames={hold}> ...slide... </Sequence>
// <TransitionSeries.Transition timing={linearTiming({durationInFrames: 15})} presentation={fade()} />
```

## Beat / music-synced slide changes

A slideshow lives or dies on pacing. Lock the track first, get the beat timestamps, then snap each slide change to a beat. Detect beats once (offline) and bake them into props — never analyze audio per frame.

```bash
# extract beat onset times (seconds) with librosa, write to beats.json
python3 -c "import librosa,json,sys; y,sr=librosa.load(sys.argv[1]); \
_,b=librosa.beat.beat_track(y=y,sr=sr); \
json.dump([float(t) for t in librosa.frames_to_time(b,sr=sr)], open('beats.json','w'))" song.mp3
```

Then convert beat seconds → frame numbers and assign slide boundaries. Hold each photo for a musical unit (often every 2nd or 4th beat — every beat is too frantic for photos). For the count→frame math, the rhythm-to-slide assignment, and a no-audio-analysis fallback (fixed BPM grid), see `references/timing-and-audio.md`.

## Mixed aspect-ratio photos

A real folder mixes portrait phone shots and landscape cameras. Never stretch — distortion is unforgivable. Three strategies, in order of preference:

| Strategy | Look | Use when |
|---|---|---|
| **Blurred pad** | photo fit inside frame, a scaled+blurred copy fills the bars | mixed orientations, default choice |
| **Fill (cover)** | photo fills frame, edges cropped | photos roughly match the frame shape |
| **Fit (letterbox)** | photo fully visible on solid/gradient | every pixel matters (documents, art) |

Blurred-pad is the modern standard because it fills the frame without cropping the subject. Render the same source twice: a `cover` blurred layer behind, the `contain` sharp photo on top. See `references/aspect-and-layout.md` for the component and the orientation-detection logic.

## Captions, dates, intro/outro

- **Captions/dates**: read from filename, EXIF, or a sidecar JSON; keep them in a fixed lower-third zone, fade in after the slide settles (~0.3s), out before it leaves.
- **Intro card**: title + date range, held 1.5–2s, before the first photo.
- **Outro card**: a closing line or a contact/CTA, held 2–3s, so the video ends on intent, not a fade to black mid-photo.

## Templating a folder → a video

The payoff: point the composition at a folder, derive the timeline from the file list, render once. Nothing about the photos is hardcoded — count, order, captions and durations all come from data.

```jsx
// data is a prop: [{ src, caption?, date? }]; the timeline is computed, not authored
export const Slideshow = ({ photos, beats, music }) => { /* maps photos → slides */ };
```

```bash
# build the manifest from a folder (sorted, with EXIF dates), then render
node scripts/build-manifest.mjs ./photos > photos.json
npx remotion render Slideshow out/slideshow.mp4 --props=photos.json
```

Keep colors, fonts, transition and slide duration in one theme object so every render stays consistent and only the photos change. See `references/templating-folder.md` for the manifest builder (sort, EXIF date, dedupe), the full data-driven `<Slideshow>`, and an FFmpeg-only path for when React isn't available.

## Output checklist

- Every photo's motion is seeded by index — varied direction/zoom, no two identical.
- All motion is a pure function of `useCurrentFrame()`; start scale ≥ 1.05.
- One consistent transition (crossfade default), overlapped not hard-cut.
- Slide changes land on beats; photos hold ≥1 musical unit, not every beat.
- Mixed aspect ratios handled by blurred-pad — nothing stretched.
- Captions/dates in a fixed zone; intro and outro cards bookend the set.
- Photos, captions and durations come from a folder manifest — one template, any set.

## Deliver & verify (rendered stills → MP4)

> **Packaged helper** (`scripts/`): tile your stills with `scripts/contact-sheet.sh sheet.png f-hook.png f-mid.png f-end.png`, then assert the encode with `scripts/probe-mp4.sh out.mp4 [WxH] [fps]`. See `scripts/README.md`.

This is heavy-tier: the deliverable is an MP4, not a live page. A slideshow ingests a whole folder of user photos — the verify pass is mostly *did every photo actually load and reframe without distortion*.

**Output contract:**
- A Remotion project with the composition registered (`<Composition>` + zod `schema` + `defaultProps`); Ken Burns scale/pan, transitions and beat timing all pure functions of `useCurrentFrame()` (no CSS transitions, timers, `Date.now()`; motion seeded by index, not `Math.random()`).
- Photos loaded via `staticFile()`, gated with `delayRender`/`continueRender` so each image (and any caption font) is present before its frame renders — otherwise a slide pops in blank. Duration is data-dependent → compute it in `calculateMetadata` from the photo count, not by hand.
- Deliverable = the rendered `out/*.mp4` plus the project (re-render when the folder changes).

**Verify loop — render stills → inspect → encode.** Cheap PNGs first, video only once the photos land right.

```bash
# Frame-exact stills WITH THE MANIFEST YOU'LL SHIP (real photo paths), not defaultProps
npx remotion still Slideshow out/f-intro.png  --frame=15  --props=photos.json   # intro card
npx remotion still Slideshow out/f-mid.png    --frame=200 --props=photos.json   # a mid slide mid-Ken-Burns
npx remotion still Slideshow out/f-outro.png  --frame=500 --props=photos.json   # outro card
# end frame = durationInFrames - 1 (npx remotion compositions reads it)
```

Inspect each PNG for **fidelity** (correct photo on each slide; caption/date text right; blurred-pad fills mixed aspect ratios without stretch) AND **artifacts** (image blank/not loaded, photo stretched/distorted, pan exposing an empty edge — start scale ≥ 1.05, caption outside the lower-third safe zone, wrong aspect/letterboxing).

```bash
# Only after stills are clean:
npx remotion render Slideshow out/slideshow.mp4 --props=photos.json
npx remotion render Slideshow out/slideshow.gif --props=photos.json --codec=gif   # README first-screen proof
```

**Batch (one template, many folders):** when running the same template over several photo sets, verify ONE representative folder's manifest via stills before batch-rendering the rest — catch a blank-image or stretched-aspect bug once, not N times.

**Before you finish:**
1. Stills render cleanly at intro / mid / outro — no errors, photos actually loaded (not blank).
2. Captions/dates correct and in the fixed lower-third zone; mixed aspect ratios blurred-padded, nothing stretched; no empty edge from a pan.
3. All motion frame-driven and seeded by index — no CSS transitions / timers / `Date.now()` / `Math.random()`.
4. The **shipped** folder manifest renders correctly, not just `defaultProps`.
5. Full MP4 encoded and plays; (optional) GIF rendered for the README.

## Reference files

- `references/ken-burns.md` — the complete seeded `<KenBurnsImage>` Remotion component: a per-photo motion vocabulary chosen by `mulberry32(index)`, subject-aware `transform-origin`, safe start-scale math, and an FFmpeg `zoompan` equivalent.
- `references/timing-and-audio.md` — beat detection with librosa, beat-seconds → frame conversion, musical-unit slide assignment, BPM-grid fallback with no audio analysis, and pacing budgets per photo.
- `references/aspect-and-layout.md` — orientation detection, the blurred-pad / cover / contain layouts as components, and safe-zone maps for 16:9, 9:16 and 1:1 so one master reframes to every platform.
- `references/templating-folder.md` — the folder→manifest builder (natural sort, EXIF capture date, captions from filenames), the full data-driven `<Slideshow>` with intro/outro cards, and a pure-FFmpeg slideshow pipeline.
