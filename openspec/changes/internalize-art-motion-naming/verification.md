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

## Findings outside this change

- `drawClip` validates `safe.fill` but does not paint it; `methods/09-clip-grammar.md` records this.
- The example clip specs carry no `fonts`; rendering one needs `"fonts": "bundled"` or explicit faces.
- The `composition scaffold` help line lists only the `visual-craft` template.
