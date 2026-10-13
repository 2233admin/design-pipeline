## Scope and source decisions

Using change: `add-ff-tracking-template`. Reviewed source: <https://github.com/mrsarac/ff-tracking>
commit `cc7f4e192eccefb55ae7f18f5a370955122b651b` (signed merge of PR #4, Git tree
`0f550821569078a4c91e11b65a1eb575f3bd7453`), 46 tracked files, 6,959,604 bytes, MIT, Copyright (c)
2026 Mustafa Saraç. The reviewed local checkout is `.design-pipeline/ff-tracking-src` (clean,
shallow). Every tracked blob is imported; the README release video and rendered `out/`/`target/`
output are not mirrored. JetBrains Mono (OFL 1.1) and the MT19937 BSD notice are recorded in the
manifest `licenses`. The user chose to consume the film through the HyperFrames toolchain: the
vendored tree is reference and provenance, never built or run.

## Decisions

1. Reuse `scripts/import-film-sources.cjs` (explicit record `kind`; `template` checks its README
   summary line). Reimport needs the reviewed revision, tree, inventory, byte count, canonical
   hash, MIT attribution and notice copyrights; the offline reimport test rebuilds the signed
   merge commit. Existing manifests are unchanged byte for byte.
2. Port, not run. `skill/tools/ff-tracking-hud/` holds the maintained template: `film.config.js`
   (the one user config), `lib/tracks.js` (the `hud` crate), `lib/flat.js` (flat pass, Canvas 2D,
   one `fillText` per glyph at its cell), `lib/lens.js` (WebGL2 port of `lens.sksl`),
   `lib/overlay.js` (`camera_tracker`), `sfx.cjs` (`sfx.py` as an ffmpeg filtergraph),
   `build.cjs` and `probe.cjs`. No Rust, LLVM, FFmpeg development build or Python package is used.
3. One data source. `tracks.js` decides shots, typing, boxes, locks, focus and camera per frame;
   flat, lens uniforms, overlay, storyboard and sound read it. Its default config reproduces the
   upstream fixtures `score/tests/fixtures/tracks.json` and `camera.json` for all 180 frames:
   events exactly, positions within half the printed step plus a single-precision budget (Rust
   computes in f32; the port rounds to f32 only where a value decides a discrete choice).
4. One render owner. `build.cjs` writes `index.html`: a paused GSAP timeline whose single driver
   tween (a plain object, so the timeline gate treats every beat as procedural) draws flat ->
   texture -> lens -> overlay synchronously for `floor(t * fps)`. Every random value is a hash of
   frame and pixel. Both 2D canvases use CPU raster (`willReadFrequently`): with GPU raster, text
   pixels depended on earlier frames and 15 of 36 sampled frames differed between seek orders or
   processes. Missing WebGL2 throws `LensUnavailable` and draws only an error card.
