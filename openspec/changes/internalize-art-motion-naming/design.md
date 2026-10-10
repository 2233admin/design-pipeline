Status: implementation in progress. `<former-bundle>` and `<former>` stand for the reference
project's directory name and romanized name, which this record does not spell.

## Goals and non-goals

- The romanized reference-project name appears nowhere in tracked paths or contents.
- Every behavior reached by a test, guide or CLI path stays, under a project-owned name and in
  the locations this repository uses for owned helpers and guides.
- Mirror material without a consumer is deleted; branded wrappers collapse into owned modules.
- No new gate, receipt, schema, target resolver or policy digest. Render and study outputs stay
  diagnostics and grant no creative or Visual Acceptance.
- Non-goals: new visual capability, different scene/clip/transition drawing, other vendor bundles.

## Decisions

### 1. Owned code leaves `skill/vendor/`

`skill/vendor/` keeps attributed upstream snapshots with their original bytes. Art Motion is now
project-owned code and method material, so the AGENTS.md rule to preserve upstream bytes no longer
applies to it. Its files move to maintained locations, edits are ordinary owned changes checked by
tests, and no manifest, pinned revision or importer remains. Build-time string patches become
source edits.

### 2. Layout

- Callable code: `skill/tools/art-motion/` — `engine/` (runtime source), generated `runtime.js`,
  `fonts/` (licensed fonts and `catalog.json`), `examples/` (grammar inputs), `LICENSE` and the
  existing helpers.
- Guides: `skill/references/art-motion.md` (entry) and `skill/references/art-motion/` with
  `methods/`, `styles/` and `grammars/`. Owned file names are ASCII English slugs.
- Maintenance-only build: `scripts/build-art-motion-runtime.cjs` (not packaged).
- CLI: `designer-pipeline art-motion render` (kernel `skill/scripts/render-art-motion.cjs`) and
  `designer-pipeline reference analyze-video --study`, both registered in `cli-core.cjs`.

### 3. Optimization

- Delete mirror material with no consumer (see "Deleted as unused").
- One canonical license, `skill/tools/art-motion/LICENSE`; the scaffold copies it as
  `LICENSE.art-motion` for both templates instead of keeping a duplicate in `tools/visual-craft/`.
- The reference study is a flag on the existing `reference analyze-video` command rather than a
  second entry point; rendering joins the CLI through the existing kernel mechanism.
- The bundled font list becomes data (`fonts/catalog.json`) instead of a regular expression over a
  runtime module that the runtime itself replaced.
- The build reads owned source directly: no manifest lookup, hash pinning or string patching.
  The runtime drops the unused font-list module and the author-likeness character module.
- Examined and kept separate: `visual-craft/canvas.js` is a small caller-owned subset copied alone
  into projects; `motion-foundation-core` validates motion-foundation documents and has no runtime
  easing to share; `render.cjs` and `reference.cjs` already reuse the film and reference cores.

### 4. License

The reference project's MIT `LICENSE` contains no romanized brand. Its copyright line
`Copyright (c) 2026 alchaincyf (花叔 · 花生)` and permission notice stay verbatim in
`skill/tools/art-motion/LICENSE`, the generated `runtime.js` header and the scaffolded
`LICENSE.art-motion`. MIT requires: "The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software." It requires neither the project
name nor its repository URL, so `THIRD_PARTY_NOTICES.md` attributes by copyright holder
(`alchaincyf`) and license. Bundled fonts keep `OFL.txt` and `LICENSES.md` beside them; SIL OFL 1.1
permits redistribution "provided that each copy contains the above copyright notice and this
license". The Arphic-licensed stroke data is no longer redistributed because the reference film
that used it is deleted. The Chinese nickname stays only inside the verbatim copyright line and
quotations of it; persona uses in owned comments and notes are neutralized.

### 5. Naming and history

Acceptance is zero case-insensitive hits for the romanized name in `git ls-files` and `git grep`.
Historical OpenSpec records keep their facts with neutral wording; the earlier change directory
becomes `complete-art-motion-internalization` with a naming note. Its requirements on source byte
provenance and on retaining upstream media defaults, schema, tests and release files are
superseded by this change.

## Compatibility and migration

