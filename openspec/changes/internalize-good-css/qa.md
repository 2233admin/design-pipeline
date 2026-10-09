# good-css internalization verification

Date: 2026-10-08. Scope: complete reviewed upstream internalization into the packaged skill.
Source revision: `6d16d2fd27f4892e2aea4b5c5c2b016f45be7eef`.
Source Git tree: `a14bae52fb7bd2374faefaf6c62f575aeff8dad5`.
Canonical SHA-256: `fe50d90bf5b9bcbd30d9696886f8f1c67fb3d3cfadc4a4a564f321adc7929a08`.

## Coverage and review

- 133/133 tracked files and 881,927 original bytes preserved using Git blobs, not checkout newline conversion.
- 47/47 practices and specimens, 8/8 generated category references, 37/37 public assets preserved.
- All original rule blocks, support lines and CSS fences match their generated references.
- All 50 original practice CSS fences pass the inspected upstream dependency-free checker.
- MIT attribution, original entry credits, Inter and Geist Mono SIL OFL 1.1 licenses preserved.
- 47 exact guide titles/slugs/source anchors/fixture links checked; each has project use and a verification condition.
- 118 local guide/tool-README links and heading anchors resolve.
- Existing entry/stage/web/interface/tool/QA routes expose the guide; all 137 new load-bearing
  resources are registered in the existing package manifest. New source/test uses the existing manifests.
- Independent read-only review of source identities, importer, builder, tests, routes, registry and
  license handling found no actionable defects. No new npm dependency, gate, receipt or target resolver.

## Performed checks

| Command or observation | Exit/result | Scope |
| --- | --- | --- |
| `npm ci` | 0 | Private maintenance workspace installed; existing esbuild install script remained blocked by npm policy. No upstream dependency installation. |
| `node --test tests/good-css.test.cjs` | 0; 5/5 | Locked complete tree/blob/license/resource integrity, all practice rules/CSS parity, source rejection, guide reachability and builder/output protection. |
| `npm run sources:check` | 0; 39/39 | Existing locked source checks plus good-css. Does not refresh upstream baselines. |
| `npm run sources:check` after registry-order repair | 0; 39/39 | Rechecked the final source/guide/registry integration. |
| `node --test --test-name-pattern 'invalid regex' tests/check-deps.test.cjs` | 0; 1/1 | Existing invalid-regex diagnostic remains bound to the original first profile after appending the new built-in profile. |
| `npm run specs:check` at initial integration close-out | 0; 53/53 | Original working tree's strict OpenSpec validation, including unrelated local changes. Existing archive-advisory messages remain. |
| `git diff --check` | 0 | No whitespace errors in the observed working diff. |
| `node skill/tools/good-css/build-study.cjs --output .design-pipeline/good-css-study` | 0; 47 specimens / 8 categories | Fresh offline study built from packaged original source, with index and auxiliary local destinations. |
| Local-link inspection | 251/251 resolve | All generated local links, image/font URLs and destination references exist. No site-root URLs remain. |
| `node .design-pipeline/good-css-browser-smoke.cjs` | 0 | Actual Chrome `152.0.7977.30` browser behavior; details below. |
| `node scripts/package.cjs --output-root .design-pipeline/good-css-package` | 0 | TGZ/ZIP/checksums produced with `PACKAGE_VERSION=0.7.0-qa`, `SOURCE_DATE_EPOCH=1784764800`. Full repository QA separately checks reproducibility and archive contents. |
| Isolated `scripts/install-local.cjs --source skill --root <local-isolated-skills> --target <contained-target>` | 0 | Full copied skill passes staged doctor. Only task-owned ignored installation was created. |
| Installed `designer-pipeline.cjs doctor --root <isolated-project> --json` | 0; ready | Child HOME/USERPROFILE/CODEX_HOME point at isolated empty directories; invalid HTTP proxies; no ambient companion requirement. |
| Installed `tools/good-css/build-study.cjs --output <isolated-project>/study` | 0; 47 / 8 | Relocated builder resolves its installed source and works offline with only Node. |

## Initial full QA result (superseded by the repair below)

The initial `npm test` completed with exit 1. Its 110-file repository test run reported 1,036 tests:
1,001 passed and 35 failed. Good CSS's five tests passed in that run. One failure was caused by
this change inserting the capability profile before the existing Anime.js profile: the existing
invalid-regex test selects `profiles[0]` and asserts the Anime.js diagnostic. The new profile now
appends to the registry, preserving existing order; its exact regression and all 39 source checks
passed after the repair. The full repository suite was not rerun after that repair.

The other 34 observed failures comprise six component-eval, two execution-target Git, one
interaction-capture and 25 workflow-next tests. Their runtime and test files were already modified
outside this change. Representative native failures report Git baseline/scope containment errors
with Windows `ADMINI~1` / `Administrator` root aliases; component-eval failures include undefined
assertion messages under the observed Node runtime, masking the underlying state mismatch; their
complete root causes remain unestablished. The pointer-capture case exceeds its smoothness
threshold during browser sampling. Read-only tracing found no Good CSS dependency in these failing
paths. This establishes their separation from the new importer/studies, not a passing baseline:
the failures were unresolved at this integration close-out and are not claimed to have failed before this task.

