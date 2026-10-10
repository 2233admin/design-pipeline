# QA Checklist

Create or update `qa.md` for every design-pipeline change with this structure.

## Run verification

Use this recipe before declaring completion. Resolve `designer-pipeline` from the loaded
`SKILL.md`; commands below use that public CLI and the actual project/change paths.

### Launch

The packaged CLI needs Node.js 22+ and runs per command; it has no server to keep alive.
For maintenance in this repository, use Node.js 22.12+ and `npm ci`; prepare missing browsers with
`npm run browser:install`. Start a target app using its own documented command, configuration,
data and authentication. Record the instance, owned PID/port and observed readiness; isolate it
from other runs before driving it.

### Doctor

Run `designer-pipeline doctor --root <project> --json`. It checks Node and packaged resources,
not the target app, browser, port or authentication; verify the actual target is reachable too.
For an initialized native change, run `designer-pipeline status --root <project>
--change-root <change> --json` and read state/event consistency. Diagnose the instance and the
observation method first when results look wrong; do not replace missing observations with a pass.

### Drive

State the condition, expected result and a check that can disprove it. Exercise the real entry
changed by this task; reuse its existing harness and stable selectors instead of internal setters.

| Changed surface | Existing public entry | Observable proof |
| --- | --- | --- |
| CLI/routing | Run the changed command; `route --query "design a settings page" --json` for a route smoke | Read the actual returned action/result and exit code; this does not exercise UI. |
| Native tasks | `next --change-root <change> --plan <tasks-plan>`; its returned `decide` command | Native complete runs every declared interaction binding on the exact local page and checks the preserved Git window before promotion. |
| Rendered frame | `composition capture --composition <html> --output <new-dir>`; `verify composition --image <dir>/screenshot.png --elements <dir>/elements.json --profile ui` | Inspect the generated image and full gate result; a frame does not prove interaction or playback. |
| Interaction/motion | `verify interaction --probe <interaction.json> --output <new-dir>` | Read recorded responses for the declared probes; also walk the affected real user journey. |
| Film/edit | `film check --project-root <project>` or `film-edit check --project-root <project>` | Read every applicable check and play the actual output, including audio. |

### Evidence

Record commands, inputs/actions, actual exit codes, observed results and untested operations in
`qa.md`. Keep logs/captures in a new project-contained directory under ignored `.design-pipeline/`;
keep native output/check snapshots at their plan paths. Inspect artifacts rather than their names.
For web captures, `evidence capture` writes artifacts and prints a CLI envelope; it does not write
a receipt file. The raw evidence receipt is its stdout envelope's `receipt.receipt` field.
`evidence check --receipt <raw-receipt.json> --evidence-root <capture-dir> --require-files --json`
checks files and hashes. The built-in Playwright adapter captures screenshot/DOM/console/trace,
but writes an empty network list and unknown accessibility/performance; its receipt is `partial`.
A partial receipt can validate with exit 0: neither that exit nor `captured` proves full behavior.
Native complete generates report/output artifact metadata from observed browser execution; retain
the interaction-result.v1 measurements and state/event completion. Declare supported
`visual.verification` bindings; supplied reports/receipt labels and legacy cached records do not
replace execution. Hashes bind freshness, with plan/input/output and CAS rechecked after capture.
Report Component Conformance, functional coverage and owner Visual Acceptance separately.

For a state journey, inspect every ordered assertion's actual/expected value and step finding;
the same page instance must carry state across open, selection and close. Journey results do not
contain motion frames. Keep selected values in the final assertions so a transient success cannot
hide a later reset. Motion samples alone do not prove business state, and DOM readouts alone do
not prove persistence or backend side effects. The complete menu example is in
`stages.md#complete-menu-task-example`.

### Cleanup and recovery

Stop only instances this run started, using their recorded ownership; remove temporary runtime
state and keep proof artifacts. Confirm the evidence still exists after cleanup. If a check cannot
run, name the missing instance/input/tool and recovery action. Repair and rerun the same real path;
for native tasks use the returned `reject`/`next` flow and preserve feedback. Changed upstream or
output bytes require fresh checks and applicable review; never hand-edit state to complete.
Native dispatch must precede work in an owned Git window. Retrying does not reset its baseline or
original scope; expanding the plan cannot legalize an existing out-of-scope edit. Preserve other
people's unchanged dirty files. Scope coverage includes working/index changes and commit/revert
paths, with non-Git, unmerged and replaced-history windows blocked. Ignored/outside writes,
restored uncommitted writes and attribution of concurrent writers need a separate host boundary.
Keep exact output/check snapshots available through owner review; scope inspection has no cleanup.