- `node <skill-root>/tools/art-motion/render.cjs …` becomes `designer-pipeline art-motion render …`;
  `node <skill-root>/tools/art-motion/reference.cjs …` becomes `reference analyze-video … --study`.
- Browser/CommonJS callers load `runtime.js` and call `ArtMotion.createArtMotionRuntime`; instances
  no longer expose a source commit; `enableDemoArt()` returns `{ TOON }`.
- `render-report.json` replaces `sourceCommit` with `runtimeSha256`.
- Scaffolded studies contain `runtime.js` and `LICENSE.art-motion`.
- `koubo.py` becomes `voice.py`; `<FORMER>_PYTHON` becomes `FONTTOOLS_PYTHON`.

## Contracts

### Paths

| Former | Owned |
| --- | --- |
| `skill/vendor/<former-bundle>/LICENSE` | `skill/tools/art-motion/LICENSE` (verbatim bytes) |
| `…/upstream/scripts/engine/lib/` brush, camera, chart, collage, diagram, kit, motion, paint, post, render, rig, toon, typo, ui, util (`.js`) | `skill/tools/art-motion/engine/lib/` |
| `…/engine/scenes/<NN_id>.js` (35) | `skill/tools/art-motion/engine/scenes/` |
| `…/engine/clips/<id>.js` (8) | `skill/tools/art-motion/engine/clips/` |
| `…/engine/transitions.js` | `skill/tools/art-motion/engine/transitions.js` |
| `…/engine/lib/fonts/` 45 `.woff`, `OFL.txt`, `LICENSES.md` | `skill/tools/art-motion/fonts/` |
| font list in `…/engine/lib/fonts.js` | `skill/tools/art-motion/fonts/catalog.json` |
| `…/engine/examples/*.json` (8) | `skill/tools/art-motion/examples/` |
| `…/examples/assets/` `K线图_横屏`, `营收图_竖屏`, `财经图表_横屏` (`.png`) | `examples/assets/` `candlestick-landscape`, `revenue-portrait`, `finance-chart-landscape` (`.png`) |
| `skill/tools/art-motion/<former>-runtime.js` | `skill/tools/art-motion/runtime.js` |
| `skill/tools/art-motion/build-<former>-runtime.cjs` | `scripts/build-art-motion-runtime.cjs` |
| `skill/tools/art-motion/koubo.py` | `skill/tools/art-motion/voice.py` |
| `skill/tools/visual-craft/LICENSE.<former-bundle>` | removed; scaffold copies `../art-motion/LICENSE` |
| `skill/references/<former-bundle>.md` | `skill/references/art-motion.md` |
| `tests/<former>-{runtime,scroll,assets-audio,tools,koubo}.test.cjs` | `tests/art-motion-{runtime,scroll,assets-audio,tools,voice}.test.cjs` |
| `<FORMER>_PYTHON` | `FONTTOOLS_PYTHON` |
| npm `sources:build:<former>`, `test:<former>` | `art-motion:build`, `test:art-motion` (`uv run --with fonttools==4.66.1 …`) |
| npm `sources:import:<former>`, `scripts/import-<former-bundle>.cjs` | removed |
| `.design-pipeline/<former>-complete/` local proof output | `.design-pipeline/art-motion/` |

### Runtime (`skill/tools/art-motion/runtime.js`)

- UMD bundle: CommonJS `module.exports = { createArtMotionRuntime }`; browser global `ArtMotion`.
- `createArtMotionRuntime(options)` keeps the former options and validation: positive integer
  `width`/`height`, `createCanvas`, `capabilities.{Path2D,DOMMatrix,DOMPoint}`, optional `fps`,
  `seed`, `assets`, `fonts` (`{family,url}`) and `cmapCache`.
- Instance members stay `width height fps seed assets fonts libraries sceneIds clipIds createCanvas
  random setTime drawScene drawClip transition scenes clips transitions transitionIds enableDemoArt
  dispose`; there is no source commit on the module or instance, and `enableDemoArt()` returns
  `{ TOON }`.
- `libraries` namespaces: `U PAINT CAM CH CL DG KIT MO RIG TY UI SCENES CLIPS TRANSITIONS`, plus
  opt-in `TOON` loaded by `enableDemoArt()` or the y1/y4 grammars. Nothing is written to host globals.
