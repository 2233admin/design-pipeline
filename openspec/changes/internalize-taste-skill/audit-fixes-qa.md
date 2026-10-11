# Audit fixes and delivery verification

Naming note (2026-10-11): the reference project's name was replaced with neutral wording by
internalize-art-motion-naming; paths describe the layout at the time.

Date: 2026-10-08. This follow-up addresses the Skill Creator and reviewed Art Motion
reference media audits through `internalize-taste-skill` and
`complete-art-motion-internalization`.
The user authorized canonical installation synchronization, pushing the existing
branch and updating PR #85; merging, release creation and deployment are outside
this delivery. The original working checkout's unrelated changes were preserved.

## Revision and scope

Full local QA covers implementation commit
`704183be9d74e32b7ce267ee12c19dbf2b7f6144`, Git tree
`52c1bd428c3b11036ba14ed0ebb835f79427c1c2`. Before freezing that tree, the target
was fetched and both histories and the three-dot PR diff reviewed. Target `main`
at `7205ee80f1328ce85550bc3fd18a1f8d3f91f799` was already an ancestor.
Implementation bytes remained frozen during full QA; this record and task
checkboxes are a later documentation-only change. The full local result is not
relabelled as a test of that later Git tree. Final-commit CI is recorded in PR #85.

- Six existing React/Next engineering companions are selected by current framework
  and actual capability need, with the existing bounded fallback.
- Three cases in the existing eval suite execute observable CSS, quick Chinese UI
  and missing-reference behavior. Wrong state, absent signal and absent artifact
  controls are rejected. Frozen outputs stay outside the published skill; other
  manifest cases retain routing/manifest coverage only.
- The Art Motion reference is pinned to reviewed `57d67608ab458f57d9b153b1a2831b921e22498b`.
  All 343 retained source files match that revision's committed Git bytes. The
  importer retains 19 additional media dependencies and related source materials;
  `.gitattributes` protects those raw bytes. Runtime algorithms did not change;
  runtime/render provenance uses the reviewed source constant.
- The maintained offline audio entry reuses the existing path boundary, closes
  descriptors before FFmpeg, stages beside the output, cleans up on failure and
  refuses existing outputs/sidecars and concurrent output publication. No cloud
  provider or upstream plan/receipt control plane is promoted to pipeline evidence.
- The new test is registered in the existing 113-file test manifest; the package
  resource list has 927 required entries. No dependency, parallel gate, receipt
  schema, target resolver or policy digest was added.

See [behavior coverage](skill-behavior-review.md),
[source/render verification](../complete-art-motion-internalization/verification.md) and
[offline audio verification](../complete-art-motion-internalization/koubo-verification.md).

## Local verification

The maintenance workspace used Node.js 22.23.2. `npm ci` succeeded. Full QA used
an isolated Python environment with fonttools 4.66.1 and the existing browser,
FFmpeg/ffprobe and Blender discovery. Machine-specific runtime paths were kept
in ignored local evidence, not added to source or configuration.

| Check | Actual result |
| --- | --- |
| Official Skill Creator `quick_validate.py skill` | Valid; structural validation only |
| Focused existing skill eval suite | 9 passed, 0 skipped; browser cases executed |
| Maintained offline audio regressions | 6 passed, 0 skipped; actual FFmpeg |
| Existing Art Motion source/browser/render suites | 19 passed, 0 skipped |
| Visual Craft and CLI suites | 18 passed, 0 skipped |
| Imported upstream local/mock contracts | 61 passed; no real provider calls |
| `npm run sources:check` | 45 passed, 0 skipped |
| `npm run specs:check` | 55 passed, 0 failed; archive notices informational |
| Frozen-tree `npm test` | 1064 passed, 0 failed, 0 skipped |
| Installed-package public CLI checks within QA | 12 passed, 0 skipped |
| Browser workspace self-tests within QA | Both passed |
| Packaging/install lifecycle within QA | Reproducible TGZ/ZIP/checksums, isolated installation, replacement refusal/explicit replacement and doctor passed |
| Repository preservation within QA | Git status byte-identical |
| Independent read-only review of implementation delta | No concrete owner-level findings; 15 focused tests, tool tests, resources, specs and diff check passed |

The later documentation-only follow-up also passed `npm run specs:check` (55/55)
and `git diff --check`; these focused checks do not replace the frozen-tree full QA.

