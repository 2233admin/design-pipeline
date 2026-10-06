# Verification record

Date: 2026-10-07. Technical conformance is separate from creative or user acceptance.

## Coverage delivered

| Source capability | Maintained installed entry | Evidence |
| --- | --- | --- |
| 17 Canvas modules: paint/materials/lighting/post, math/fonts, camera, motion, rig, type, diagrams, charts, UI, collage and optional cartoon construction | `tools/art-motion/huashu-runtime.js` | Browser execution, explicit CJK fonts/cmaps, isolated instances, context preservation |
| 35 art styles and 50 transitions | Runtime `drawScene` / `transition`, `styles.md` | Every scene and transition executed in Chrome; 35 scenes captured and reviewed in four contact sheets |
| Eight parameterized clip grammars, ninth presenter reference | Runtime `drawClip`, `render.cjs`, style/method lookup | Every runnable grammar exercised; ninth card routes supplied character frames and drawing/timing tools, not an invented ninth implementation |
| Paths, pressure, text fit, image placement, comparison and heatmaps | Existing Visual Craft, composition compare and reference analyzer | Existing registered tests plus new reference/render integration |
| Character asset preparation and frame registration | `assets.cjs`, existing sprite frame selection | Real PNG key/split output, source placement, alpha edge/policy diagnostics, bounds and no-overwrite failures |
| Fonts | `font-subset.py`, explicit runtime font/cmap loading | Actual WOFF produced, CJK browser checks, missing/oversized input rejection |
| Code sound synthesis, optional grid alignment and full scores | `audio.cjs`, existing `film score`, audio checks | Seed repeatability, tone/FM/pluck/metal/noise, center/end pan, PCM24 output measured with FFmpeg/ffprobe |
| Long-scroll world/subject continuity | `scroll.js` and `scroll.md` | Real browser checks for seam clipping, foreground occlusion, pauses, reverse travel and reordered frames |
| Reference breakdown and audiovisual analysis | `reference.cjs` reuses existing analyzer and music analysis | Real sounding/silent video fixtures, source-bound frames/maps, audio excerpt/spectrum and separate grid candidates |
| Exact-frame and transparent rendering | `render.cjs` | PNG stills, H.264 MP4, ProRes 4444 alpha MOV, exact frames/fps and cold/reordered identity |
| 12 production methods: reference, mechanisms, first-frame/four routes, materials, music, optional speech, practice, style authoring, grammars, character, long-scroll, feedback | `methods.md` plus progressive source links | Full source-method audit and maintained route table; no mandatory narrator, actor, canvas or motion quota |

Pinned source: `26dba25b2b495c2138848c29a2c90df356a20325`, 324 preserved files,
19,491,852 source bytes. Manifest tree hash:
`769fb6365940c69b2ad6aeb2503c8427e7bb17338e6bf7f21abe80f9a10184b0`.
All original code/method paths and licenses are preserved. Author portrait/frame packs and
showcase media are excluded as demo-only assets; techniques work with project-owned assets.

## Review and fixes

- Corrected caller-sized scene fitting, forward namespace references and per-instance caches.
- Shared only explicit glyph coverage with the private authored-coordinate scene runtime.
- Fixed export DOM named-property collision and explicit image-key/path handling.
- Fixed center-pan output; added channel-balance and endpoint checks.
- Bounded raster, font and text inputs; preserved outputs on validation/overwrite failures;
  cleaned up owned partial asset/font writes.
- Tightened clip safe-area/timing/font validation and exact-frame export.
- Refined the candidate cut-grid fit so perfectly regular cuts retain their actual cadence.

The lead inspected the four 35-scene sheets and the rendered chart, and reviewed independent
tool findings. Scenes preserve their authored composition and limitations; the Kusama sheet's
dot takeover is its source-authored ending. Contact sheets do not establish temporal acting or
artistic quality. Sound measurements do not establish musical taste or replace listening.

Local evidence stays ignored under `.design-pipeline/huashu-complete/`: `visual-review/`,
`browser-proof/`, `proof/assets-audio/` and `proof/render-review/`.