- Messages say "Art Motion". The header names the build script and embeds `LICENSE` verbatim.
- Apart from the header, names and messages and the two removed modules, the regenerated bundle is
  identical to the former one, so scene, clip and transition drawing is unchanged.

### Build (`scripts/build-art-motion-runtime.cjs`)

- Reads `skill/tools/art-motion/engine` with explicit lists: libraries `util paint brush render
  post rig kit motion camera diagram typo chart ui collage toon` (core: all but `toon`), the 35
  scenes and eight clips in the former order, then `transitions.js`.
- Writes `skill/tools/art-motion/runtime.js` only when its bytes change; exports `{ build }`.

### Render

- `render(root, options)` in `skill/tools/art-motion/render.cjs` keeps its spec contract. Scene
  and grammar ids resolve against `engine/scenes` and `engine/clips`; bundled fonts resolve
  through `fonts/catalog.json`; bundled font inputs are reported as `bundled:<file>`.
- `render-report.json` replaces `sourceCommit` with `runtimeSha256`, the SHA-256 of `runtime.js`.
- `designer-pipeline art-motion render --spec <file> --output <new-dir> [--stills 0,1.5]
  [--chrome <exe>] [--puppeteer-module <file>] [--ffmpeg <exe>] [--ffprobe <exe>]` runs the kernel
  `skill/scripts/render-art-motion.cjs`; exit 0 rendered, 1 contract or usage error. `--spec`,
  `--stills`, `--ffmpeg` and `--ffprobe` join `KNOWN_OPTIONS`.

### Reference study

`designer-pipeline reference analyze-video --path <video> --output <new-dir> [--start --end --fps
--max-frames] --study` calls `analyzeReference` from `skill/tools/art-motion/reference.cjs`: the
analyzer report plus `study.json`, an audio excerpt and spectrogram when the source has sound, and
separate grid candidates. `--study` is boolean; without it the command is unchanged.

### Font catalogue (`skill/tools/art-motion/fonts/catalog.json`)

`{ "faces": [ { "family": "Cinzel-400", "file": "Cinzel-400.woff" }, …, { "family": "Inter",
"file": "Inter-var.woff", "weight": "100 900" } ] }` holds the former 45 entries in order, with
`file` relative to `fonts/`. Aliases such as `PuHui-Medium` keep pointing at Noto Sans SC files.

### Method documents (`skill/references/art-motion/`)

| Former (`…/upstream/references/`) | Owned |
| --- | --- |
| `01-拆解.md` | `methods/01-reference-breakdown.md` |
| `02-机制.md` | `methods/02-mechanisms.md` |
| `03-一帧先行四条路线.md` | `methods/03-first-frame-routes.md` |
| `04-纯代码绘制.md` | `methods/04-code-drawing.md` |
| `05-节奏与配乐.md` | `methods/05-rhythm-and-score.md` |
| `06-口播驱动的艺术短片.md` | `methods/06-speech-driven-shorts.md` |
| `07-正面经验.md` | `methods/07-proven-practice.md` |
| `08-风格作者规范.md` | `methods/08-style-authoring.md` |
| `09-视频动画语法.md` | `methods/09-clip-grammar.md` |
| `10-角色.md` | `methods/10-characters.md` |
| `11-长卷穿越片.md` | `methods/11-long-scroll-films.md` |
| `12-口播整片与经验回流.md` | `methods/12-full-film-iteration.md` |
| `13-口播与语音复刻.md` | `methods/13-voice-and-cloning.md` |
| `口播API.md` | `methods/voice-api.md` |
| `capabilities.md` | `methods/voice-configuration.md` |
| `images.md` | `methods/images.md` |
| `…/scripts/engine/时代作者规范.md` | `methods/era-scene-spec.md` |
| `风格配方/<NN_id>.md` (35) | `styles/<NN_id>.md` |
| `风格配方/INDEX.md` | `styles/index.md` |
| `风格配方/_转场_迁移测试.md` | `styles/transitions.md` |
| `风格配方/_音轨_艺术史速通.md` | `styles/soundtrack-synthesis.md` |
| `动画语法/<id>.md` (9) | `grammars/<id>.md` |

A note that a route or guide links to stays, neutralized, unless the capability it describes is
gone. The voice, voice-API, voice-configuration and image notes stay as reference for the voice and
image workflows; their commands for removed upstream scripts are marked as not shipped and point to
the maintained entries (`voice.py`, the image workflow in `tools/art-motion/assets-audio.md`).

