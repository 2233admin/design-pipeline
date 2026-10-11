# Verification: internalize-art-motion-naming

`<former>` stands for the reference project's romanized name. Technical checks below describe what
was exercised; they grant no creative or Visual Acceptance.

## Tested revision

- Implementation commit `22a980ad82e713b25709d0558ee4a8a73f6e9ad1`, tested tree
  `b82419c6612fc0f2e3ed665295673d171d4a3b66`; it contains main `b5e0f22`.
- Windows 11, Node.js 26.3.1, FFmpeg/ffprobe 9.0, local Chrome. Python 3.12.10 with
  `fonttools==4.66.1` in a uv environment outside the repository, passed as `FONTTOOLS_PYTHON`.

## Naming acceptance

- `git ls-files | rg -i <former>`: no output, exit 1.
- `git grep -i <former>`: no output, exit 1. `git grep -i -E 'hua[[:space:]_.-]*shu'`: no output.
- Repository QA: `OK tracked paths and contents omit the former reference-project name`.
- The Chinese nickname remains only inside the verbatim MIT copyright line: `skill/tools/art-motion/LICENSE:3`,
  `skill/tools/art-motion/runtime.js:4` (embedded notice), `THIRD_PARTY_NOTICES.md:474` and the quotation in
  `design.md`.

## Tests

- Focused run (`node --test` over `tests/art-motion-{runtime,scroll,assets-audio,tools,voice}.test.cjs`,
  `tests/visual-craft.test.cjs`, `tests/designer-pipeline-cli.test.cjs`): 47 tests, 47 passed, 0 failed,
  0 skipped. This covers the browser catalog proof (35 scenes, 8 clips, the transition registry, portrait
  and landscape, isolation), the reproducible build, owned engine/font/example/license completeness,
  `art-motion render` stills/video/alpha through the CLI and module, `reference analyze-video --study`,
  scaffold copies and documentation links/options.
- `npm test`: every repository QA check OK, including package reproducibility, the archive containing every
  required resource, isolated install, installed-package CLI smoke (12 of 12) and an unchanged repository
  status. Repository tests (121 files): 1,131 tests, 1,128 passed, 0 failed, 3 skipped (the optional pinned
  GEPA runtime is not installed). Browser-tool self-tests passed.
- `npm run specs:check`: 66 passed, 0 failed.

## Runtime equivalence

The former bundle (`0160bc9`, 15,916 lines, 1,304,954 bytes) and the regenerated `runtime.js` (15,624
lines, 1,287,047 bytes, SHA-256 `234faafe903e20bd788457f06eeae792faba7fb2677fdb760208185c4e170041`) differ in
88 classified hunks and nothing else: header line 1; renamed global, factory and messages (9); removed
source commit (3); the font-list and author-likeness module bodies (2); one alias line per surviving module
(59); registry, core-list and demo-art references to the removed modules (5); the bean-character persona
comment (3); engine comments and one glyph console message that named removed upstream files (6). The
former build reproduced the committed former bundle before cut-over. A side-by-side stub-canvas run of
both bundles (35 scenes x 2 times, 8 example clips x 3 times, 50 transitions x 2 progress values, at
1920x1080 and 1080x1920) produced identical per-draw operation hashes. `npm run art-motion:build` is
idempotent.

## Removed material and consumer evidence

Searched at `0160bc9` over `skill/` (without the former bundle), `tests/`, `scripts/` and `docs/`;
`skill/references/pipeline-reference.md`, `stages.md` and `skill/SKILL.md` never routed to the bundle.

