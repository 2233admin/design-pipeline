# Verification — 2026-10-06

The implementation follows the user's wider scope: graphics, drawing, images, typography,
layout, frontend and rendering support. `skill/tools/README.md` is the progressive index;
the main skill, implementation stage and graphics/web guides point there. Existing runtime,
CLI, v1 reference reports and acceptance contracts remain authoritative.

## Delivered and exercised

- `tools/visual-craft/canvas.js`: deterministic pressure ribbons, clipped paper grain,
  grapheme-aware label wrapping/fitting with explicit minimum-size overflow, image placement
  and explicit sprite frame selection. Its responsive study uses semantic DOM for copy/controls.
- `composition compare`: contained equal-size PNG originals, paired image, difference map,
  source/output hashes and limits. Refuses existing output or mismatched dimensions. No new gate.
- `reference analyze-video`: maps from each window's actual sampled frames, source IDs and
  hashes, bounded native thumbnail processing, stale/missing-map validation and legacy support.
- 17 upstream library modules and seven small scripts, byte-preserved at commit
  `26dba25b2b495c2138848c29a2c90df356a20325`, with per-file SHA-256 and MIT license. The source
  index gives dependencies and adaptation boundaries. These sources are not a runtime-certified
  engine; renderer, fonts and media assets are not bundled or fetched.

## Component Conformance

- Targeted tests with existing browser dependencies: **13/13 passed**, no skips.
- Real browser: HeadlessChrome/152.0.7977.30. Desktop 1280×900 and mobile 390×844;
  four progress positions per size matched exactly for cold and reverse rendering. Canvas
  styles, transform and current path remained intact; clipping and keyboard range input worked.
- Lead review fixed current-path mutation, sparse pressure validation, text measurement budgets,
  control/progress mismatch, source-frame ordering and high-resolution map processing cost.
- Real CLI video sample: 18 PTS-bound frames and two spatial maps from the local four-second
  motion study; lead inspected the map and source PNGs.
- Final `node scripts/qa.cjs`: **906 repository tests, 905 passed, 1 skipped (Blender unavailable),
  0 failures**; **11/11 installed-package CLI tests passed**. Reproducible archives include all
  34 new tool resources. QA left repository status byte-identical.
- OpenSpec strict validation and `git diff --check` passed.

The first full QA run hit two existing dispatcher wait deadlines while running in parallel.
All ten tests in that file passed alone, then the unchanged full QA command passed without
additional rendering work. No dispatcher code or timeout was relaxed. Both run logs are retained.

## Visual review and limits

The lead inspected full-size desktop/mobile study PNGs, the difference image, and a real video
map beside its source frame. The pressure mark stays legible, grain is static, captions fit
at 26px/16.72px, and changes are spatially localized. These are technical tool studies, not
proof of professional artwork quality, improvement across all models or user Visual Acceptance.
Sharp reversals, glyph availability, CJK punctuation, optical alignment, crop and material
choices still require actual visual judgment. Pixel changes cannot identify object semantics.

Local generated evidence: `.design-pipeline/visual-craft-study/` contains `verify.cjs`,
`browser-evidence.json`, `study-1280.png`, `study-390.png`, progress PNGs, comparison outputs,
`video-analysis/`, `qa.md`, `repository-qa.log` (initial deadlines) and
`repository-qa-retry.log` (final pass). No new dependencies were installed.

## Flow stage 6 evidence review — 2026-10-06

Scope: this change's tools, discovery guidance and existing composition/reference integration.
The working branch is `improve-beta-motion`, based on
`139dca4daea470f0ca7529973421f55a403fc7eb`; the implementation remains uncommitted.
This continuation changes only this report and local evidence. Other pending changes are not
included in this review's conclusions. Test success does not record user acceptance.

Evidence paths below are relative to `.design-pipeline/visual-craft-study/`.