Mentions of removed harness files map to maintained entries: engine `lib`, `scenes`, `clips` and
`transitions.js` → `tools/art-motion/engine/…`; `render.py`, `qa.py` → `designer-pipeline art-motion
render` plus the existing composition/film checks; `breakdown.py` → `reference analyze-video
--study`; `compare.py` → `composition compare`; `key_green.py`, `key_split.py` → `assets.cjs`
`keyFiles`/`splitFile`; `subzone_gate.py` → `assets.cjs` `inspectRegions`; `font_subset.py` →
`font-subset.py`; synthesis scripts → `audio.cjs`; voice `say`/`train`/`voices`/`bind` and the
media configuration → not shipped (offline `voice.py` only). Demo films, `engine.js`, `eras.js` and
the reference film are described as removed examples; long-scroll mechanics route to `scroll.js`.

## Slices and ownership

Workers edit only their files, never run Git commands that write the index and do not run the
full suite; the integration owner reconciles shared files and runs acceptance.

| Slice | Owns |
| --- | --- |
| Engine and runtime | `skill/tools/art-motion/{engine,fonts,examples}/`, `LICENSE`, `runtime.js`, `scripts/build-art-motion-runtime.cjs` |
| Tools and CLI | `render.cjs`, `reference.cjs`, `voice.py`, `study.html`, `skill/scripts/render-art-motion.cjs`, `skill/scripts/cli-core.cjs`, `tools/visual-craft/{scaffold.cjs,canvas.js}`, `tools/visual-diagnostics/diagnostics.cjs`, `tests/{designer-pipeline-cli,visual-craft}.test.cjs` |
| Art Motion tests | `tests/art-motion-*.test.cjs` |
| Guides | `skill/references/art-motion.md`, `skill/tools/art-motion/*.md`, `skill/tools/{README,fonts}.md`, `skill/tools/visual-craft/README.md`, `skill/vendor/README.md`, other `skill/references/*.md` that link the capability |
| Method documents | `skill/references/art-motion/**` |
| History, notices, CI | other OpenSpec changes, `THIRD_PARTY_NOTICES.md`, `CONTRIBUTING.md`, `.github/workflows/*` |
| Integration | this change, `package.json`, `scripts/test-manifest.json`, `scripts/qa.cjs` naming policy check, `skill/references/package-resources.json`, `CHANGELOG.md`, `.gitattributes`, removal of the former bundle and importer |

## Deleted as unused

- Mirror metadata: `manifest.json`, the duplicate `upstream/LICENSE`, upstream `README.md`,
  `SKILL.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `.gitignore`, `.github/workflows/tests.yml`,
  `release-manifest.json`, and the importer with its npm script.
- Upstream media configuration, release and provider scripts: `defaults/media.json`,
  `schemas/media.schema.json`, `capabilities.py`, `check_release.py`, `images.py`, four upstream
  Python tests, and the compatibility note, a dated verification record of those removed
  installers, scripts and tests.
- Python scripts already replaced by maintained tools: `koubo.py`, `font_subset.py`,
  `key_green.py`, `key_split.py`, `subzone_gate.py`, `qa.py`, `analyze/breakdown.py`, the
  soundtrack synthesis script, `engine/compare.py` and `engine/render.py`.
- Engine harness and demos: `engine.js`, `eras.js`, `eras_gallery.js`, `index.html`, `clip.html`,
  `clip.js`, `scenes/index.js`, the font-list module, `fonts/index.json`, 50 demo-film files, and
  the 74-file reference film (its README calls it not renderable without the removed harness) with
  its Arphic stroke data and license.
- The author-likeness character module and its namespace; no scene, clip, tool or test drew it.

## Verification

- Zero hits for the romanized name in `git ls-files` and `git grep`, case-insensitive. Repository
  QA (`scripts/qa.cjs`) keeps this as a policy check over tracked paths and contents, beside its
  root-document name check; its pattern never matches its own source text.
- `npm run art-motion:build` leaves `runtime.js` unchanged; the bundle differs from the former one
  only as the runtime contract states.
- `npm test` with `FONTTOOLS_PYTHON` from an isolated `fonttools==4.66.1` environment, and
  `npm run specs:check`.