| Removed | References found | Why it had no remaining consumer |
| --- | --- | --- |
| Manifest, importer, upstream README/SKILL/CHANGELOG/CONTRIBUTING/.gitignore/CI/release manifest | importer, provenance assertions in the former tools test, package list, former guide and tools index | Provenance for a vendor snapshot that no longer exists |
| Media defaults/schema, `capabilities.py`, `check_release.py`, `images.py`, four upstream tests | package list and the former tools test's presence list | Never executed; guides marked them reference only |
| Compatibility note | one `methods.md` link | Dated record of the removed installers, scripts and tests |
| `key_green.py`, `key_split.py`, `subzone_gate.py`, `font_subset.py`, `qa.py`, `koubo.py`, `breakdown.py`, synthesis script, `compare.py`, `render.py` | package list, attribution comments, former tools test | Replaced by `assets.cjs`, `font-subset.py`, `voice.py`, `audio.cjs`, `reference.cjs`, visual diagnostics and `art-motion render` |
| Harness (`engine.js`, `eras*.js`, `index.html`, `clip.html`, `clip.js`, `scenes/index.js`, `fonts/index.json`) | package list only | The static runtime and render kernel replace it |
| 50 demo-film files | package list, former tools test | Ran only on the removed harness; parameterized clips remain |
| 74-file reference film with Arphic stroke data | package list, former guide, one `styles.md` link, former tools test | Its README called it not renderable; the y6 method card remains |
| Author-likeness character module | build lists, one README row, absence assertions in the runtime test | No scene, clip, tool or test drew it |
| Font-list module | build replacement, `render.cjs` regex | Replaced by `fonts/catalog.json` |
| Duplicate visual-craft license | scaffold copy, README, tests | Scaffold copies the canonical `LICENSE` |

Method, style and grammar notes that a guide linked were kept, including the voice, voice-API,
voice-configuration, image, style-index and era-scene notes.

## License

`skill/tools/art-motion/LICENSE` is byte-identical to the former MIT `LICENSE`, which never contained the
romanized name. MIT requires: "The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software." The copyright line `Copyright (c) 2026 alchaincyf
(花叔 · 花生)` therefore stays verbatim in the license, the runtime header and scaffolded `LICENSE.art-motion`.
Fonts keep `OFL.txt` and `LICENSES.md` beside them.

## Review fixes (PR #90)

Tested at `3297dbe` (tree `b9718824cb9fafe93c038f340a7906eb10e2cceb`) with the same tools as above. The three
findings the first pass recorded outside this change are fixed, and guides no longer point at unshipped material.

- `safe.fill`: `drawClip` paints the margins outside `ctx.box` after the grammar draws, except with
  `alpha: true`. The new test `render paints safe.fill margins outside the content box and leaves them
  transparent for alpha` renders a 320x180 `y5_kinetic_type` still with `safe {top:30, bottom:40, left:16,
  right:12, fill:'#ff00ff'}` through the kernel. It checks that every margin pixel is opaque `#ff00ff`, that
  no box pixel is, and that the alpha render leaves every margin pixel at alpha 0. On a clean `4f0cf8b`
  worktree with only this test copied in, it fails with `band pixel 0,0 is 255,210,63,255` (the grammar's
  background, unpainted). On the new head it passes. The regenerated `runtime.js` is 15,638 lines, 1,287,766
  bytes, SHA-256 `9143b2aade0fcbd99d2db0004584295e8a268defdc576707d11c71d93ebe3c8b`. `npm run art-motion:build`
  reports `Unchanged` on a second run. Clips without `fill` draw as before.
- Examples: every `examples/<grammar>.json` selects `"fonts": "bundled"`. At `4f0cf8b`, `art-motion render` on the
  t3 example exited 1 with `Clip t3_finance_chart requires font family "PuHui-Medium"; provide it in runtime fonts`.
  Now `designer-pipeline art-motion render --root . --spec skill/tools/art-motion/examples/<grammar>.json
  --stills 1,<duration/2>,<duration-0.5>` rendered 3 stills each, with `coldAndReorderedMatch: true` and no
  warnings, for t1_3b1b, t2_keynote_ui, t3_finance_chart, y1_kurzgesagt, y2_vox, y3_whiteboard, y4_storytime and
  y5_kinetic_type. A contact sheet of the last stills was reviewed for missing fonts or images and showed none.
  The tools test validates each example as a render spec, and the runtime test strips the render-only `fonts` key.
- `designer-pipeline help` prints `composition scaffold --output <new-dir> [--template visual-craft|art-motion]`,
  built from the scaffold's exported template list and asserted in the CLI help test.
- Guides: grammar, method and style notes and the tool guides drop pointers to demo films, overview images,
  `engine.js`/`eras.js`/`index.html`/`clip.html`/`clip.js`, `render.py`/`qa.py`/`compare.py`, the synthesis,
  voice-configuration and image scripts, the reference film, and the per-demo QA tables. The 09 grammar table's
  demo column now links the example specs. The method, timing and review lessons stay. A grep for
  `上游|未提供|本项目差异|demos/|qa\.py|render\.py|engine\.js|eras\.js|clip\.js|clip\.html|--film|_总览` over the guides
  returns no hits. The Art Motion guide link/option test passes.