## Final checks and installation

- `uv run --with fonttools --python 3.14 node --test` with the four explicitly named Huashu
  test files: **19 passed, 0 failed, 0 skipped**. Counts represent scenarios, not feature totals.
- `uv run --with fonttools --python 3.14 node scripts/qa.cjs`: **942 repository tests passed,
  0 failed, 0 skipped** across 109 files. Reproducible tgz/zip, all package resources, isolated
  install/replacement and 12 installed public-CLI smoke tests passed. QA preserved repository
  status byte for byte.
- `npm run test:browser`: both browser automation self-tests passed.
- `npm run specs:check`: **43 passed, 0 failed** under strict OpenSpec validation.
- Local tool-guide link checks and owned tracked diff whitespace checks passed.
- Staged installation ran from a separate project directory: the installed generator,
  `composition scaffold --template art-motion`, 4-frame video rendering and the reference
  analysis sidecar succeeded; all 701 required resources existed.

Canonical skill: `C:/Users/Administrator/.codex/skills/design-pipeline`. Scoped synchronization
installed 2,606 files: 347 added/changed files, 17 obsolete stripped-source paths removed,
and 2,259 unrelated files preserved byte for byte. Backup:
`C:/Users/Administrator/.codex/backups/design-pipeline-before-complete-huashu-20261007-QvArZI/design-pipeline`.
The complete staged tree and installed hashes matched. Installation records and smoke evidence
are in ignored `staged-install.json`, `installation.json`, `staged-check.log`, and
`canonical-check.log` under the evidence directory above.

The shared tree contains concurrent video-handoff work. Its current repository tests also pass,
but those runtime changes were not copied into the canonical installation by this change.
No commit, push, publication or Sites deployment was performed.

## Font-source follow-up

Date: 2026-10-07. Documentation-only extension of the existing font route; no runtime changes
or additional font binaries. FontLab is a discovery source, with primary foundry/project
sources used for acquisition and license identity. Actual-copy comparison and project typography
choices connect to existing preview, subset and rendering tools. Bundled `PuHui-*` aliases are
documented as Noto Sans SC demo subsets, matching upstream font licenses and mappings.

- Checked FontLab, official Fontshare, Google Fonts/Google Sans Flex, MiSans, Adobe Source Han
  and LXGW sources. Free use and open source are distinguished per selected release.
- Five changed tool/reference guides have no broken local link targets.
- Six existing direction-preview tests passed, with no failures or skips. The full 942-test
  run above predates this guide-only follow-up; it was not rerun for these documentation edits.
- Strict OpenSpec validation passed for this change.
- Actual package creation passed; the tgz contains `design-pipeline/tools/fonts.md` and the
  new guide is registered among the 702 required resources.
- Scoped canonical installation synchronized six files; installed bytes match the repository,
  all 702 required resources exist, and 2,601 unrelated installed files remain unchanged.

Evidence: ignored `.design-pipeline/font-sources-20261007/`, including `focused.log`,
`package.log`, package artifacts and `installed.json`. Recoverable installation backup:
`C:/Users/Administrator/.codex/backups/design-pipeline-font-sources-20261007-ZDUOb3`.
These checks establish guide/package conformance, not aesthetic acceptance of a selected font.

## Design-directory follow-up

Date: 2026-10-07. Added a progressive source guide and links from the tools index, font guide
and existing direction preview. No runtime changes or external tools/assets installed.

