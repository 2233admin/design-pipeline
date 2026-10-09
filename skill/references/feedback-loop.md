# Feedback and contribution loop

Use this module when a pipeline run exposes a pipeline bug, stale companion, missing capability, quality gap, documentation gap, or reusable feature request.

## Principle

Capture immediately, publish deliberately.

“Real-time” means the observation is normalized and written during the command that detects it. The module does not install a watcher, poll a remote, or publish with ambient credentials.

## Issue and PR writing

Write the smallest useful story, not a polished performance:

- Lead with what happened and who or what is affected. Keep one finding per draft.
- Use this order when it fits: observed behavior -> scope and impact -> evidence -> suspected cause or open question -> smallest next check.
- Separate facts from hypotheses. Preserve exact counts, limits, timestamps, exclusions, and uncertainty.
- Prefer one concrete, non-sensitive reproduction detail over generic context. Never invent a user story, quote, metric, or personal experience.
- Keep useful headings and action steps. Remove ritualized empathy, marketing language, predictable “not X but Y” turns, and empty future-looking conclusions.
- If the evidence is incomplete, say `待验证` and name the missing input instead of filling the gap with plausible prose.

Before publication, do two passes: first make the consequence and next action easy to find; then compare the draft against the evidence and restore anything that widened its claim.

## Local flow

```text
Observe -> Normalize -> Redact -> Deduplicate -> Draft -> Audit -> Review -> Authorize -> Publish -> Reconcile
```

Record a finding:

```powershell
node <design-pipeline>/scripts/record-feedback.cjs `
  --kind capability-gap `
  --source runtime `
  --skill animejs `
  --title "Anime.js companion lacks adapter guidance" `
  --summary "The requested Three.js target is supported upstream but missing from the installed companion." `
  --evidence "Self-check missing marker: adapters"
```

Record self-check warnings synchronously:

```powershell
node <design-pipeline>/scripts/check-deps.cjs --json --record-feedback
```

Artifacts are written under `.design-pipeline/feedback/` in the target repository unless `--feedback-root` selects another root.

Before writing, the recorder:

- replaces longer nested paths before parent paths so the feedback root remains identifiable;
- redacts common tokens, authorization headers, credential-bearing URLs, and machine paths;
- normalizes scalar programmatic inputs into the same arrays produced by the CLI;
- validates existing observation and index JSON before an update.

Corrupt feedback state fails closed with a contextual error and is not silently overwritten or
reset.

## Routing

- Use an Issue draft for an unconfirmed bug, stale companion, missing capability, or feature request.
- Use a PR draft only when a concrete patch exists and changed files plus validation evidence are available.
- `auto` routes to Issue because a finding alone is not proof that a patch is ready.

## Publish gate

The bundled scripts never create a remote Issue or PR. See
`references/upstream-capability-sync.md` for the host-adapter contract.

Before publication:

1. Confirm the intended upstream repository.
2. Re-read the draft for private paths, user data, screenshots, tokens, and proprietary source.
3. Link reproducible evidence and the relevant capability-registry source.
4. For a PR, verify the diff, tests, package output, and compatibility fallback.
5. Prepare a deterministic request with `scripts/prepare-publication.cjs`.
6. Obtain explicit authority for that action and repository.
7. Use an authorized GitHub, browser, or ship host adapter to create or reuse the remote artifact.
8. Capture a schema-valid receipt containing the same idempotency key, action, and repository.
9. Reconcile it with `scripts/reconcile-publication.cjs`; do not hand-edit published state.

## Learning

### Visual calibration and RSI

RSI here is a reviewable loop that improves an artifact and, when a reusable defect is found,
the tool's guidance or code. It uses existing tasks, feedback and OpenSpec contracts. It does not
update model weights or prove general aesthetic improvement from one accepted artifact.

1. **Observe:** inspect a real frame or short clip beside the reference. Name the target, one
   visible property, the difference and any uncertainty; paths and technical passes are not observation.
2. **Calibrate:** at a meaningful visual decision or uncertain critical difference, set the existing
   `visual.review: true`. Show that version and ask the owner a concrete question, such as whether
   the blue glaze should have a broad reflection or small ripples. Record the actual reply against
   the output metadata. Silence is not acceptance; routine checks do not need a user decision.
3. **Repair:** change the named property, preserve its invariants, and invoke the applicable
   capability with real inputs. Keep immutable before/after evidence. The customer sees the intended
   experience; development controls and records stay in an explicit inspection entry.
4. **Compare:** use the same view/time and rerun affected checks, then obtain the owner's scoped
   decision. A rejected completed target returns through existing `decide` and dependency invalidation.
   Preserve old evidence and decisions; do not fill in user scores or infer acceptance from a gate.
5. **Improve the tool:** if the cause recurs in decomposition, dispatch, capability selection or
   guidance, use existing `feedback record --source user|runtime`, make the smallest OpenSpec repair
   and retain a regression check. Compare old/new tool versions on the frozen case before claiming
   a measured improvement. One badge does not establish gains across all frontend work.

Select capabilities from the observed difference, loading only the current guide:

| Visible difference | Existing capability | Compare |
| --- | --- | --- |
| Contour, thickness, overlap | Reference measurements, reconstruction and real 3D geometry | Locked front and side views |
| Glaze, metal, foil or reflection | `film-materials.md`, enamel helper, selected renderer's shader and lighting | Separate regions at fixed view/time/light |
| Pose, timing or motion readability | Animation thinking, motion and choreography guides | Playback plus transition frames |
| Generic layout or misplaced controls | Existing product workflow, DESIGN and applicable frontend/interface guides | Primary user action and responsive surface |

Record the choices actually executed and their limits. A helper's defaults do not prove a reference
match. Packaged skill defects follow the maintainer loop below. External project/user preferences
may use `adaptation record/propose/evaluate/promote` after delivery, retaining independent evaluation
and explicit promotion approval. That evaluator checks evidence; it does not run models, upgrade
this packaged tool or authorize silently rewriting installed skills.

After a finding is resolved:

- update `companion-capabilities.json` when the durable fact is compatibility-related;
- update the reference or script when the pipeline behavior changed;
- preserve the regression test;
- mark the observation `resolved` or `superseded`;
- if gstack is installed, log only a durable reusable learning, never raw user evidence.

## Maintainer self-hosting loop

For an explicitly requested search over a bounded design instruction, use the independent
[GEPA supporting tool](gepa.md). Its native search runs comparable cases and exports a candidate
diff, history and final-test evidence. Inspect those results as input to this maintainer loop;
search does not promote packaged guidance or alter the finite project/user adaptation contract.
Component Conformance and Visual Acceptance remain separate from the search score.

When changing `design-pipeline` itself:

1. Start or link an OpenSpec change.
2. Run self-check with feedback recording.
3. Treat new observations as input evidence, not automatic scope.
4. Implement the smallest design-outcome-focused change.
5. Run repository QA, tests, package checks, installed self-check, and structural analysis.
6. Prepare a PR draft from the resolved observation.
7. Publish only with explicit user authority.

This keeps the pipeline capable of improving itself without turning it into a general-purpose autonomous package manager.