- `npm test`: every repository QA check OK, including the naming policy, package reproducibility, isolated
  install, installed-package CLI smoke (12 of 12) and unchanged repository status. Repository tests (121 files):
  1,132 tests, 1,129 passed, 0 failed, 3 skipped (GEPA runtime not installed). Browser-tool self-tests passed.
  Two earlier full runs on the same changes failed one and then three `tests/component-eval.test.cjs` native
  visual-review tests, each with `task did not reach expected state within 60s` while the machine was loaded.
  That file passed 18 of 18 when run alone, and it does not touch Art Motion.
- `npm run specs:check`: 66 passed, 0 failed.

### Unusable `safe.fill` values

Tested at `db074fb` (tree `14122c6e2a5ea4bc5351a8fd9add883fc91cee26`). Canvas ignores an unparseable `fillStyle` and
keeps the previous one, so a `string`-only check let `"not-a-color"` paint the margins with a stale colour.

- `drawClip` assigns the fill after two different sentinels. If the two results differ, Canvas rejected the value:
  `clipSpec.safe.fill must be a CSS color: "not-a-color"`. It then paints the fill on a 1x1 probe. A fill whose
  pixel alpha is 0 (`transparent`, `rgba(…, 0)`) is rejected: `clipSpec.safe.fill is fully transparent; omit fill
  to leave the margins unpainted`. Valid fills are cached per instance.
- Transparent decision: reject, not clear. Painting is source-over, so a transparent fill would leave the grammar
  visible and paint nothing. Clearing the margins of an opaque H.264 clip would encode them as black. Transparent
  margins come from `alpha: true`. Translucent fills still tint over the grammar. `09-clip-grammar.md` and the tool
  README document this.
- `art-motion render` keeps its Node `typeof` check and then calls the runtime's `drawClip` once in the page before
  creating the output directory. The runtime stays the only colour parser, and contract errors leave no output.
  CLI sample: `cli: clipSpec.safe.fill must be a CSS color: "not-a-color"` (exit 1, `KERNEL_FAILED`); `oklch(0.7 0.2
  330)` renders.
- Fail before, at `5753d3d` with only the new tests applied:
  `safe.fill must be a visible CSS colour; translucent fills composite over the grammar` failed with `Missing
  expected rejection: module rejects not-a-color`, and the runtime catalog test failed with `clipSpec validation
  failed to reject unparseable safe fill`. Pass after, at `db074fb`: both pass. The new test asserts module and CLI
  rejection of `not-a-color`, `transparent` and `rgba(255, 0, 255, 0)` with an unchanged directory listing, and
  that `rgba(255, 0, 255, 0.5)` margins equal the average of the fill and the unfilled render within ±1 per channel,
  while box pixels are unchanged. The runtime test adds the same three rejections.
- `runtime.js`: 15,651 lines, 1,288,698 bytes, SHA-256 `cb7df2a8dd74df119301e323af42312a837df8f9223daf4815c84e332c7fc9b7`.
  The rebuild is `Unchanged` on a second run.
- `npm test`: exit 0, every QA check OK (naming policy, isolated install, installed CLI smoke, unchanged status).
  Repository tests: 1,133 tests, 1,130 passed, 0 failed, 3 skipped (GEPA). `npm run specs:check`: 66 passed, 0 failed.

### Fresh runtime after the clip preflight

Tested at `91364f7` (tree `44073a43f0df561d3c63c6816c9f2e6dc7cc2135`). The kernel's `safe.fill` preflight drew frame 0
on the runtime that then recorded the clip. After a successful preflight, and before the output directory exists, it
now calls the existing `window.resetArt()` (the cold-redraw reset). There is no new API, and `runtime.js` is unchanged
(the build reports `Unchanged`).

- Test `render's clip preflight leaves the first recorded frame equal to a fresh runtime's frame`: renders a still of
  every example clip at 640x360, 30% into the clip, through `render()`. It asserts that the first frame's `sha256`
  equals the PNG hash from a fresh runtime that has drawn only that frame, using the kernel's page setup without
  the preflight. It passes at `91364f7`.