5. Labels are real projected pixels. The overlay projects box centres with `project()`, the CPU
   copy of the shader camera. `probe.cjs` verifies it against what the shader films: a dot at each
   box centre (1 px tolerance) and each boxed glyph with and without it (3 px, compared with the
   area-weighted CPU projection of the glyph's ink), both fixed before measurement. LED-cell
   sampling and the full lens move blurred glyph centroids by design; those shifts are reported,
   not judged. A first glyph criterion through the full lens (3 px) failed on depth-of-field
   gather and LED quantization, which the per-stage measurement attributed; the criterion was
   moved to the camera stage and the shifts are reported instead.
6. Determinism gates the claim. The probe hashes page screenshots and lens pixels after forward,
   backward and shuffled seeks and in a second browser process; any difference exits 2 and the
   render is not claimed. The renderer string is recorded; hardware and SwiftShader output differ.
7. Sound follows the events: `sfx.cjs` synthesizes the `sfx.py` layers with ffmpeg (seeded noise,
   biquads, closed-form chirps) at peak -12 dBFS, an approximation, not sample parity; the existing
   `audio master` brings it to -14 LUFS and the audio gate verifies it.
8. Routing extends `film scaffold` with the value `tracking-hud` (no new flag) and one build-table
   row. The scaffold writes the template files, the vendored fonts, OFL text and `LICENSE`, and the
   storyboard, composition and tracks built from the default config.
9. The existing render gate seeked beat samples past the last frame of a short final procedural
   beat; ffmpeg exited 0 without a frame and `film check` crashed. Samples are now clamped to the
   last frame's start.
10. The default render failed `planned-cuts-missing` (4 of 11 cuts found). The template's cuts are
    real (each replaces the shot and its palette) but dark: ffmpeg's scene score measures absolute
    level change, so they scored 0.13-0.30 against the 0.3 threshold, and grain, shake and the
    upstream exposure kick on the frame after each cut kept every 10 fps pixel step busy. The gap
    is generic: a synthetic cut between two dark, panning, grainy textures scored 0.129 (every
    other frame at most 0.002) with a pixel step of 0.68 against a 0.19 window median, and both
    detectors missed it. The fix is central, not a template workaround and not a looser
    threshold: for planned cuts both detectors miss, the gate decodes the frames within 3.5
    frames of each boundary at 160x90 grey and measures 1 minus the Pearson correlation of
    consecutive frames, which ignores brightness. The cut counts when, within one frame of the
    boundary, a frame shares less than half its structure with the one before (r² < 0.5) and the
    step before is at least `REPLACEMENT_RATIO` (4) times calmer; only the leading side must be
    calm, because exposure kicks, flashes and action that starts with the new shot follow a cut.
    The scene threshold, pixel detector, carry-cut and unplanned-cut findings are unchanged, and
    the extra decode runs only when a planned cut is otherwise missed. A first variant on scene
    scores was rejected: ffmpeg's score subtracts the previous frame's change, so a whip into a
    match cut looked calm and passed. Results report `cuts.structureCutsSec`; these cuts also
    count for audio sync, as pixel cuts already do.
11. The composition gate failed because its last sample (95% of the last beat, clamped to 5.966 s)
    fell on upstream's three-frame fade to black. The port drops that fade (`uOut`, `shot().out`
    and the overlay fade) and holds the Done pill to the last frame; the rest of the look is
    unchanged.
12. Rendered evidence and technical conformance stay separate; passing checks never grant Visual
    Acceptance. Attribution: keep the upstream credit to Michael Nowak; never use his material.

## Ownership and compatibility

- Importer and test: `scripts/import-film-sources.cjs`, `tests/film-sources.test.cjs`.
- Snapshot: `skill/vendor/ff-tracking/` (`manifest.json`, `upstream/`), `-text` in `.gitattributes`.
- Template: `skill/tools/ff-tracking-hud/`; scaffold value in `skill/scripts/film-project-core.cjs`
  and the usage line in `skill/scripts/cli-core.cjs`; sample clamp and planned structure cuts in
  `skill/scripts/film-core.cjs`, covered by `tests/film-continuity.test.cjs`.
- Guidance: `skill/references/film-tracking-hud-template.md`, one row in `workflow-film.md`,
  `skill/vendor/README.md`.
- Registration: `package-resources.json` (guide, template, manifest, 46 vendored files),
  `component-source-catalog.json`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`,
  `tests/ff-tracking-hud.test.cjs` in `scripts/test-manifest.json`.

No receipt, policy digest or public command changes. The render result's `cuts` object gains one
additive field, `structureCutsSec`; its other fields keep their meaning. `film scaffold` gains one
allowed template value and existing templates are unchanged.

## Verification

Measured on Windows 11, RTX 4070 Ti, HyperFrames 0.8.137, Chrome headless shell 152: a 2 s single
shot renders at 114 ms/frame (1080p) and 202 ms/frame (4K) on the GPU, 579 and 747 ms/frame with
SwiftShader; repeated renders were byte-identical per mode. The default 6 s film, scaffolded fresh,
rendered in 17.8 s (six workers, 1080p GPU) and a second full render was byte-identical. The probe
passed on 36 frames (215 labels, worst marker 0.496 px, 120 glyphs, worst 0.481 px). `film check`
passed every gate; all 11 planned cuts were found (4 by scene change, 7 by frame structure) and the
last sample shows the Done pill. Its warnings remain review prompts and passing is not acceptance.
`npm test` ran with `TEMP`/`TMP`/`TMPDIR` on D: (C: lacks space for the hermetic temp root): 1443
repository tests, 0 failed, 4 skipped for optional runtimes or a case-sensitive filesystem.
Checks:

- `npm test` (repository QA; the template test is registered in the manifest)
- `npm run sources:check`
- `npm exec -- openspec validate add-ff-tracking-template --strict`
- `npm run specs:check`
