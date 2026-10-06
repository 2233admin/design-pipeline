# Asset preparation and sound cues

Load this guide only when preparing supplied raster artwork, subsetting a supplied font,
checking sampled frames against a deliberately chosen light-background region, or creating
short synthetic effects. These helpers do not fetch assets, choose a typeface, compose a full
score, or decide that a design is visually accepted.

## Key and split supplied artwork

`assets.cjs` consumes PNG bytes through the existing PNG codec. `keyedImage(bytes, options)`
requires an explicit `mode` (`chroma` or `white-matte`) and `soft` / `hard` distance thresholds.
For chroma, specify the exact `[r,g,b]` key color; optional `despill` reduces the dominant key
channel at partially transparent edges. The return value contains cropped RGBA bytes and the
crop's `{x,y,width,height}` placement in the original canvas. Inspect hair, antialiasing, shadows
and foreground colors that resemble the key before compositing.

```js
const fs = require("node:fs");
const { keyFiles, splitFile } = require("./assets.cjs");
const root = process.cwd();
keyFiles(root, ["assets/character-green.png"], "build/keyed", {
  mode: "chroma", keyColor: [0, 255, 0], soft: 24, hard: 100, despill: 0.4, padding: 4,
});
splitFile(root, "assets/poses.png", "build/poses", {
  axis: "x", minGapPx: 12, alphaThreshold: 12, minSpanPx: 32, paddingPx: 2,
});
```

`keyFiles` and `splitFile` write only to a new directory below `root`, emit `sprites.json`, and
refuse existing output. The metadata records the source hash and original-canvas placement for
each cropped frame. Sprite splitting expects transparent gaps (key the sheet first if needed);
choose axis, gap, alpha, minimum span/area and padding from the actual sheet rather than relying
on the old script's fixed 40px span. Review every split and alpha edge; automatic segmentation
cannot know whether detached shapes belong to one pose.

## Font subset and glyph route

For choosing and obtaining the source font, use [font sources and selection](../fonts.md).
Verify that the chosen license permits subsetting/format conversion before running this helper;
free availability alone does not establish that permission.

Supply the font and all actual text. There is no project default font or built-in character list.
The helper reports missing source glyphs and refuses to write unless `--allow-missing` is explicit.
It writes WOFF to a fresh path inside the chosen project root and never edits the source font.

```powershell
uv run --with fonttools python skill/tools/art-motion/font-subset.py `
  --root . --font assets/type/SourceFont.ttf --output build/type/scene.woff `
  --text-file changes/current/visible-copy.txt --scan-js app
```

`--scan-js` reads simple string literals in project JavaScript and is not a JavaScript parser;
for generated strings, escapes, or text assembled at runtime, pass the actual UTF-8 content through
`--text` or `--text-file`. Confirm the font's license separately. Glyph presence does not verify
shaping, fallback, hinting, or visual legibility; test the WOFF in the target browser and at the
smallest intended size. The script never installs `fontTools`; the example uses a scoped `uv`
environment for this command only.

## Check a selected sampled region

`inspectRegions(root, frames, options)` reads caller-selected PNG samples and measures dark-pixel
counts in a normalized region. Choose the `dark-pixels-on-light-background` policy explicitly,
with its luminance cutoff and allowed count; the result includes each supplied frame id/time/hash,
pixel region, measured count and policy hit. This is only appropriate for a known pale, clean
background. It does not identify subtitles, distinguish artwork from text, inspect unsampled times,
or grant a safe-area pass. Dark/texture backgrounds need visual inspection or a different explicit
measurement method.

```js
const { inspectRegions } = require("./assets.cjs");
const report = inspectRegions(process.cwd(), [
  { id: "frame-000120", path: "qa/frames/frame-000120.png", atSec: 4 },
], {
  region: { x: 0, y: 0.84, width: 1, height: 0.12 },
  policy: { kind: "dark-pixels-on-light-background", luminanceBelow: 95, maxPixels: 150 },
});
```

Do not promote this diagnostic to a gate or treat frame sampling as continuous video analysis.
The caller selects frames and the policy from the actual target, platform overlays, background and
delivery requirements.

## Synthesize a separate cue layer

Use the existing `designer-pipeline film score` and `score-grid.json` for the full musical bed,
musical events, BPM and storyboard alignment. `audio.cjs` adds short, deterministic cues that can
sit as a separate audio layer in the existing composition; `audio-core.cjs` remains the delivery
measurement/mastering path.

```js
const fs = require("node:fs");
const { alignCuesToGrid, writeCueWav } = require("./audio.cjs");
const root = process.cwd();
const grid = JSON.parse(fs.readFileSync(`${root}/score-grid.json`, "utf8"));
const authored = [
  { id: "impact", atSec: 2.14, durationSec: 0.55, type: "metal", gain: 0.18, pan: 0,
    partials: [{ ratio: 1, gain: 1, decaySec: 0.2 }, { ratio: 2.76, gain: 0.45, decaySec: 0.1 }] },
  { id: "fall", atSec: 3.02, durationSec: 0.35, type: "fm", frequencyHz: 880, modRatio: 1.4,
    modIndex: 5, attackSec: 0.01, releaseSec: 0.2, gain: 0.12, cutoffHz: 6200 },
];
const scheduled = alignCuesToGrid(authored, grid, {
  basis: "event", toleranceSec: 0.025, onExceed: "leave-unsnapped",
});
const proof = writeCueWav(root, "assets/cues.wav", {
  durationSec: grid.durationSec, sampleRate: 48000, seed: 7, events: scheduled,
});
console.log(proof);
```

Synthesis methods are explicit: `tone` sums harmonic partials, `fm` applies an envelope to the
modulation index, `pluck` uses a seeded Karplus–Strong delay loop, `metal` permits inharmonic
partials with independent decay times, and `noise-sweep` filters seeded noise across a cutoff
sweep. Every type supports gain, equal-power pan (`-1` left, `0` center, `1` right), attack/release
and optional delayed echoes. `tone`, `fm`, `pluck` and `metal` accept optional `cutoffHz`; a
`noise-sweep` requires `cutoffHz` and optionally sweeps to `cutoffEndHz` (default: same as the
starting cutoff). Omitted pan is centered, gain defaults to `0.2`, attack to `0.005` seconds and
release to the smaller of `0.15` seconds or 40% of cue duration. Keep effects short and deliberately
designed—these are building blocks, not the historical sample's instrument presets. Grid snapping is optional,
requires the existing score-grid contract plus an explicit beat/event basis and tolerance, and
reports the requested and scheduled cue time. Unsnapped/counterpoint events remain possible.

The output is stereo 24-bit PCM WAV. The helper refuses a mix that clips and never overwrites the
chosen path. Use a fixed seed for repeatability, listen against the picture, then run the existing
audio check/master command. It does not match source-film loudness, acoustic realism, musical taste,
or intelligibility; the authored result still needs listening review.