- The drift is not observable on the current grammars, so the test is an invariant guard and does not fail on
  `6b24719`; it also passed there with that commit's `render.cjs`. A probe drew each example at every half-second
  (y2_vox and t2_keynote_ui at every frame) on a fresh runtime, then on a runtime that had drawn t=0 first.
  Frames differed only for y2_vox at 3.4–5.23 s and t2_keynote_ui at 8.4–9.97 s, the windows of their `highlight`
  cues. At every one of those times, a second draw on the same runtime also differs from the first. The kernel's
  existing cold/reordered check (first frame vs. a warm redraw vs. a fresh runtime) therefore rejects those frames
  with or without the preflight. `render.cjs` from `bdb1ae8`, before the preflight, also fails y2_vox at 4.5 s
  with `cold/reordered frame mismatch`. A successful render always has a first frame equal to a fresh runtime's.
  The reset makes this hold by construction rather than only being checked.
- Finding outside this fix, fixed below: the y2_vox and t2_keynote_ui `highlight` frames depended on draw history.
- `npm test`: exit 0, every QA check OK. Repository tests: 1,134 tests, 1,131 passed, 0 failed, 3 skipped (GEPA).
  `npm run specs:check`: 66 passed, 0 failed.

### Clip frames as a pure function of spec and time

Tested at `6360a7c` (tree `b632645b5961a5ca25804ef7e08afae00c3cddb3`).

- Root cause: `drawClip` validated the spec on every draw and passed the grammar new cue objects (`valid.cues`), but
  it ran `init` only on the first draw of a spec. Grammars keep the cue objects init saw and match against the
  current draw's cues by identity: y2_vox `own !== q` and `… === q` (`clips/y2_vox.js:121,126`), and t2_keynote_ui
  `ctx.cues.indexOf(q)` (`clips/t2_keynote_ui.js:185`). Only the draw that ran init drew the highlight. Later draws
  skipped it: y2 lost its marker and red ring, and in t2 `indexOf` returned -1, so the card's highlight window
  closed early. No cache, random, accumulator or library function was involved. Stubbing `CL.highlight`,
  `DG.drawPartial`, `CAM.motionBlur`, `UI.sheen` and `UI.backdrop` did not remove the difference, and every library
  call on the path is pure.
- Consequences before the fix: a seeked still in a highlight window failed `art-motion render` (Main reproduced it on
  `87b0304`: y2_vox `--stills 4.5` exits 1 with `cold/reordered frame mismatch`). In a sequential video only frame 0
  ran init, so neither clip ever showed its highlight. On the old runtime, a forward and a backward pass over every
  frame agreed everywhere except the first frame each pass drew, which confirms the highlight was missing in both
  passes.
- Fix (`scripts/build-art-motion-runtime.cjs`): `drawClip` keeps `{specKey, cues}` per clip and reuses the
  initialized cue objects for every draw of the same spec. A changed spec re-runs init with new cues, as before.
  Grammar sources are unchanged. y3_whiteboard also calls `cues.indexOf`, but only inside `init`, so it was already
  consistent. `runtime.js`: 15,653 lines, 1,289,054 bytes, SHA-256
  `90a91bda402b2672f6f61b0b996aefd9294f7477c87b1affdc3d5cc395c5184d`. The rebuild reports `Unchanged` on a second run.
- Test `every example clip frame is a pure function of its spec and time`. For each of the 8 examples at 640x360, a
  fresh runtime draws the frame twice every 0.5 s and the two hashes must match. It also renders single stills
  through the kernel, each with `coldAndReorderedMatch` true: y2_vox at 3.5/4.5/5.2 s, t2_keynote_ui at 8.5/9/9.9 s,
  and the others at 30/50/80 %. Before, with the `87b0304` runtime: `✖ … t2_keynote_ui: drawing the same frame twice
  on one runtime changes it at these seconds` with `[8.5, 9, 9.5]`. After, at `6360a7c`: ✔. The preflight test now
  shares the same fresh-runtime helper.
- Sweep over all 8 grammars at `6360a7c`: every frame drawn forward on one runtime and backward on another gives
  identical pixel hashes (t1 300, t2 300, t3 210, y1 300, y2 270, y3 300, y4 255, y5 240 frames; 0 mismatches). The
  earlier every-frame draw-twice probe found drift only in y2 and t2, and only in their highlight windows. No other
  grammar needed a fix. CLI stills of y2_vox at 4.5 s and t2_keynote_ui at 9 s now render with the highlight,
  `coldAndReorderedMatch: true`.
- `npm test`: exit 0, every QA check OK. Repository tests: 1,135 tests, 1,132 passed, 0 failed, 3 skipped (GEPA).
  `npm run specs:check`: 66 passed, 0 failed.
