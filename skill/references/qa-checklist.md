# QA Checklist

Create or update `qa.md` for every design-pipeline change with this structure.

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
