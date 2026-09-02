# Lifecycle and Output Reference

This reference contains completion, feedback, adaptation, and output instructions moved out of the front door.

## Stage 7: Archive

After completion:

- Keep active artifacts with the code if the repo has no archive convention.
- If the repo has OpenSpec-style archiving, move completed change notes to the matching archive folder.
- Update persistent design docs only when the change creates reusable tokens, components, or interaction rules.
- Link accepted feedback observations to the completed change. Mark them resolved or superseded only after verification evidence exists.

## Feedback and Maintainer Loop

Use `references/feedback-loop.md` whenever a run exposes a pipeline bug, stale companion, missing capability, quality gap, documentation gap, or reusable feature request.

The local loop is:

1. Observe during self-check, implementation, or QA.
2. Normalize, redact, and deduplicate with `scripts/record-feedback.cjs`.
3. Generate an Issue draft by default; generate a PR draft only when changed files and validation evidence exist.
4. Review the draft, target remote, privacy boundary, and evidence.
5. Publish only after explicit user authority through an installed GitHub or ship workflow.
6. Preserve the regression test and update `companion-capabilities.json` when the durable learning changes compatibility routing.

When modifying `design-pipeline` itself, use this same pipeline and OpenSpec lifecycle. The pipeline is allowed to improve itself, but it must not silently mutate third-party skills or use ambient credentials to create remote artifacts.

## Layered Adaptation Loop

Use `references/adaptation.md` only after the user's requested artifact or implementation is
delivered. Capture minimal evidence rather than transcripts. Treat a single acceptance or silence
as weak evidence; it cannot produce durable guidance. Keep every candidate in shadow mode until a
different evaluator runs both replay and held-out comparisons and `designer-pipeline adaptation
evaluate` returns a passing hash-bound receipt.

`Methodology Kernel` and packaged `skill/` resources are release-governed and cannot be adaptation
targets. `Task Session Policy` expires. Only an external versioned Project Adaptation Skill or User
Collaboration Skill may be promoted, and promotion requires explicit user approval. Durable rules
select from the finite collaboration dimensions in the contract; they are never free-form behavior
instructions. Bind each candidate to the exact external-skill path, incumbent content hash, metric
direction, manifest, and construction fixtures before evaluation. Promotion and rollback use their
process-owned, recoverable prepare/commit journal; raw actor and review labels are stored only as
purpose-separated hashes. Resolve mutually exclusive values by collaboration dimension in the
order defaults, user, project, current task while carrying constraints
and quality gates as immutable inputs. Rejection leaves the incumbent unchanged. Roll back before
forgetting a promoted candidate, then remove its usable content and retain only the non-sensitive
tombstone required to prevent reinstatement.

## Output Contract

Final responses should report:

- Change id and artifact folder.
- Project `DESIGN.md` path, input mode, scope score/budget, and Wayfinder map URL when synthesis ran.
- Implemented surfaces.
- Playground applicability, selected state/integration status, and accepted prompt path when used.
- Adaptation applicability, scope, shadow/evaluated/promoted disposition, evidence receipt, and
  rollback or forgetting status when the layered loop was used.
- Verification evidence.
- Reference source availability. When it is `pending`, name the action that unlocks the measured
  gates: supply the source file path, which enables rectification, camera calibration, landmark
  error, and the fidelity receipt. Requested fidelity stays as the user asked.
- Verification claim, for every change with a `reference-evidence.json`: `verified`,
  `fidelity-limited`, or `unverified`. It is recorded on one line in `qa.md` under
  `## Reference And Spatial Routing` and derived from one command,
  `designer-pipeline reconstruction check --stage final`, read in full - its top-level status and
  every entry in its `stages` map. `verified` needs the top-level status and every reported stage to
  be `ready`; `fidelity-limited` needs a top-level `fidelity-limited` with no stage `blocked`;
  everything else is `unverified`, including a single blocked stage, a pending or unresolvable
  source, and a change with no `reconstruction.json` to run the command against. Only the complete
  output of that one command is evidence for the claim. `reconstruction check` defaults to
  `--stage geometry`, so the command run without `--stage` returns a geometry-scoped result, and
  neither that result, nor an explicit `--stage geometry` or `--stage graybox` run, nor a single
  `stages.graybox` or `stages.geometry` entry lifted out of any result, may be cited as evidence for
  `verified`: a stage-scoped status answers only for the stage that was asked for, and is reported
  beside the other stages without gating on them. A `--stage final` result that is missing,
  unreadable, or incomplete is reported as `unverified`. An `unverified`
  claim may never be reported as verified, exact, identical, 1:1, pixel-perfect, faithful, or
  complete. The claim is independent of requested fidelity, which stays where the user set it.
- Missing companion skills, if any.
- Self-check result and chosen fallbacks.
- Feedback observation ids and local draft paths, when findings were recorded.
- Anti-slop review status, report path, blockers, warnings, and accepted contextual decisions when
  that review ran.
- Whether any remote Issue or PR was published; default is “not published.”
- Remaining risks or explicit validation gaps.
