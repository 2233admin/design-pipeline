## Why

Agents asked for a film where a virtual camera films an AI agent's terminal while a tracker locks
onto the typed glyphs have no starting point: the HyperFrames film route would need the camera,
lens, tracker and sound rebuilt from nothing. The MIT project mrsarac/ff-tracking renders exactly
this film in Rust with fframes 1.2.0 and one SkSL lens shader, but running it needs Rust,
LLVM/libclang, a shared FFmpeg development build and Python with numpy and scipy, none of which
the skill installs. The user chose to keep the reviewed project as locked reference and
provenance and to make the film through the existing HyperFrames film toolchain.

## What Changes

- Lock and import the complete reviewed ff-tracking Git tree (commit
  `cc7f4e192eccefb55ae7f18f5a370955122b651b`, 46 files) with the existing film source importer,
  `scripts/git-tree-snapshot.cjs` inventory and hashes, and its MIT and font notices. The vendored
  bytes are never edited, built or run.
- Add the maintained HyperFrames template `skill/tools/ff-tracking-hud/`: one user config
  (`film.config.js`: typed script, palettes, shots and camera, timing, lens strengths); a tracks
  module ported from the upstream `hud` crate that is the single data source for picture and
  sound; the flat terminal drawn glyph by glyph on Canvas 2D in the vendored JetBrains Mono; a
  WebGL2 port of `lens/shaders/lens.sksl` that samples that canvas in the same frame; the camera
  tracker overlay (links, labels, brackets) projected on the CPU with the shader's camera and drawn
  sharp after the lens; sound synthesized with ffmpeg from the tracks events; a build script that
  writes `storyboard.json`, `index.html`, `tracks.json` and the raw sound; and a self-test that
  measures seek determinism and label-to-glyph alignment.
- `film scaffold --template tracking-hud` writes that project, alongside the existing `default`
  and `motion-study` templates. No new flag.
- Add `references/film-tracking-hud-template.md` (when the template fits, the config, build,
  render, self-test, existing film check, review and attribution) and one row in the film build
  table of `references/workflow-film.md`.
- Register the snapshot in the source catalog, package resources, vendor index, notices and the
  existing film source checks; register the template files and its test.
- Fix two blockers the template's default render exposed. The render gate missed planned hard cuts
  between dark shots under grain or a hand-held camera (a generic detector gap, reproduced with
  synthetic clips): planned boundaries now also count when one frame breaks the picture's
  structure after a calm step. The port holds the final Done pill instead of upstream's
  three-frame fade to black, so the composition gate's last sample shows the subject.

## Capabilities

### Modified Capabilities

- `design-pipeline`: a vendored film reference with locked provenance, a maintained HyperFrames
  template ported from it, a scaffold template value, a guide route and bounded render claims.

## Impact

Reuses `scripts/import-film-sources.cjs`, `scripts/git-tree-snapshot.cjs`,
`tests/film-sources.test.cjs` and `npm run sources:check`; the existing `film scaffold`,
`audio master`, `film check` (storyboard, timeline, render, audio and composition gates), frame
review and `decide` stages make and judge the film. No new dependency, CLI command or flag, gate,
receipt schema or policy digest. The template uses the HyperFrames 0.8.137 and GSAP 3.15.0 pins
the film scaffold already writes, plus ffmpeg/ffprobe, which film render checks already need. The
upstream Rust, LLVM, FFmpeg development and Python prerequisites are not used. Affected files: the
change, the importer and its test, `skill/vendor/ff-tracking/`, `skill/tools/ff-tracking-hud/`,
`skill/scripts/film-project-core.cjs` and the `film scaffold` usage line in
`skill/scripts/cli-core.cjs`, the render gate in `skill/scripts/film-core.cjs` and
`tests/film-continuity.test.cjs`, the new guide, `workflow-film.md`, `skill/tools/README.md`,
`package-resources.json`, `component-source-catalog.json`, `skill/vendor/README.md`,
`.gitattributes`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`, a new template test and
`scripts/test-manifest.json`.
