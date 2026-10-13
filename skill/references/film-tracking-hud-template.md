# Tracking HUD film template

Open this guide when a film task asks for a virtual camera filming an AI agent's terminal or
another monospace screen while a tracker locks onto the glyphs being typed: shaky close-ups,
hatched tracker boxes with live coordinates, depth of field racking along the line, one palette
per shot, a lock ping and a final `Done`. The template is a HyperFrames composition, ported from
the MIT project
[mrsarac/ff-tracking](https://github.com/mrsarac/ff-tracking/tree/cc7f4e192eccefb55ae7f18f5a370955122b651b)
at `cc7f4e192eccefb55ae7f18f5a370955122b651b`. It is made, checked and reviewed with the existing
film route: `film scaffold`, `audio master`, HyperFrames render, `film check`, frame review and
`decide`.

It does not replace the ordinary HyperFrames film route. Product promos built from real captures,
HTML compositions, ordinary UI/CSS motion and footage edits keep their routes
([workflow-film.md](workflow-film.md), [film-methods.md](film-methods.md)); do not use the
template for a task that only resembles a HUD.

## Source and attribution

- Reference: [`../vendor/ff-tracking/upstream/`](../vendor/ff-tracking/upstream/README.md), all 46
  tracked files with their original bytes, inventory and hashes in
  [`../vendor/ff-tracking/manifest.json`](../vendor/ff-tracking/manifest.json). It is provenance
  and reference only: never edit, build or run it, and never install Rust, LLVM, FFmpeg
  development builds or Python packages for it.
- Template: [`../tools/ff-tracking-hud/`](../tools/ff-tracking-hud/FILM.md), the maintained port.
- [MIT license](../vendor/ff-tracking/upstream/LICENSE), Copyright (c) 2026 Mustafa Saraç. The
  scaffold copies it as `LICENSE.ff-tracking`; keep it in every project. JetBrains Mono comes from
  the vendored `media/` under [SIL OFL 1.1](../vendor/ff-tracking/upstream/licenses/JetBrainsMono-OFL.txt).
- The upstream README credits Michael Nowak (@mnowakdesign) for the visual style and states that
  none of his footage is used. Keep that credit. Do not fetch, trace, sample or cite his posts or
  footage as material; the template's code is the reference.

## Port map

| Upstream | Template | Notes |
| --- | --- | --- |
| `hud/src/lib.rs` (`SCENE_LIST`, `track`, `shot`, `project`, `events`) | `lib/tracks.js` with `film.config.js` | The single source of picture and sound. Matches `score/tests/fixtures/tracks.json` and `camera.json` for all 180 frames within print precision (upstream computes in f32, the port in f64). |
| `flat` pass (SVG at 3840x2160) | `lib/flat.js` (Canvas 2D at `lens.flatScale` 2x) | One `fillText` per glyph at its exact cell. CPU raster: GPU canvas text depends on earlier frames. |
| `lens/shaders/lens.sksl` | `lib/lens.js` (WebGL2) | Same order and constants; samples the flat canvas of the same frame bilinearly, as fframes' Skia image shader (`FilterMode::Linear`) samples the flat video. |
| `camera_tracker` in `lens/src/lib.rs` | `lib/overlay.js` | Labels, links, dots and brackets drawn sharp after the lens with `project()`. |
| `hud --bin tracks` + `tools/sfx.py` | `sfx.cjs` | ffmpeg filter synthesis of the same layers; an approximation, not sample parity. Loudness by the existing `audio master`. |
| `cargo test -p hud` | `build.cjs` (refuses the config) and `probe.cjs` | |

## Make a film

1. `designer-pipeline film scaffold --output <new-dir> --template tracking-hud`, then
   `npm install` there once (or reuse an installed hyperframes 0.8.137 and gsap 3.15.0). The
   scaffold writes the template, fonts, license, `storyboard.json`, `index.html` and `tracks.json`.
2. Edit `film.config.js` only, then `node build.cjs`:

| What to change | Where in `film.config.js` | Notes |
| --- | --- | --- |
| Typed lines, shot order and kind | `shots[]`: `text`, `kind` (`cursor`, `typing`, `collapse`, `done`), `hero`, `size` | Logical 1920x1080 screen space; a line must end 60 px before the screen edge. |
| Camera per shot | `shots[].camera`: `tiltX`, `tiltY`, `roll`, `zoom` [start, end], `pan`, `blur`, `shake` | Radians; zoom 1 shows the whole screen. The target must land inside 200-1720 x 150-930 on every frame. |
| Timing | `fps`, `shotFrames`, `timing` (`typeEnd`, `lockAt`, `lockFrames`, `typedAtCut`, `chain`) | The collapse ends 4 frames before its shot ends. |
| Palette | `palettes` (five stops, black to white) and `shots[].palette` | Pure red marks a locked box in every palette. |
| Screen text | `screen.title`, `screen.log`, `done.label` | |
| Lens look | `lens` (`cell`, `taps`, `glowTaps`, `dof`, `dofMax`, `aberration`, `bloom`, `vignette`, `flicker`, `grain`) | Upstream literals; `taps`/`glowTaps` trade smoothness for render time. |
| Lock pings | `sound.lockNotes`, `sound.seed` | Sound layers and gains live in `sfx.cjs`. |

   The build refuses, and writes nothing for, a config whose typed line leaves the screen area
   (60 px side margins, clear of the title and status bars), whose target leaves the safe frame,
   whose lock ping lies within 0.1 s of a cut, whose palette text stop is below 3:1 on its
   background, whose Done label overflows its pill, whose last frame cuts into the Done pill or
   target box, or that draws a character the vendored JetBrains Mono lacks (CJK, emoji) or that is
   not one 0.6 em cell. Name the locked word with `shots[].lock` to lock on it (default: the last
   word) and to require that the locked word and its LOCK label read on a lock frame; an implicit
   lock that does not read is a warning (the default has three, as upstream). Leave out
   `screen.tokens` to keep invented figures off the status bar. The build then rewrites
   `storyboard.json` (one action beat per shot, hard cuts, a lock cue per shot), `index.html` (one
   paused GSAP timeline whose driver draws flat, lens and overlay in one callback), `tracks.json`
   and `assets/sfx.wav`.
3. `designer-pipeline audio master --input assets/sfx.wav --output assets/sfx-mastered.wav --target web`.
4. `npx --no-install hyperframes render --output out.mp4 --browser-gpu`; `--no-browser-gpu`
   uses SwiftShader, `--resolution landscape-4k` renders 3840x2160 (the WebGL canvas follows the
   device pixel ratio).
5. `node probe.cjs --gpu hardware` (`--gpu software`, `--dpr 2` to match the render). It hashes
   every sampled frame after forward, backward and shuffled seeks and in a second browser, checks
   that each label states the rounded projection of its box centre, films a dot at every box
   centre (tolerance 1 px) and every boxed glyph with and without it (tolerance 3 px against the
   CPU camera), and reports how far LED sampling and the full lens move glyph centroids. Exit 2
   means a nondeterministic frame or a misplaced label: do not claim or deliver that render.
   If WebGL2 is missing, the composition throws `LensUnavailable`, draws only an error card and
   the probe exits 1: report the blocker and do not substitute another renderer.

## Measured on the maintenance machine

Windows 11, RTX 4070 Ti, Ryzen 7 7800X3D, HyperFrames 0.8.137, Chrome headless shell 152, one
worker, a 2 s single shot (60 frames) with 36 depth-of-field and 16 bloom taps:

| Browser GPU | 1080p | 4K (`landscape-4k`) |
| --- | --- | --- |
| Hardware (ANGLE D3D11) | 114 ms/frame | 202 ms/frame |
| SwiftShader | 579 ms/frame | 747 ms/frame |

Two separate renders were byte-identical in each mode; hardware and SwiftShader output differ, so
record the renderer the probe reports. 4K is affordable, so 1080p (upstream's output) stays the
default and the tap counts stay at upstream's. The full 6 s film rendered in 17.8 s with six
workers at 1080p on the GPU, and two full renders were byte-identical.

## Evidence and review

1. `designer-pipeline film check --project-root .` runs the storyboard, timeline, render, audio
   and composition gates. All beats are procedural (the timeline is driven, not tweened), so the
   render gate samples each beat at 5% and 95%. The 0.5 s cadence and the single hero line are
   the template's design: review the `uniform-cadence` and `dead-band` warnings against it.
   An error blocks delivery: change the config or the template until the gate passes.
2. Review the video frame by frame as [workflow-film.md](workflow-film.md#review) describes:
   labels against glyphs, text against the frame edges, tears only on cut and lock frames.
3. In `qa.md`, record the template revision, edited config, render command, GPU mode and WebGL
   renderer, probe numbers and anything not verified. Report Component Conformance (gates and
   probe) and Visual Acceptance (the owner's `decide`) separately; passing checks never grant it.

## Known differences from upstream

- The flat screen is not H.264-encoded: lock-red strokes keep full-resolution chroma, where
  upstream's yuv420p flat (chroma from the top-left pixel of each 2x2 block) fringes them. On
  upstream's README frames, which show no lock, that round trip changed nothing measurable.
- `iTime`'s frame seed uses the integer frame index instead of `floor(iTime * 30)`.
- Grain, flicker and tear are computed in logical 1920x1080 pixels, so 4K output keeps their
  scale; grain gets finer per device pixel.
- Upstream fades the last shot to black over its last three frames; the port holds the Done pill
  to the last frame, so the last frame the gates sample shows the subject.
- The Done icon fades per element rather than as one SVG group, which changes overlap blending
  during its three-frame fade.
- The sound follows `sfx.py`'s layers and filters (Gaussian noise, scipy's Butterworth sections)
  but not numpy's random stream, its pans, holds and jitters; `audio master` limits instead of a
  tanh soft clip; the Slab score is not used.
