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
- `composition` in `reference-evidence.json` matches the table and does not contradict itself:
- Selected route: `2d` / `2.5d` / `3d` / `hybrid`:
- Fidelity invariants:
- Required artifact set (`graybox.png` present on every route):
- `reference check` status, reason, and `stages.graybox` status:
- Requested fidelity unchanged by a pending source:
- Verification claim: `verified` / `fidelity-limited` / `unverified`
- Claim derived from `reconstruction check --stage final` status only (`ready` -> `verified`,
  `fidelity-limited` -> `fidelity-limited`, every other outcome including any blocked stage, a
  pending or unresolvable source, or no `reconstruction.json` -> `unverified`):
- Nothing in this file, in `design.md`, or in the final response describes an `unverified` run as
  verified, exact, identical, 1:1, pixel-perfect, faithful, or complete:

A pending or unresolvable source produces verification claim `unverified`. Write the claim on its
own line above; it lives nowhere else, because no contract field carries it. `unverified` is the
default until a measurement replaces it, never a value inferred from a `ready` graybox, a
declaration, or a placeholder.

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
- Comparison measurable (source `resolved` and the named raster present on disk): yes / no
- `fidelityEvidence` (true only when `ready`, `measured`, and measurable):
- Region findings and statuses (no `open` findings):
- Region ids match the recorded `composition` ids exactly - every declared id addressed, none
  invented:
- Graybox approval status and evidence:
- Graybox passed before materials, glow, bloom, depth of field, scanlines, and grading:
- `geometry` stage status recorded separately (never inferred from graybox):
- If both graybox and geometry are blocked, recorded as a process gap, not an environmental limit:

The graybox gate blocks optical treatment: materials, glow, bloom, depth of field, scanlines, and
grading. The geometry gate blocks detail geometry, type treatment, and any measured fidelity claim.
A blocked `geometry` stage is not a reason to withhold optical treatment when the graybox stage is
`ready`; record the verification claim as `unverified` and continue.

A `measured` comparison the evidence cannot support is `blocked` with
`graybox-comparison-unmeasurable`, not a downgrade to `qualitative`. A block that cannot be
validated at all is `blocked` with `graybox-invalid`. Never record `ready` for a gate that could not
verify its own evidence.

## Spec Reconciliation

Complete this section for every change with a reference.

- `Spec Reconciliation` section present in `design.md`:
- Cited graybox capture exists on disk:
- Reconciled timestamp:
- Rows: specified value / implemented value / observed cause:
- Every `Cause` describes an observation, not an intention:
- Empty table is a valid result; absent section is `blocked`:

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