| Conclusion | Verification method | Result and limits |
| --- | --- | --- |
| Current helper, comparison and video behavior passes its focused checks | Lead reran `node --test tests/visual-craft.test.cjs tests/visual-diagnostics.test.cjs tests/reference-video.test.cjs` with the existing Puppeteer module path and Chromium executable | Exit 0; 13 passed, 0 failed, 0 skipped. `flow-targeted-1791294141168.log`; command, environment, HEAD and implementation/test hashes in `flow-verification-1791294141168.json`. |
| The earlier full repository/package run succeeded | Lead reread the complete-run summaries in `repository-qa-retry.log` and checked the unchanged implementation scope; the full command was `node scripts/qa.cjs` | 905/906 repository tests passed, 1 Blender environment skip, 0 failures; 11/11 installed-package CLI tests passed. This is reused same-session evidence, not another full run. The original tool execution returned 0; the text log does not separately encode the outer exit code. |
| Earlier browser images still match the recorded evidence | Lead recomputed SHA-256 for the eight progress images, two comparison inputs and two comparison output images | All 12 bindings match; recorded in `flow-verification-1791294141168.json`. The focused browser test also exercised the current source at 1280×900 and 390×844. |
| Progressive discovery is present in the current skill | Lead inspected `skill/SKILL.md`, `skill/tools/README.md`, `references/stages.md`, `references/workflow-web.md` and `references/graphics-runtime-routing.md` | Entry points route to the index, one selected guide and the needed implementation. This verifies authored routing, not how reliably every model follows it. |
| Pinned upstream material is intact | Focused test `bundled technique sources retain their pinned bytes and license` | Passed: 17 JS modules, 7 Python utilities and the MIT license retain their declared bytes. Availability does not certify every upstream entry point as runnable here. |
| Initial full-run failures remain disclosed | Lead reread `repository-qa.log` | Two dispatcher wait deadlines occurred. Their file passed 10/10 alone in the earlier run; the unchanged full rerun then passed. The isolated run's output is in the prior tool record, not a separate saved log. No dispatcher code or timeout was relaxed. |
| Professional visual quality and general model improvement are not established | Technical browser study and the earlier lead pixel review only | User Visual Acceptance is pending; no cross-model quality evaluation or professional production brief was run. |

### Acceptance conditions

Each scenario in this change's `specs/design-pipeline/spec.md` is mapped separately.

| Acceptance condition | Evidence | Result |
| --- | --- | --- |
| Progressive tool loading | Current entry/index/guide inspection described above | Passed for authored discovery; automatic model adherence is not established. |
| Bounded implementation by a smaller model | `pressure stroke samples by arc length and has deterministic, non-degenerate geometry`; `image placement returns centered contain/cropped cover rectangles and sprite frames clamp or loop`; `browser study redraws cold/reordered at two sizes and preserves real Canvas state` | Passed for explicit inputs and repeatable rendering. This is not a comparative model-quality claim. |
| Invalid or unreadable authoring data | Geometry/sparse-pressure assertions, text-work bounds and minimum-overflow assertions in `tests/visual-craft.test.cjs`; actual browser overflow check | Passed; invalid data is rejected and impossible fitting reports overflow. |
| Compare equal-size images | `comparison CLI preserves original scale, binds hashes and refuses unsafe or existing output`; `spatial map locates changes, ignores invisible RGB and retains alpha changes`; saved comparison report/images | Passed; source size, localized changes and non-acceptance status checked. |
| Inspect motion in sampled reference frames | `motion maps show local sampled pixel change, bind to window frames and invalidate when altered or missing`; existing `video-analysis/` and earlier lead image inspection | Passed for sampled-frame diagnostics; object semantics and full-frame-rate analysis are not claimed. |
| Preserve evidence integrity | Comparison refusal checks and missing/altered/reordered motion-map checks in the focused suite | Passed; unsafe outputs are refused and changed evidence is invalidated. |

### Remaining boundaries

The real installation used by a future agent session was not updated in this source-repository
task. Isolated installed-package tests do not establish activation in the user's normal client.
Blender integration remains unverified on this machine. The source-method library requires
per-method adaptation and visual review when used; no new runtime certification is implied.