Concrete attribution evidence: the existing `.design-pipeline/status-before.txt` snapshot lists
`workflow-core.cjs`, `workflow-next.test.cjs`, `cli-core.cjs` and component-eval files as modified
before this integration; `close-native-task-verification-loop/design.md` assigns those native paths
to its separate change. The Git snapshot assertion in the full log compares the long and short
Windows root spellings. A read-only `fs.realpathSync` probe preserves both spellings, so
`path.relative(longRoot, shortRoot/fixture/outline.html)` appears to escape the root and triggers
the existing workflow scope guard. No runtime adjustment was made by this Good CSS change.

The same full QA run passed fixed-epoch TGZ/ZIP/checksum reproducibility, required archive contents,
invalid-input artifact preservation, isolated packaged installation/replacement/doctor and source
verification, plus all 12 installed-package public CLI smoke tests. The repository-status byte
comparison failed because the shared working tree changed during the run, including the profile
repair above and unrelated concurrent edits. These passing checks do not make full repository QA
green. Complete output is retained in ignored `.design-pipeline/good-css-npm-test.log`; repair/source
rechecks are in `.design-pipeline/good-css-registry-recheck.log` and `good-css-sources-recheck.log`.

## Observed browser evidence

Evidence: ignored `.design-pipeline/good-css-browser-evidence/report.json` and screenshots
`index.png`, `intrinsic-grid-360.png`, `intrinsic-grid-1280.png`, `keyboard-focus.png`.

- Every original specimen returns HTTP 200, contains the practice CSS and has zero JavaScript errors.
- Zero remote network requests across all specimens.
- Intrinsic grid: 360px gives one column, 1280px gives four columns; neither overflows horizontally.
- Keyboard Tab gives the link a visible solid 2px outline; screenshot inspected.
- Opt-in motion: `no-preference` yields `0.3s`; `reduce` yields `0s`.
- Enter opens the second native details element and leaves only one disclosure open.
- Native popover opens and Escape closes it.
- Real HTTP navigation moves page A to B with a different `performance.timeOrigin`; the fixture
  reports an arriving view transition. Explicit file URL navigation also reaches page B.
- Observed browser supports text-box trim, field sizing, interpolate-size, anchor positioning,
  scroll timelines, `pow()` and declarative dialog commands. These results apply to this browser only.

## Acceptance and limits

Component Conformance: not assessed for a downstream product; this change delivers source/guidance
and tools, with scoped specimen behavior verified above.

Visual Acceptance: not requested or granted; integrity, generated studies and browser smoke do not
grant appearance/motion acceptance. Layout and focus screenshots were inspected as technical evidence.

Safari/Firefox, unsupported-feature emulation, assistive technology, real notched devices,
trackpad bounce and downstream RTL/CJK/zoom content remain project-specific verification. The guide
specifies those checks without claiming the specimens establish them. Normal browser timers/rAF
and transitions are not deterministic film playback. The known invalid upload data image and slow
one-second motion-token comparison remain deliberate upstream diagnostics.

## Tracking and workspace

Multica project lookup returned a temporary server error; authorized implementation continued under
the canonical host policy. Scope, progress and verification are retained here for later reconciliation.
Code-Intel failed with bootstrap/oversized-file and changing-input diagnostics; bounded local reads
were used after that single recorded failure. Neither tool failure grants missing evidence a pass.
At initial integration close-out, existing unrelated worktree changes were preserved; additional unrelated documentation edits appeared
concurrently during QA. No Git commit, push, remote issue/PR publication, upstream deployment or
global agent skill installation was performed.

## Authorized full QA repair and GitHub publication

The user's follow-up authorized repairing all 34 remaining failures before pushing to GitHub.
The companion change `fix-windows-qa-paths-and-sampling` repairs shared physical Windows path
identity, native workflow coordinates and delayed pointer input delivery, retaining containment,
real measurements and the original failure checks. It also fixes this builder's source/output
alias boundary with a rejection regression against a temporary source copy.

An isolated publication tree on `codex/good-css-qa`, based on already-published
`d45370d60703b8a08beab8fc7d7d7edd56ced727`, excludes unrelated local work. Its final `npm test`
exits 0: 1,036/1,036 repository tests in 110 files, 12/12 installed CLI tests and both browser
self-tests pass, with 0 failures and 0 skipped tests. Package reproducibility, required archive
contents, install/doctor and byte-identical repository status checks pass. Final source checks
are 39/39; strict specifications are 51/51 on this selected tree. Complete source/blob/license
and resource scope was independently re-audited without actionable findings.

Only reports, completion markers, the changelog and a whitespace-check attribute for the original
Geist Mono license changed after that frozen-code full run. That attribute preserves the reviewed
license bytes, including its original trailing space; all 133 staged vendor blobs must still match.
See the companion change's `qa.md` for red/green diagnosis and the full log's SHA-256.
Implementation commit [`853249ba5121ae1243fe53c772bf15dd30df9bf6`](https://github.com/2233admin/design-pipeline/commit/853249ba5121ae1243fe53c772bf15dd30df9bf6),
Git tree `883a0ad81427852ede4db9aeec774025a112b111`, was pushed successfully to
[codex/good-css-qa](https://github.com/2233admin/design-pipeline/tree/codex/good-css-qa).
An independent `git ls-remote` read confirms the exact implementation commit. All 133 staged
upstream blobs and Git modes match their manifest. This final close-out changes only QA reports
and the repair checklist; unrelated original-tree edits remain preserved. Results above describe
local full QA; no remote CI run is claimed for the feature branch push.