Read native `findings` and text `feedback` before another repair. Actual consecutive failures
bind input and output bytes; three identical failed observations return stop-repeating guidance.
Change one justified cause or report the missing condition, then rerun. Repeating next, missing
tools or a blocked scope/CAS does not add a measured attempt; output-byte changes reset the
consecutive count without resetting authorization. Never change a frozen expectation to make
the implementation pass.

## Engineering feedback loop

Use this loop for code and deterministic runtime changes; keep visual inspection and owner
Visual Acceptance separate. The established public CLI is the test interface. Existing task
authorization covers that interface; do not repeat setup or ask to confirm it again.

1. Name one observable behavior and the existing command that reaches it. State what the check
   catches and what it leaves untested. Take the expected result from the spec or a known literal,
   not a second implementation of the same calculation or a mock of internal collaborators.
2. Run one regression check and observe RED on the actual symptom before changing behavior.
   Make the smallest change that produces GREEN, then rerun that public path before starting the
   next behavior. Do not write every imagined test first or broaden unrelated implementation.
3. Keep the feedback command quick and unattended: isolate files/data, pin variable conditions
   and assert the specific result rather than merely successful exit. Save its actual invocation,
   input, exit code and output as [verification evidence](#evidence). A pass proves that scope only.
4. When a command passes but workflow progress stalls, run project-root `next --root <project>`
   and compare `verification.status` with `verification.recordedStatus`; read `verification.gate`,
   `verification.findings` and each finding's `fix`. Recorded status describes the previous check;
   current findings can require a new check because files changed, disappeared or were never bound.
5. Test one concrete cause at a time: name the prediction, change one input or condition, rerun
   the same symptom check and compare the observed result. Follow returned recovery guidance;
   do not blindly repeat identical inputs, substitute another unrelated passing check or
   hand-edit state. If the loop cannot run, record the missing input/tool/instance and next action.
6. Trace the affected callers and fix the shared module's root cause once. Keep its public
   interface small and understandable; reuse existing helpers and the standard library before
   adding indirection. A single implementation does not justify another interface or runner.

For UI, interaction and film changes, continue the real journey or play the changed output with
audio after technical checks; retain applicable owner review. A deterministic regression does
not establish creative quality or replace playback and Visual Acceptance.

Methods adapted from Matt Pocock's pinned [TDD](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/skills/engineering/tdd/SKILL.md),
[diagnosis](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/skills/engineering/diagnosing-bugs/SKILL.md) and
[module design](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/skills/engineering/codebase-design/SKILL.md).

## Self-Check

- Command:
- Result:
- Missing required skills:
- Missing enhancement skills:
- Missing optional skills:
- Fallbacks used:

## Static Checks

- Lint:
- Typecheck:
- Tests:
- Build:

## Control Plane Checks

- `designer-pipeline doctor`:
- `designer-pipeline status`:
- State schema / phase registry:
- State SHA-256 before mutation:
- State/event consistency:
- Migration or repair performed? evidence:
- Unknown future schema/registry fail-closed check:
- CLI exit code recorded as returned, not as assumed: 0 success, 1 invalid/error, 2 blocked, 3
  measured fidelity mismatch. `3` is a real outcome that reaches the caller and prints
  `fidelity-limited`; it is not folded into success:
- Any kernel failure reported by its own code rather than as success -  `KERNEL_FAILED` (spawn error
  or exit 1), `KERNEL_SIGNALED` (killed, including by timeout), `KERNEL_STATUS_MISSING` (no exit
  status), `KERNEL_STATUS_UNSUPPORTED` (a status outside 0-3, surfaced and never normalised):

## Browser / Visual Checks

Record screenshots under `design/changes/<change-id>/qa/screenshots/` when possible.

- 375x812:
- 768x1024:
- 1440x900:
- 1920x1080:

Check:

- No overlapping text or controls.
- No clipped labels.
- Primary workflow is visible without explanation text.
- Empty, loading, error, disabled, hover, focus, and active states exist where relevant.
- Palette is not one-note.
- Typography fits the surface and density.

## Web Treatment And Section Review (Visual Acceptance)

Complete for web changes at standard and full tier. Rules and evidence: `references/web-direction.md`
(Review rules W1 to W7).

| Rule | Name | Evidence read | Result |
| --- | --- | --- | --- |
| W1 | Dominant element and first-viewport signal |  |  |
| W2 | Adjacent density contrast |  |  |
| W3 | A purposeful empty section |  |  |
| W4 | Ground or structure change per section |  |  |
| W5 | Scroll pacing builds then lands |  |  |
| W6 | Motion answers a named driver, no opacity-only entrance |  |  |
| W7 | Type and colour inside the style seed |  |  |

- Reviewer:
- Visual Acceptance: pending / recorded by <reviewer>

Agents never record Visual Acceptance. Gate findings remain Conformance findings with their existing meaning.

## Plain-Language Checks

Complete for user-facing interface copy and artifacts that ask a person to decide or act.

- First useful sentence states the exact consequence or available action:
- Actor, event, scope/count, uncertainty, time/limit, exclusions, and unchanged state preserved:
- Title names the smallest accurate problem or outcome:
- Buttons and recovery guidance correspond to actions the interface actually provides:
- Internal causes and jargon removed unless they change the reader's decision:
- High-impact old/proposed comparison and selected version:
- Directness introduced no broader or stronger claim:

## Direction Preview Checks

- `direction-preview.json` applicability: required / waived; reason:
- `direction check --stage preview` status and exit code:
- Candidate IDs, shared viewport, content fixture hash, and state coverage:
- Pairwise axis differences; luminance or era difference retained:
- `index.html` and one screenshot per candidate exist with matching hashes:
- Preview shell and candidates usable at desktop and narrow widths:
- Selection source: user / bounded autonomous run / waived:
- `direction check --stage selection` status and selected-direction rationale:
- `directions.md` was written only after the selection gate passed:

## CJK Typography Checks

Complete when shipped copy contains Chinese, Japanese, or Korean text.

- Resolved system/project font stack and real available weights:
- Body size, line height, measure, tracking, and overflow behavior:
- Full-width punctuation and mixed-script convention checked with real strings:
- No synthesized italic CJK or negative CJK body tracking:
- Decorative font scope, subset glyphs, WOFF2/hosted bytes, license, and fallback:
- Font-loaded and font-failure captures:
- Desktop/mobile, light/dark, and 200% zoom evidence:

## Website-Cloning Fidelity Checks

Complete this section when live primary/reference targets are involved.

- Primary targets and captured final URLs:
- Reference targets and explicit mappings:
- BrowserPort adapter/capabilities:
- BuilderPort adapter/capabilities:
- EvidencePort adapter/capabilities:
- Rendering environment matched:
- Fonts/page readiness recorded:
- Text coverage:
- Asset coverage:
- Interaction coverage:
- Pixel-difference ratio by viewport:
- Maximum layout delta by viewport:
- Missing/extra sections:
- Approved dynamic masks and reasons:
- Repair loop iterations and evidence:
- Verdict: exact / adaptive / blocked / fidelity-limited

Never mark this gate exact when a required port is unresolved, comparison evidence is missing, or a builder guessed absent measurements.

## Contextual Anti-Slop Review

Complete this section when anti-template review is active.

- Evidence file:
- Command:
- Report:
- Status: pass / needs-review / blocked
- Hard blockers:
- Contextual warnings:
- Accepted contextual decisions:
- Preference information reviewed:
- `Anti-template Decisions` recorded in `design.md` or project `DESIGN.md`:
- Upstream rubric source/hash reviewed:

Hard rules cover content visibility, operable controls, legibility, responsive integrity,
reduced-motion behavior, and reference provenance. Named colors, fonts, punctuation, shapes,
effects, and common layout families are not hard failures.

## Motion Foundation Checks

- Project `MOTION.md` exists:
- `check-motion-foundation.cjs` status:
- Normalized foundation model matches `motion-foundation.schema.json`:
- Foundation schema:
- Foundation SHA-256:
- Foundation posture:
- Required headings use one language consistently:
- Primitive registry schema:
- Selected primitive IDs resolve:
- Missing or orphan primitive IDs:
- Change `motion.md` foundation hash matches:
- Runtime capability is supported / degraded / unsupported:
- Degradation is documented:
- Procedural equations are declarative:
- Procedural seeds and sampling are deterministic:
- Source provenance is measured / instrumented / inferred / authored:
- External adopted and rejected properties recorded:

## Website Clone Foundation Checks

- `check-website-clone-foundations.cjs` status:
- Project `DESIGN.md` ready:
- Project `MOTION.md` ready:
- All target palette foundations ready:
- `website-cloning.json` passed strict runtime contract validation:
- External code copied? expected `no`:
- Hypergryph or other benchmark treated as evidence only:

## Change Motion Checks

- `motion.md` required? yes/no:
- `motion.md` created? yes/no:
- Foundation link and hash recorded:
- Selected primitive IDs recorded:
- Scene, stage, camera, and layer ownership:
- Track and timeline IDs:
- State machine and interruption behavior:
- Procedural generators and parameter bounds:
- Runtime adapter bindings:
- Implementation matches `motion.md`:
- Library choice matches `motion.md`:
- `prefers-reduced-motion`:
- Fast repeated clicks:
- Route/page transition interruption:
- Scroll animation performance:
- Focus and hover motion:
- Animation purpose:
- Duration/easing:
- Timeline/stagger behavior:
- Cleanup on unmount:
- Evidence: screenshot / video / trace / manual notes:

## Reference And Spatial Routing

Complete this section when visual references influence the change.

- `reference.md` source inventory and provenance:
- Source availability: `resolved` / `pending`:
- Pending reason, requested from, and unlock action reported to the user:
- Observable spatial evidence for and against 3D:
- Per-region structure table recorded (rows, columns, contents, breaks from):
- Uniformity question answered `Yes` / `No` with named exceptions:
- No region described as `as above` or `same as previous`:
- `composition` in `reference-evidence.json` matches the table and does not contradict itself
  (`composition contradiction: ...`):
- When two or more `rows x columns` structures tie for most-common, every region records a
  `breaksFrom` or is named by one that does (`composition ambiguity: ...`). Reordering the table
  cannot change this verdict:
- Schema era: a document declaring `design-pipeline.reference-evidence.v1` while carrying `intent`
  or a `graybox` block is validated as v2 and must record `intent` and `composition`
  (`schema era mismatch: ...`). A v1 document carrying neither stays exempt:
- Selected route: `2d` / `2.5d` / `3d` / `hybrid`:
- Fidelity invariants:
- Required artifact set (`graybox.png` present on every route):
- `reference check` status, reason, and `stages.graybox` status:
- Requested fidelity unchanged by a pending source:
- Verification claim: `verified` / `fidelity-limited` / `unverified`
- Claim derived from the whole `reconstruction check --stage final` result - its top-level status
  and every entry in its `stages` map, which that one command already reports together:
  - `verified` only when the top-level status is `ready` and `stages.graybox`, `stages.geometry`,
    and `stages.final` are all `ready`:
  - `fidelity-limited` only when the top-level status is `fidelity-limited` and no reported stage is
    `blocked`:
  - `unverified` for everything else, including any single blocked stage and a change with no
    `reconstruction.json` to run the command against:
- Top-level `ready` beside a blocked `stages.graybox` recorded as `unverified`, not `verified`:
- The claim was read from a `--stage final` run and from nothing else. `reconstruction check`
  defaults to `--stage geometry`, and no stage-scoped result - the default run, an explicit
  `--stage geometry` or `--stage graybox` run, or a bare `stages.graybox` reading lifted out of any
  result - was cited as evidence for `verified`:
- A `--stage final` result that was missing, unreadable, or incomplete was recorded as `unverified`:
- Nothing in this file, in `design.md`, or in the final response describes an `unverified` run as
  verified, exact, identical, 1:1, pixel-perfect, faithful, or complete:

Write the claim on its own line above; it lives nowhere else, because no contract field carries it.
`unverified` is the default until a measurement replaces it, never a value inferred from a `ready`
graybox, a declaration, or a placeholder.

A pending source, an unreadable source declaration, and a source nothing on disk backs all produce
`unverified`, but they do it by blocking a stage the claim reads, not by a rule of their own. The
stages are the derivation; there is no second path to the claim.

## Graybox Gate

Complete this section for every change with a `reference-evidence.json`, on every route and in every
fidelity mode.

- `reconstruction check --stage graybox` status: ready / blocked
- Blocking reason if any:
- Capture path and captured at:
- Declared runtime graybox mode (mechanism, token, and the layers it disables):
- Runtime mode names `emissive`, `optical`, and `texture` in `disables` (a bare token is
  `graybox-mode-unverifiable`, never `ready`):
- Suppressed treatments listed:
- Comparison mode declared: `measured` / `qualitative`
- Comparison measurable (source `resolved`, a `source.path` declared, and the bytes behind it a PNG
  whose IHDR width and height the gate could read): yes / no
- If `measured` was refused, the reason names which state applies:
  - `graybox-comparison-unmeasurable` for a pending source
  - `reference-source-unrecorded` for no reference document
  - `reference-source-undeclared` for a document that declares no `source`
  - `reference-source-path-undeclared` for a resolved source that names no path
  - `reference-source-raster-uncontained` for a path that escapes the change root
  - `reference-source-raster-missing` for a path that names no file
  - `reference-source-raster-unreadable` for a path that is not a regular file, or whose bytes
    cannot be read
  - `reference-source-not-raster` for bytes with no PNG signature, a zero-byte file included
  - `reference-source-raster-truncated` for a PNG signature with no readable IHDR dimensions
- If the document records `source.resolvedAt`, the `measured` capture is not older than it
  (`graybox-capture-predates-source` if it is, and the repair is to re-run the capture, never to
  re-label it; `graybox-capture-uncomparable` if `capturedAt` will not parse):
- `resolvedAt`, when present, is an ISO 8601 timestamp (`reference-source-resolved-at-invalid`) and
  is not recorded beside `availability: pending`
  (`reference-source-resolved-at-contradictory`); absent is the legacy default and is not compared:
- `fidelityEvidence` (true only when `ready`, `measured`, and measurable):
- Exactly one carrier holds the `graybox` block (two is `graybox-carrier-conflict`, and neither
  block is validated):
- Every carrier path resolves inside the change root - a path that escapes it is refused unread and
  reported as the refusal, not as absence (`graybox-carrier-uncontained` for the primary artifact,
  `reference-source-uncontained` for the reference document), and is named once, never twice:
- Region findings and statuses (no `open` findings):
- A `composition` is recorded somewhere for the comparison to bind to - a comparison that names
  regions with none recorded is `graybox-composition-unrecorded` (no `reference-evidence.json`) or
  `graybox-composition-undeclared` (document present, no `composition`):
- Region ids match the recorded `composition` ids exactly - every declared id addressed, none
  invented:
- Reference document readable - an unparseable document, a non-object `source`, or an out-of-enum
  `source.availability` blocks this stage too, with the same reason the geometry gate uses:
- Graybox approval status and evidence:
- Graybox passed before materials, glow, bloom, depth of field, scanlines, and grading:
- `geometry` stage status recorded separately (never inferred from graybox):
- If both graybox and geometry are blocked, recorded as a process gap, not an environmental limit:

The graybox gate blocks optical treatment: materials, glow, bloom, depth of field, scanlines, and
grading. The geometry gate blocks detail geometry, type treatment, and any measured fidelity claim.
A blocked `geometry` stage is not a reason to withhold optical treatment when the graybox stage is
`ready`; record the verification claim as `unverified` and continue.

A `measured` comparison the evidence cannot support is `blocked` with the reason from the list above
that names the actual state, not a downgrade to `qualitative`. A block that cannot be validated at
all is `blocked` with `graybox-invalid`. Never record `ready` for a gate that could not verify its
own evidence.

The raster and freshness checks above run on the graybox stage only. The `geometry` stage refuses a
pending source and an unreadable source declaration, and otherwise recomputes landmark error without
opening the file `source.path` names, so a `ready` geometry status is not a statement that the
reference raster is readable. Record it as the stage-scoped result it is.

## Spec Reconciliation

Complete this section for every change with a reference.

- `Spec Reconciliation` section present in `design.md`:
- Cited graybox capture exists on disk:
- Reconciled timestamp:
- Rows: specified value / implemented value / observed cause:
- Every `Cause` describes an observation, not an intention:
- Empty table is a valid result; absent section is `blocked`:
- `reference check` ran and its `stages.reconciliation` status recorded (the gate is folded into the
  aggregate; `reconciliation check` on its own is still available but is no longer the only place
  the verdict appears):
- `reference check` exit code: 0 both stages ready / 2 reconciliation or graybox blocked / 3
  reconciliation ready and geometry `fidelity-limited`:

### Applicability

The gate applies to a change that has a reference. `reference-evidence.json` and `reference.md` are
hand-authored, so waiting for one of them made the gate opt-in: a reference-driven change stayed
`applicable: false` until someone remembered to create a file. Two pipeline-written manifests now
answer the question as well, and they exist from `change init`, before the agent has authored
anything:

- `website-cloning.json`: a clone reconstructs sites it did not author, so a valid manifest with at
  least one target is reference-driven unconditionally.
- `design-synthesis.json`: reference-driven exactly when `inputs.references` is non-empty, checked
  against `inputs.mode`.

Record:

- `referenceSignals` reported by the gate (which carriers and manifests were found):
- `applicable`: yes / no. When no, unfilled-stub findings are warnings rather than blockers:
- Manifest present and readable. A present manifest that cannot be read or believed blocks on its
  own authority, because while it is broken the gate cannot decide whether the obligation exists at
  all:
  - `reconciliation-manifest-unreadable`: the manifest is present but cannot be read, is not valid
    JSON, or is not a JSON object.
  - `reconciliation-manifest-malformed`: it parses, but its reference declaration is unusable - the
    wrong `schema`, a clone manifest with no non-empty `targets` array, `inputs.references` that is
    not an array, or an `inputs.mode` outside the enum.
  - `reconciliation-manifest-contradictory`: `inputs.mode` and `inputs.references` disagree about
    whether the change is reference-driven, and the gate refuses to pick a winner.
- An **absent** manifest is not a fault. It is a real legacy signal - a change scaffolded before the
  manifests existed, or one that is simply not manifest-driven - and keeps the carrier-only default.

## Scene And Runtime Checks

Complete this section when `scene.json` and `scene.md` or `3d.md` are required.

- Graphics capability family:
- Adapter ID and version:
- Existing runtime preserved or dependency change justified:
- `scene.json` passes `scene check`:
- Family-selected projection (`scene.md` or `3d.md`) identity/hash markers match:
- DESIGN/MOTION foundation hashes recorded:
- Scene, camera, coordinates, layers, and safe-area policy:
- Single render/game-loop owner:
- Boot, preload, enter, pause, resume, exit, remount, and destroy behavior:
- Asset manifest, provenance, failure, memory, and disposal behavior:
- Keyboard, pointer/touch, gamepad, gesture, and modal input conflicts:
- Semantic DOM or accessibility-overlay boundary:
- Renderer/backend and unsupported-environment fallback:
- Frame-time, draw-call, memory, DPR, object, effect, and low-end budgets:
- Deterministic seeds, save data, fixtures, and capture conditions:
- Reduced-motion and reduced-effects substitution:
- Save/load, localization, dialogue, and narrative-state checks when applicable:
- Credentialed host optional and authority/cost boundary recorded:
- Unverified community packs excluded from automatic install:
- Evidence: screenshot / video / trace / profile / accessibility tree / manual notes:

## Evidence Receipt Checks

- Evidence adapter ID/version/path:
- Adapter capability probe:
- Receipt schema/status:
- Evidence root containment:
- Artifact SHA-256 values match:
- Screenshot / trace / DOM / console / network / accessibility / performance coverage:
- Redaction status:
- Missing evidence explicitly `partial`, `blocked`, or `unknown`:

## Motion And Component Evidence

- `verify motion` result and receipt:
- Deterministic capture ID / seed:
- Duration tolerance and long-frame budget:
- Interruption/reversal behavior:
- Reduced-motion substitute:
- `verify components` matrix:
- Hover / focus / pressed / disabled / loading / empty / error states:
- Keyboard / touch / mobile / desktop coverage:

## Interoperability And Benchmark

- Design tokens schema/provenance:
- UI IR schema and catalog component IDs:
- Design-to-code source/token mappings:
- Pattern catalog audit/search evidence:
- Benchmark manifest and measurements:
- All required dimensions represented:
- Required failures/unknowns preserved (not averaged away):
- Local feedback observation recorded when reusable:

## Adapter Governance

- Adapter registry audit:
- Graphics catalog routes resolve to registry IDs:
- Adapter support/availability/version recorded:
- License/provenance/security/host policy reviewed:
- Intake evidence required for new candidate:
- Unverified candidate blocked from install/native/companion promotion:
- Visual style signals linked to DESIGN/MOTION decisions:

## Accessibility Checks

- Keyboard tab order:
- Focus ring:
- ARIA labels / names:
- Contrast:
- Touch targets:
- Form errors:
- Screen reader announcements where relevant:

## Engineering Fit

- Uses existing components/tokens:
- Avoids unnecessary dependencies:
- Does not create parallel OpenSpec/GBrain source of truth:
- React/Next conventions checked when applicable:
- Animation library choice justified:

For selected built-in Taste methods, use `taste-skill.md` within these existing checks:

- Exact entry/version and complete original source read; v2 experimental or explicit v1 compatibility:
- Brief/audience fit, chosen dials/style and project/user authority; adapted or non-applicable rules:
- Every requested file, section image, screen or board completed and actually inspected:
- Existing brand, route/IA/SEO/analytics, functionality, framework and shared consumers preserved:
- Real copy/assets/facts, font licensing/CJK glyphs, contrast, zoom/reflow, keyboard and states checked:
- Image provider/output paths and limitations; image-only output is distinct from live UI behavior:
- Reference-to-code uses the actual selected/user reference and existing final fidelity evidence:
- Stitch example translated into the project foundation; no copied example claimed as user design:
- Implemented motion motivated, bounded, responsive to reduced motion, and observed through real input/playback:

Availability, a source pre-flight checklist or a marker result does not establish Component
Conformance or Visual Acceptance. Report both separately and preserve the existing evidence lineage.

For CSS changes, use `good-css.md` within the existing interface review and evidence process:

- Applied practice IDs, original conditions and project adaptations:
- Target-browser/version support, unsupported features and exercised usable fallbacks:
- Intrinsic layout with narrow/wide viewports, real long content and RTL/CJK/200% zoom as applicable:
- Keyboard/focus, hover-capability, pressed/form states and reduced-motion observations:
- Offline specimen study and actual affected project surface inspected:
- CSS-owned properties do not conflict with the deterministic film or existing motion owner:

The upstream checker is a scoped diagnostic for readable CSS/style blocks, with opinionated rules;
it cannot validate utility/CSS-in-JS output, browser support, accessibility or visual quality.
Source integrity and study generation do not establish Component Conformance or Visual Acceptance.

## Agent-Readable State

- `state.json` exists:
- `state.json.status`:
- `state.json.phase`:
- `state.json.nextActions` current:
- `events.jsonl` exists:
- Last event matches current phase:
- `handoff.md` exists:
- `handoff.md` agrees with `state.json`:
- Evidence paths in state/events exist:
- Another agent can resume from these files without conversation history:

## Package And Release Reproducibility

Complete this section when publishing the pipeline itself.

- Test manifest matches every `tests/*.test.cjs` file:
- Package resource manifest complete:
- Two fixed-epoch package runs are byte-identical:
- TGZ / ZIP / checksum sizes and SHA-256:
- Invalid package input preserved previous artifacts:
- Package extracted and installed into isolated target:
- Existing target preserved without `--replace`:
- Explicit replacement succeeded:
- Installed dependency/self-check passed:
- Installed public CLI smoke passed:
- Isolated HOME/CODEX_HOME and invalid proxy environment used:
- Repository status byte-identical before/after QA:

## Scorecard

Use 0-5.

| Dimension | Score | Notes |
| --- | ---: | --- |
| Visual taste |  |  |
| UX clarity |  |  |
| Accessibility |  |  |
| Responsiveness |  |  |
| Motion quality |  |  |
| Engineering fit |  |  |
| Performance risk |  |  |

## Decision Audit

Log every auto-decision:

| Decision | Principle | Result | Risk |
| --- | --- | --- | --- |

## Final Verdict

- Pass / fail:
- Blocking issues:
- Non-blocking issues:
- Follow-up tasks:

The verdict may not describe the change as exact, identical, 1:1, pixel-perfect, faithful, or
complete while the recorded verification claim is `unverified`. A pass with an `unverified` claim is
a pass on the gates that ran, and it says so.

## Open Source Readiness

Complete this section only when preparing to publish or update `design-pipeline` itself.

- Checked `references/open-source-readiness.md`:
- Release status: ready / ready-with-notes / not-ready
- Failed MUST gates:
- SHOULD gaps documented:
