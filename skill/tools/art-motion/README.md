# Art Motion tools

Use one operation for the actual drawing, image, typography, layout, interface or animation
problem. The reviewed drawing/motion tools and media method guides are available locally; narration, a mascot, a
genre and a soundtrack are optional. Read this guide, then the one method or recipe needed.

| Need | Callable entry |
| --- | --- |
| Paint, pressure, materials, lighting, post effects | `runtime.libraries.PAINT`, `KIT`; [Canvas runtime](#canvas-runtime) |
| Movement, camera, diagrams, type, charts, UI, collage, rig | `MO`, `CAM`, `DG`, `TY`, `CH`, `UI`, `CL`, `RIG` |
| Optional existing styles and clip grammars | 35 `drawScene` studies, 8 `drawClip` grammars; [lookup](styles.md) |
| Material-aware transitions | 50 `transition` operations; enumerate `runtime.transitionIds` |
| Continuous travel, pauses, style seams and occlusion | [Long-scroll helper](scroll.md) |
| Matte preparation, crop/split/registration, font subsets, region diagnostics | [Asset tools](assets-audio.md) |
| Supplied images or authorized generation with a currently available host tool | [Image workflow](assets-audio.md#choose-and-check-image-assets) |
| Offline duration/level processing of a supplied voice track | [Voice processing](assets-audio.md#process-a-supplied-voice-track) |
| Deterministic synthesized instruments/effects and score alignment | [Audio tools](assets-audio.md#synthesize-a-separate-cue-layer), existing [film score](../../references/film-score.md) |
| Reference breakdown, shot/camera/material observations, sound | [Reference analysis](#reference-analysis), [methods](methods.md) |
| Exact-time stills, exact-frame video and transparency | [Render](#render-a-style-or-clip) |
| Frame comparison, spatial motion maps, acceptance | [Visual diagnostics](../visual-diagnostics/README.md), existing film/composition/audio checks |

The 13 numbered source methods cover first-frame construction choices, reference analysis,
material-aware motion, character production, music/timing, optional speech-driven work and
review/experience reuse. The [complete source index](../../references/huashu-art-motion.md)
records provenance and limitations. The original voice providers/configuration and image
plan/receipt system are source reference, not maintained service integrations. Our image route
uses actual host tools and existing asset evidence; the maintained voice entry processes local
audio only. Source instructions do not replace project policy.

## Try an editable study

Use the installed skill's absolute path and the current project's root:

```sh
node "<skill-root>/scripts/designer-pipeline.cjs" composition scaffold \
  --root "<project>" --template art-motion --output material-study
```

Open the generated `index.html`. The study has a keyboard-accessible time slider, caller-sized
Canvas, seeded watercolor and a dry-brush contour. It has no external assets or autoplay.
The same directory includes a JSON chart example. Outputs must be new paths.

## Canvas runtime

Load `huashu-runtime.js` as a browser script (`HuashuArtMotion`) or CommonJS module. All library
state is instance-local. The host supplies Canvas creation and platform types; there are no
global `U`, `PAINT` or asset variables, dynamic code loaders or implicit font downloads.

```js
const runtime = HuashuArtMotion.createHuashuRuntime({
  width: canvas.width, height: canvas.height, seed: 31,
  assets: {}, fonts: [],
  createCanvas(width, height) {
    const value = document.createElement('canvas');
    value.width = width; value.height = height; return value;
  },
  capabilities: { Path2D, DOMMatrix, DOMPoint },
});
const { PAINT, MO } = runtime.libraries;
const context = canvas.getContext('2d');
PAINT.brush(context, [[20, 30], [90, 70], [170, 45]], {
  w: 9, col: [35, 45, 39], seed: 31, dry: 0.6, reveal: MO.smooth(0.7),
});
// Release caches when this view is removed; create a new instance on resize.
runtime.dispose();
```

The 17 source modules are adapted into the static runtime. These local implementation links
provide each operation's parameters and examples; read one, not the entire bundle:

| Namespace | Operations and parameter source |
| --- | --- |
| `U` | [Math, text measurement, image fitting and glyph checks](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/util.js) |
| `PAINT` | [Paint and fields](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/paint.js), [brushes](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/brush.js), [lighting/image treatment](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/render.js), [post effects](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/post.js) |
| `KIT` | [Material and construction helpers](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/kit.js) |
| `MO`, `CAM` | [Motion](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/motion.js), [camera](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/camera.js) |
| `DG`, `TY`, `CH`, `UI`, `CL` | [Diagram](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/diagram.js), [type](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/typo.js), [chart](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/chart.js), [UI](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/ui.js), [collage](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/collage.js) |
| `RIG` | [General rig and occlusion](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/rig.js) |
| Opt-in `TOON`, `HUASHU` | [Cartoon construction](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/toon.js), [source character sample](../../vendor/huashu-art-motion/upstream/scripts/engine/lib/rig_huashu.js) via `enableDemoArt()`; y1/y4 select their own sample characters |

For choosing/acquiring a family, start with [font sources and selection](../fonts.md), including
FontLab and primary open-source/publisher sources. Bundled sample aliases are not project defaults.
Load caller-selected font faces with `FontFace`, then call `await runtime.libraries.U.loadCmaps(faces)`
using explicit `{family,url}` mappings. There is no default font download. Some named presets use
specific font families; `render.cjs` can resolve these from the bundled, licensed catalogue.
Keep product controls and reading text in semantic DOM; these text operations create artwork.
For minimum-size/overflow-aware text fitting use [Visual Craft](../visual-craft/README.md).

Direct library calls use the caller's geometry and explicit seeds. `runtime.random(offset)`
returns a seeded generator for authored work; it does not replace the sample scenes' authored
seeds. Set `runtime.setTime(seconds)` for direct effects that read shared time. Clear the caller
canvas before a new frame. Re-rendering the same time should be deterministic; verify actual
pixels after forward/reverse seeks when combining stateful project code.

## Render a style or clip

Copy and edit [clip.example.json](clip.example.json), or author a spec with exactly one `scene`
or `grammar`, plus explicit `width`, `height`, `duration` and integer `fps` (1–120). Duration ×
fps must be an integer. Nothing requires a particular aspect, character or narration.

```sh
node "<skill-root>/tools/art-motion/render.cjs" --root "<project>" \
  --spec material-study/clip.example.json --output build/clip-stills --stills 0,1,3.5
node "<skill-root>/tools/art-motion/render.cjs" --root "<project>" \
  --spec material-study/clip.example.json --output build/clip-video
```

Stills are PNGs. Video is H.264 MP4, or ProRes 4444 MOV when `alpha:true`; MP4 requires even
dimensions. Video needs FFmpeg/ffprobe; both paths use the existing Puppeteer/Chrome resolver.
Explicit overrides are `--chrome`, `--puppeteer-module`, `--ffmpeg`, `--ffprobe`.
Fonts and images are embedded from local files; no browser security flags are disabled.

Optional spec fields: `safe:{left,right,top,bottom,fill}`, `theme`, `data`, `cues`, `assets`,
`fonts`, `alpha`, `seed`, and scene `fit` (`contain` or `cover`). Load the selected grammar's
[example and contract](styles.md#animation-grammars) for its data/cue semantics. Asset paths and
custom font files are relative to the spec file and must remain within the project root.
`assets` maps clip image keys to supplied files. `fonts` is an explicit array of bundled family
names or `{family,file,weight?,style?}` descriptors; `"bundled"` opts into the full catalogue.
Glyph inspection supports WOFF1/TTF/OTF. Missing preset fonts/glyphs are errors to resolve.

`safe` reserves a positive clip content box; background and decorative elements can still fill
the canvas. Inspect actual text/subject placement per grammar. Authored scene samples retain
their original composition; contain/cover fits a study and does not reflow it. Use the library
operations to recompose original work. The ninth presenter grammar is a reference method,
implemented by combining supplied character frames with these drawing/timing tools.

Each output includes source/input hashes, frame timestamps/hashes/costs, first/last PNGs and
a cold/reordered repeat check. A frame cost includes PNG readback, not just drawing. These are
diagnostics, not a new gate/receipt or visual certification. Inspect intended holds, jumps,
texture stability and actual playback; use existing film/audio/composition checks for delivery.

## Reference analysis

```sh
node "<skill-root>/tools/art-motion/reference.cjs" --root "<project>" \
  --path references/source.mp4 --output qa/reference-study --start 2 --end 6 --fps 24 --max-frames 120
```

This extends the existing reference analyzer with a `study.json` sidecar, an audio excerpt and
spectrogram when the source has sound, and separate audio/visual grid candidates. Existing
reports retain their original schema, source hash, ordered viewers and pixel-change heatmaps.
For silent sources audio is explicitly absent. Read [methods](methods.md) before interpreting
cuts, motion maps or beat candidates; they are not object tracking or confirmed music theory.

Compare corresponding reference/render frames with `composition compare`. Use the existing
audio checks for level/clipping/loudness and the existing score grid for intentional alignment.
Generated or third-party assets require an available generation tool or supplied files. Their
existence and quality cannot be inferred from a prompt, recipe name or successful gate.