Actual C:/F: cross-volume audio probes ran in both directions. All temporary
allocations stayed beside the output; the result was 1.869375 seconds at -35 dBFS,
source bytes unchanged and no temporary residue. The pinned raw source reproduced
WinError 32 and leaked descriptors. Offline probes also confirmed the raw static
sidecar overwrite and changed-prompt/original-receipt acceptance candidates.
Those source-only interfaces remain excluded from maintained pipeline evidence.

## Independent forward behavior

Fresh agents received the current skill, raw tasks and isolated output directories,
without earlier review conclusions or frozen answer fixtures. Root read their
reports and structured evidence and inspected the resulting screenshots.

- CSS-only request: 11 scoped Chromium 153.0.8010.12 cases passed, preserving
  palette/layout while observing keyboard focus, native activation, actual color
  transition playback, reduced motion, forced colors and narrow layout. The text
  checker returned exit 1 solely for two palette-syntax diagnostics on the
  user-preserved `#2266cc`; that checker is not reported as passed.
- Chinese quick profile page: one self-contained HTML file, 17 actual Chromium
  interaction/layout checks passed, including required/email validation, keyboard
  save/switch operation, persistence, five widths, text enlargement, RTL, forced
  colors and storage failure recovery. CSS checker passed. The generated page's
  focal-point finding was fixed and rerun; deliberate whitespace was recorded
  through the existing allow mechanism. Actual workflow was `done / ui / quick`,
  with `visualAcceptance: not-evaluated`. HTML SHA-256:
  `eda12c322d7b1cc9ac1bdd1eaa087d08fb93fd05326c6dc357031e428ef37c95`.
- Missing screenshot request: the agent requested the actual screenshot/path and
  retained the actual `ask / intake` state. It generated no reference, graybox or
  substitute page and ran no reference gate. This differs from the deterministic
  missing-reference case, which exercises a real failing gate after intake; neither
  result is substituted for the other.

These are bounded forward results, not proof of all future agent behavior. Formal
aggregate Component Conformance receipts were not issued by these forward tasks.
Scoped technical checks do not establish owner Visual Acceptance, which was not
provided. Firefox/Safari, physical device behavior, screen-reader announcements and
native browser page zoom were not verified in the forward tests.

The raw quick prompt retains `无框架、后端和动画`: the existing advisory keyword
route still matches the negated motion word, separately from the actual ui/quick
workflow. The missing-reference standard intake also returns generic film-shaped
duration/asset suggestions; the agent did not adopt them as UI facts or authorize
generated reference material. Neither resolver/intake limitation was expanded
into this audit fix.

## Canonical installation

Both local same-name installations were inventoried and fully backed up outside
skill discovery before replacement. Comparison against the old canonical entry's
historical source identified local differences and an additional asset; the backup
preserves all of them. A fresh pre-replacement inventory confirmed neither install
had changed since backup. The existing `install-local.cjs` replaced only the
canonical `.codex` target after full QA passed.

- All 2831 installed files match the tested source SHA-256s.
- Installed doctor resolved the canonical package root: ready, no missing resources,
  Node.js 22.23.2. An installed art-motion scaffold ran from an independent directory.
- Installed offline audio also ran from that directory: 1.869375 seconds, -35 dBFS,
  `pcm_s16le`, 24 kHz mono; supplied input hash remained unchanged.
- The ten-file `.agents` compatibility installation is byte-identical to its original
  backup. Its same-name presence and automatic fresh-session discovery remain
  unverified; explicit installed paths/content were checked. The forward agents used
  the designated repository skill path, not automatic installation discovery.

## Evidence and tracking limits

Detailed local evidence remains ignored: `.design-pipeline/audit-fixes-qa/` (full
QA, source/spec logs, review and isolated forward tests),
`.design-pipeline/skill-behavior-review/`, `.design-pipeline/koubo-review/`,
`.design-pipeline/art-motion-update-review/` and `.design-pipeline/install-review/`
(both recoverable backups, before/after inventories and installed smoke output).
No private captures, credentials or machine-specific configuration were published.

Multica project discovery returned service-unavailable/server errors on two
attempts. Per host policy, authorized work continued with scope/progress/evidence
in this record and PR #85, for backfill when the tracker recovers. No replacement
GitHub execution ticket was created.

Cloud synthesis, voice training, provider availability, upstream media control
planes and speech/creative quality were not tested. They remain source reference
or require the caller's real inputs and separate owner acceptance.
