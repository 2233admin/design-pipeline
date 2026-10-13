# Frontend toolchain and runtime discovery

Naming note (2026-10-11): the reference project's name was replaced with neutral wording by
internalize-art-motion-naming; paths describe the layout at the time.

## Scope and authorization

The user asked to find the already installed Blender, refresh the frontend/animation capabilities,
and fix the lack of a unified npm maintenance entry. This change covers those requests. It does not
authorize publishing, changing accepted render baselines, or upgrading unrelated applications.

## Status

Initial implementation and the user's follow-up latest-stable request are technically verified,
2026-10-07. The change remains unarchived.
The later reference-skill follow-up is verified and installed within its ten-file skill scope.
Whole-workspace QA is currently non-green during the concurrent video-production-handoff change;
see the final section for the exact failed checks. Earlier pass counts below describe their
recorded runs, not a claim that the subsequently changing workspace still passes.
Local evidence is under ignored `.design-pipeline/frontend-refresh/`; the existing dirty working
tree and staged changes are preserved. No commit or remote publication was made.

## Findings

- Blender 4.2.0 is installed in a portable Blender Launcher library. The prior resolver checked
  explicit paths and platform defaults but not PATH. A failed lookup does not prove absence.
- Runtime packages previously had separate manifests in `evals/cases` and
  `tools/browser-automation`, without a root npm workspace, lockfile or maintenance commands.
- Runtime APIs, capability guidance and attributed source snapshots require different checks;
  one maintenance entry should expose those checks without conflating their provenance.

## Documents

- `proposal.md`: the requested outcomes and scope.
- `design.md`: compatibility and verification boundaries.
- `specs/design-pipeline/spec.md`: behaviors and failure cases.
- `tasks.md`: execution and verification state.

## Verification and remaining limits

| Surface | Result |
| --- | --- |
| Root npm entry | Private workspace and one root lockfile, using the official npm registry. `npm ci` installs both workspaces and the pinned OpenSpec CLI. The former browser-workspace lockfile is removed. |
| Owned toolchain | GSAP 3.15.0, HyperFrames 0.8.137, Playwright 1.63.0, OpenSpec 1.14.1; maintenance requires Node 22.12+ because of Puppeteer. The standalone skill retains its Node 22 minimum. |
| Clean install | Fresh isolated workspace: `npm ci` passes; package resolution, local OpenSpec CLI, GSAP, esbuild and sharp runtime probes pass without global package resolution. |
| Blender | Existing 4.2.0 starts and renders two 12-frame EEVEE sequences. Decoded comparison frames are identical; encoding and timeline conversion pass. Detection failures no longer become missing-tool skips. The template accepts the 4.2 EEVEE engine identifier. |
| GSAP | 11 focused animation tests pass, including a real browser cold start, held keys, draw-on timing and reverse seek. |
| HyperFrames | Version 0.8.137 passes browser-enabled `check`, renders a 2.4-second 640x360 MP4 at 24 fps, and supplies 386 catalog records accepted by the existing bridge. Start/mid/end frames inspected. |
| Browser adapter | Playwright 1.63.0 with Chromium 153.0.8010.12 captures and compares a local canvas/text fixture at 960x600 and 390x844; identical inputs give zero pixel/layout difference, SSIM 1, and full text/interaction coverage. |
| MengTo snapshot | Revision `83a47fee32f0b6349bff1fede99257a5ef03dc93`: 1,313 files, 136,325,371 bytes, 176 playbooks. MIT license unchanged; tracked Git blobs, manifest hashes and tree ID verify. 49 playbooks added, none removed. Publishing/session-management playbooks remain explicit-only. |
| `npm test` | Exit 0: 915 passed, 0 failed, 0 skipped across 105 repository test files; installed-package public CLI tests 12/12 and both browser-tool self-tests pass. These are test cases, not a count of user-facing features. |
| Packaging | Reproducible TGZ/ZIP/checksums, isolated install/replace, package resources and installed catalogs pass. QA leaves repository status byte-identical. Maintenance dependencies stay outside the shipped skill. |
| `npm run specs:check` | 41 items pass strict validation. No changes are automatically archived. |
| Canonical skill | Recoverable backup made outside skill discovery roots; all 2,291 installed files match `skill/` byte-for-byte and the installed doctor reports ready. |

Primary baselines: [HyperFrames release source](https://github.com/heygen-com/hyperframes/tree/d09e003b17610177b71e340ec0bac95c9dde3e64),
[GSAP tween API](https://gsap.com/docs/v3/GSAP/Tween/vars/),
[Playwright 1.63.0](https://github.com/microsoft/playwright/releases/tag/v1.63.0), and
[MengTo source](https://github.com/MengTo/skills/tree/83a47fee32f0b6349bff1fede99257a5ef03dc93).
HyperFrames guidance now allows asynchronous timeline construction, but registration must happen
only after construction finishes; seeking stays deterministic. GSAP guidance covers `easeReverse`
and the deprecated `yoyoEase`. Unchanged iArt core animation sources and Anime.js 4.5.0 were retained.

Dependency decisions:

- The initial pass kept pixelmatch at 7.2.0 because [8.0.0 changes the comparison metric](https://github.com/mapbox/pixelmatch/releases/tag/v8.0.0)
  to OKLab/HyAB. The subsequent latest-stable request authorizes its migration: 8.0.0 is now pinned,
  and the existing comparison v1 report includes actual version, metric and options. Prior numeric
  thresholds require calibration before comparisons across metrics. Approved golden HTML/video
  and earlier comparison reports are preserved.
- Official-registry `npm audit` reports four high entries along one OpenSpec development dependency
  chain: OpenSpec -> fast-glob -> micromatch -> braces 3.0.3. The underlying
  [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patched version at review
  time. No forced downgrade to OpenSpec 0.17.2 or fabricated override was applied. This chain is
  maintenance tooling, not shipped skill runtime. The audit is not claimed clean.

`capabilities:check` successfully runs the existing audit, with 13 `UNKNOWN` profiles when no fresh
source-evidence file is supplied; that is not a claim that every external capability is current.
The machine's custom Blender path lives only in ignored `.env.local`; external environment values
take precedence. Its location is not embedded in shipped source and no global PATH edit is needed.

Evidence: `full-qa.log`, `clean-npm-ci.log`, `clean-runtime.log`, `openspec-validation.log`,
`npm-audit-official.json`, `mengto-audit.json`, `canonical-verification.json`, `skill-backup.json`,
and the `runtime-proof/`, `browser-proof/`, `blender-runs/` subdirectories under the local evidence
root. The render samples establish runtime behavior; they are not creative or owner acceptance.

## Follow-up: latest stable animation dependencies

The user's subsequent request covers all six animation/graphics runtimes discussed in the session.
Official npm stable tags were checked on 2026-10-07 and cross-checked against release sources:

| Runtime | Verified stable version | Integration and verification |
| --- | --- | --- |
| GSAP | 3.15.0 | Already current in the workspace; existing real-browser seek/draw-on proof remains valid. Reverse-easing guidance clarified. |
| Anime.js | 4.5.0 | Current optional runtime; official Three adapter import and seeded stagger guidance refreshed. Chrome verifies DOM and Three Vector3 start/mid/end/backward seek and revert cleanup. |
| Three.js | 0.186.1 | Optional adapter provenance and r186 migration guidance updated. Real WebGL draw, two visible poses, resize and disposal verified. |
| PixiJS | 8.22.0 | Optional adapter runtime version recorded separately from its companion-skill revision. WebGL draw, two positions, resize and disposal verified. |
| Phaser | 4.2.1 | Already current; provenance and 3-to-4 migration guidance refreshed. WebGL scene, two positions, resize and destruction verified. |
| HyperFrames | 0.8.137 | Already current; earlier browser-enabled check, 2.4-second video and catalog-bridge proof reused. |

Version/revision evidence: [Anime.js 4.5.0](https://github.com/juliangarnier/anime/releases/tag/v4.5.0),
[Three.js r186 migration](https://github.com/mrdoob/three.js/wiki/Migration-Guide#185--186),
[PixiJS 8.22.0](https://github.com/pixijs/pixijs/releases/tag/v8.22.0), and
[Phaser 4.2.1](https://github.com/phaserjs/phaser/releases/tag/v4.2.1).
Optional runtime packages were installed only in ignored verification projects, preserving target
project ownership and standalone skill installation. Raw vendor snapshots were not modified to
pretend their upstream manifests had adopted these versions. Adapter support/trust levels stay
unchanged. The host's older Anime.js companion remains external; the bundled guide supplies the
verified v4.5 behavior when its markers are missing.

Pixelmatch 8.0.0 is now installed in the maintained browser workspace and root lockfile. Real
comparisons at 960x600 and 390x844 report zero difference for identical input; a controlled color
change is detected at both sizes while layout/text/interaction metrics stay unchanged. Reports
retain `prewalk.pipeline.comparison.v1` and add `pixelComparison` with the actual version,
OKLab/HyAB metric, threshold 0.1, anti-alias inclusion and checkerboard option. The self-test uses
the actual library and checks known unchanged/changed pixels plus metadata/call-option agreement.
The earlier comparison report and all 58 golden case files retain their original hashes.

The final root dependency check exits 0 with no outdated direct workspace packages. Playwright
1.63.0, pngjs 7.0.0 and OpenSpec 1.14.1 remain current. A clean locked install and pixelmatch runtime
probe pass. Unified `npm test` again passes all 915 repository cases with 0 failed/0 skipped,
12 installed CLI cases, reproducible packages, and both browser-tool self-tests. Strict OpenSpec
validation passes. CI/release YAML now installs the root lockfile, prepares browser dependencies,
and invokes root spec/test/package scripts; YAML structure and command order were checked locally,
but no remote workflow or release was triggered.

The graphics probes use Chromium 153 with SwiftShader: they establish rendering/API/lifecycle
behavior, not hardware GPU performance or visual acceptance. The OpenSpec/braces advisory above
is unchanged (four dependency entries for one unpatched advisory); the audit is not claimed clean.
Canonical skill installation was backed up again and refreshed after verification.

Follow-up evidence is under ignored `.design-pipeline/latest-animation-upgrade/`: `npm-latest.json`,
`core-upstream.md`, `anime-proof/`, `graphics-proof/`, `browser-proof/`, `clean-npm-ci.log`,
`deps-after.log`, `full-qa.log`, `specs-all.log`, `npm-audit.json`, and canonical installation records.

## Follow-up: referenced skills and internalization

The user asked whether the previously referenced skills also needed adjustment/internalization.
This follows the existing scope to absorb reusable visual methods while retaining a small skill
entry, progressive disclosure and the project's runtime/workflow. No host companion was overwritten.

The audit found actual local coverage in the Art Motion reference's Canvas craft/diagnostic helpers, the MengTo and
Prism source routes, iart playbooks, and the animation/Impeccable guidance. The Art Motion reference's current upstream
revision matches the bundled `26dba25b2b495c2138848c29a2c90df356a20325`. Watercolor, impasto and other
indexed source methods remain reference material; they are not all callable, validated helpers.
No blanket source port or additional runtime dependency was needed.

The changes close narrower gaps:

- The tools index and animation routes now reach built-in GSAP/iart and Anime.js implementation
  guidance before optional external skills. Construction, clock units, deterministic seeking,
  scoped cleanup and reduced-motion handling are concrete. The official GSAP suite was inspected
  at `aed9cfd3277740755f6bfc1155c7aa645403b760`; project library selection remains authoritative.
- PixiJS's official skill suite was reviewed from `6aae70d...` to
  `83760c6f53462ca9cecd68055041f5a8c94758ce`. The guide incorporates renderer fallback semantics,
  particle-group alpha/tint, gradient coordinates, SVG import choices and conditional optimization
  prerequisites. All six existing companion markers match the retrieved source; source and adapter
  provenance are updated without changing trust level or installing the external suite.
- Broad UI motion audits now record prioritized findings, representative rejected candidates and
  bounded executor handoffs in existing artifacts. Layered/multiple-aspect shot work gains optional
  focus, depth and restacking guidance. These are methods, not fixed styles, camera counts or canvases.
- Shipped companion documentation no longer claims a workstation's Installed/Not installed state.
  `upstream-capability-sync.md` now describes source-diff review and adaptation as a distinct step
  from npm version checks, pinned-source integrity and optional remote publication.

Browser checks pass for the exact Anime.js guide snippet (cold midpoint, end, backward seek and
revert), GSAP repeated scoped setup/teardown plus dynamic reduced-motion changes, and PixiJS 8.22
WebGL gradient spaces and ancestor particle alpha. The lead inspected the PixiJS pixels. These
checks do not establish hardware performance, Canvas fallback, every SVG feature, every advanced
GPU optimization, or creative acceptance. Existing optional-companion diagnostics remain honest:
a local fallback does not relabel the host's stale Anime.js skill as current.

Evidence is under ignored `.design-pipeline/skill-internalization/`: source audits, the official
PixiJS compare, real-source marker checks, before/after capability audit, guide runtime probes and
task-scenario walkthroughs. Package/installation verification is recorded when complete below.

Follow-up verification, 2026-10-07:

- 39 relevant capability, source-governance, adapter, iart, Canvas craft and diagnostic tests pass
  with zero skips. The actual browser probes pass, and 31 local guide links resolve. Strict OpenSpec
  validation passes 42 items, including the concurrently added change.
- Supplying the retrieved PixiJS evidence reports `CHANGED` against the previous registry and
  `CURRENT` against the reviewed revision. The other 12 unobserved profiles stay `UNKNOWN` in this
  scoped source audit. All host companion install/marker statuses remain unchanged after syncing.
- The first full QA run has 913/915 passing tests and two component-workbench state-wait timeouts.
  All 12 workbench tests pass in isolation. The existing runner now limits file concurrency to
  four (or fewer available CPUs), retaining the eight-second waits and all assertions.
- During the next full run, the workspace gained `strengthen-video-production-handoff` code/tests.
  That run has 913/918 passing tests: four workbench cases fail on missing `references/3d-spec.md`
  input bindings; one reference-video case fails its high-fps candidate-sequence budget assertion.
  These are real failed assertions, not skips or successful acceptance. The new video-handoff
  implementation and tests were preserved for their ongoing work, not altered by this follow-up.
  Both full runs pass packaging/reproducibility and all 12 installed-package CLI checks.
- The canonical install uses the previously verified skill plus only this follow-up's ten owned
  skill files. Its doctor is ready; all 2,291 files match the prepared source, and the other 2,281
  installed files retain their previous bytes. This avoids installing in-progress video-handoff
  changes. The recoverable pre-update backup and original Git index remain intact.

Evidence: `scoped-checks.log`, `runtime-guide-check.json`, `pixi-proof/`, `route-check.json`,
`source-evidence.json`, `audit-before.json`, `audit-after.json`, `component-eval-focused.log`,
`full-qa.log`, `full-qa-final.log`, `specs-check-final.log`, `install-plan.json`,
`canonical-install.log` and `canonical-verification.json`. An interrupted intermediate launch is
retained separately in `full-qa-bounded.log`; it is not a verification result.
