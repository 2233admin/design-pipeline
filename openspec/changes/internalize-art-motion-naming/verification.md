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
- Finding outside this fix: the y2_vox and t2_keynote_ui `highlight` frames depend on draw history. Seeking a
  still into those windows fails the cold/reordered check, and sequential video frames there may differ from
  seeked frames.
- `npm test`: exit 0, every QA check OK. Repository tests: 1,134 tests, 1,131 passed, 0 failed, 3 skipped (GEPA).
  `npm run specs:check`: 66 passed, 0 failed.