- Inspected the supplied [directory](https://www.ignoredone.space/index.php/designwebsite/)
  in a browser: category buttons, rendered cards and selected destination URLs.
- Read primary Space Type Generator and Annual Report Archive pages. PVDex initially showed
  a loading shell; the browser subsequently showed its filters and video catalogue. No playback
  or claim about the artistic quality of those videos was needed or made. The light-reference
  destination was inaccessible to the web reader; other catalogue examples are discovery entries,
  not claims that each external tool was tested.
- Four changed guides have no missing local link targets; all 703 required resources exist.
- Existing direction-preview tests: six passed, zero failures/skips. Strict validation of this
  OpenSpec change passed. No full runtime-suite rerun for this guide-only addition.
- Packaging produced tgz/zip successfully. Extracted archive bytes for all five affected skill
  files match the repository. Scoped installation matches those bytes and preserves 2,603
  unrelated installed files; all 703 required resources remain available.

Evidence: ignored `.design-pipeline/design-sources-20261007/`, including source-file baselines,
test/package logs and `installed.json`. Installation backup:
`C:/Users/Administrator/.codex/backups/design-pipeline-design-sources-20261007-qaVJqb`.
Source discovery is available; these checks do not establish improved model aesthetics or visual acceptance.

## Active discovery during production and review

Date: 2026-10-07. The front door, tools index, source guide, capability route and Stage 5 now
link `tools/open-source-design.md` when the task exposes a missing method. Source inspection,
a bounded rendered study, integration and reusable internalization use existing contracts.
No new search service, runtime dependency, adapter, gate or test framework was added.

- Verified candidate descriptions against primary perfect-freehand, troika-three-text,
  postprocessing and elkjs repositories/docs. They remain open-ended research examples, not
  bundled or admitted implementations. No candidate code was imported or executed for this change.
- Two independent `gpt-6-luna` agents, medium reasoning, each answered the same four instruction
  scenarios once: missing text-rendering capability, covered CSS work, weak composition and an
  unverified dependency. The updated answer named an upstream query/source/API check and the
  integrate/rerender step. Both baseline and update already preserved the existing runtime,
  reused CSS, avoided hiding composition problems under filters, and withheld unverified code.
  This is a bounded plan-level check with one example matching the guide; generalization and
  aesthetic improvement remain unmeasured. Token usage was unavailable.
- Six changed guides have reachable local links. All 704 required package resources exist.
- Ten existing source-governance/direction-preview tests and three skill CLI handoff tests pass,
  with zero failures/skips. Strict OpenSpec validation passes. No full runtime-suite rerun for
  this instruction-only change.
- Actual tgz/zip packaging passes. All seven affected archived files match repository bytes.
  Scoped canonical installation updates those routes and verifies all required resources;
  2,602 unrelated files remain byte-identical. `references/stages.md` receives only the new
  Stage 5 paragraph, preserving its other installed content and excluding concurrent uninstalled
  video-handoff changes. The other six installed files match the repository.

Evidence: ignored `.design-pipeline/design-tool-discovery-20261007/`, including baseline files,
`scenarios.json`, original instruction responses in `instruction-eval.json`, check/package logs,
`stage-addition.txt` and `installed.json`. Recoverable backup:
`C:/Users/Administrator/.codex/backups/design-pipeline-design-tool-discovery-20261007-dCHZoC`.
Technical conformance does not supply visual acceptance of any downstream design.

## GitHub delivery integration

Date: 2026-10-07. The user authorized pushing the current version and recording the remaining
six capability/evidence gaps as GitHub issues. Repository commit `3661ade` integrates the
current work with the existing upstream enamel-badge example without changing its acceptance.

- A clean `npm ci` succeeded. Repository QA ran under Python 3.14 with fonttools 4.66.1:
  942 tests across 109 registered files passed, with zero failures/skips. Reproducible packaging,
  12 installed-package CLI tests and byte-identical repository status checks passed.
- Both browser workspace self-tests passed. Strict OpenSpec validation passed all 44 items;
  historical archive-precondition notices remain informational and were not treated as archives.
- These are the two commands behind `npm test`, run separately because this Windows npm is a
  PowerShell script that `uv run` cannot launch directly. Dependency inspection returned `OK`.
- CI and release jobs now explicitly prepare isolated fonttools 4.66.1 environments and pass
  `HUASHU_PYTHON` to the existing font regression, instead of relying on an undeclared runner
  installation. This follow-up changes environment preparation only; remote results belong to
  the resulting PR checks, not this local QA record.

Local logs are under ignored `.design-pipeline/github-delivery-20261007/`. Installation smoke
checks use an isolated temporary skill; they do not synchronize the canonical installation or
re-evaluate historical model runs. Technical conformance does not establish visual acceptance.
