# Design

## Decision

Admission is a precondition, not an axis. A product-promo film is evaluated only after its
storyboard records the real product, run at a pinned commit and captured, and its shots are built
from those captures. Until then every evaluating surface returns the admission result and stops.
Scoring the product source as one more weighted component was rejected: the Tern pair shows that
high structure and rhythm scores can outweigh any deduction for invented material.

## Admission record (storyboard.v1)

`productSource` is optional on `design-pipeline.film-storyboard.v1` (same schema id).

- `status: "admitted"`: `repository` (credential-free https/http/ssh/git URL or
  `git@host:owner/repo`; no local path or `file://`), `commit` (full 40/64 lowercase hex; no
  branch, tag or short SHA), `run` (`command`, RFC 3339 `observedAt`, `log {path, sha256}`,
  optional http(s) `url`), `captures` (non-empty; unique `id`, `kind` `ui-state|operation`,
  project-relative image/video `path`, `sha256`, `shows`, RFC 3339 `capturedAt`) and
  `flow {action, response, result}` (non-empty, unique, known capture ids). Both times need seconds
  and `Z` or `±hh:mm`; a timezone-less time is a contract error, because the host would read it in
  its own timezone and the same record could pass on one machine and fail on another. Ordering uses
  instants computed from each value's own offset, never the host timezone.
- `status: "blocked"`: `blocker {kind, reason, needs}` with kind `no-repository`,
  `access-denied`, `build-failed`, `run-failed`, `needs-credentials` or `capture-failed`;
  optional `repository`/`commit`; no `run`, `captures` or `flow`.
- `beats[].source`: non-empty unique array of known capture ids.

Malformed shape is a contract error (exit 1, scope `film storyboard`). Admission is required when
the bound Stage 0 form is `product-launch-video` or the storyboard declares `productSource`.
Error findings, each with a `fix`: `product-source-missing`, `product-source-blocked`,
`product-source-file-missing`, `product-source-file-changed`, `product-source-run-unpinned`,
`product-source-captures-incomplete`, `product-source-time-order` (a capture before the run, or any
action capture after a response capture, or response after result: max(action) ≤ min(response)
and max(response) ≤ min(result)), and for planned shots `shot-source-missing` (every beat cites
the captures it shows except a pure brand card, a `brand-hold` with `transformation.kind:
"none"`), `flow-unshown` (no action beat cites a step's capture; holds and cards cannot show a
step), `flow-out-of-order` (the action is first shown after the response, or the response after
the result; one continuous beat may carry all three) and the secondary `source-share-low`
(unsourced brand cards over 25% of `durationSec`, the existing hold share). The sourced share is
never the primary criterion: half real captures plus invented result cards fail
`shot-source-missing`. The record-only form (`shots: false`) serves the workflow `source` stage
before beats exist.

## Workflow

Film state stores the Stage 0 binding `state.jobPlan {jobId, jobPlanSha256, jobPlanPath,
deliverableForm}`, from `next --job-plan <file>` or a discovered `<root>/job-plan.json`, validated
with the existing job-route checks. A missing, drifted or form-conflicting plan throws
`JOB_PLAN_STALE` with the existing re-plan command; plans are never rewritten.

Product promos (`deliverableForm === "product-launch-video"`) use:

- quick: source, plan, build, check, review (replicate: reference first);
- standard/full: intake, source, reference, concepts, plan, sample, build, check, review, deliver.

`source` finishes when the record-level admission is `admitted`; a blocked record returns
`{ type: "blocked", blocker, why, record }` (CLI exit 2) and never advances. `sample` asks for a
short sample cut from the cited captures (action → response → result) and an owner `decide --stage
sample --verdict accept|reject`. Before asking, the stage checks `sample.mp4`: the existing film
probe (`ffprobe`) must report a video-stream duration of 5–8 s inclusive (never the container's,
which a longer audio track stretches), and a full `ffmpeg` video decode
(`-v error -xerror -map 0:v:0 -f null -`) must exit 0; the decode is judged by exit status, not by
stderr text. Otherwise `next` returns a `run` action whose findings (`sample-not-video`,
`sample-duration`, `sample-duration-unknown`, `sample-probe-unavailable`) carry the `fix`, and `decide` refuses with
`SAMPLE_INVALID`. An accepted verdict finishes the stage only while the file still passes the check
(no result is cached between calls). Acceptance binds the
sample bytes and the canonical `productSource` hash, so changing either reopens it. Plan and check
gate inputs add the run log, captures and bound job plan to the existing input hashes. Non-product
films keep their stage lists, actions and results unchanged.

## Evaluation surfaces

`film check`, `verify film-storyboard`, `verify film-timeline` and `verify film-render` receive the
bound form and project root. A non-admitted storyboard returns only the admission result
(`metrics: null`; render not sampled; no ffmpeg). `film-eval measure` classifies each scenario
prompt with the existing Stage 0 classifier; a non-admitted product-promo run is unmeasured and
listed under `admission`, and the unchanged benchmark evaluator reports `blocked`. Non-product
results stay byte-identical (no `admission` key).

## Acceptance separation and limits

Admission is technical conformance of a record. Visual direction (`product-film-direction.md`),
the owner's sample verdict and final Visual Acceptance remain separate decisions; passing admission
or any gate grants neither. Gates bind records and file hashes; they cannot prove that a capture's
pixels came from the product, that the run log is genuine, or that the shown flow is the product's
real behavior. Owner review of the sample and draft is the check for that. Products are run in
demo or seeded mode; no live accounts, trades or payments are used for capture.

## File ownership

| Area | Files |
| --- | --- |
| Storyboard contract and fixes | `skill/scripts/film-core.cjs`, `skill/scripts/film-hints.cjs` |
| Film check, timeline, eval | `skill/scripts/film-project-core.cjs`, `skill/scripts/film-timeline-core.cjs`, `skill/scripts/film-eval-core.cjs` |
| Workflow stages and job-plan binding | `skill/scripts/workflows/film.cjs`, `skill/scripts/workflow-core.cjs` |
| CLI wiring (`--job-plan`, exit 2) | `skill/scripts/cli-core.cjs` |
| Stage 0 classifier and promo routing terms | `skill/scripts/job-route-core.cjs`, `skill/references/job-registry.json`, `skill/references/frontend-stack-registry.json` |
| Other storyboard callers (pass the project root) | `skill/scripts/score-project-core.cjs`, `skill/tools/film-methods/prepare.cjs` |
| Guidance | `skill/references/workflow-film.md`, `product-film-direction.md`, `stages.md`, `pipeline-reference.md`, `skill/SKILL.md`, `skill/evals/film/README.md`, `docs/GLOSSARY.md`, `CHANGELOG.md` |
| Tests | `tests/product-source-admission.test.cjs` and `tests/product-source-workflow.test.cjs` (registered in `scripts/test-manifest.json`) plus existing film, workflow and job-route tests |

## Compatibility and migration

- Existing storyboards without `productSource` and non-product films produce the same results.
- A product-promo project without a source record now stops at `source`; record the admitted
  product or the blocker. Its earlier passed checks reopen when the new inputs are hashed.
- Existing persisted job plans whose form changes under the widened classifier fail the existing
  deliverable-form conflict and must be re-planned from the original brief, then rebound with
  `next --job-plan`.
- Historical films, frozen scores and the Tern pair stay unmodified diagnostics in ignored
  `.design-pipeline/archive/cere-482/`. Fictional-product eval scenarios (`canvas-launch`,
  `cli-launch`) are unmeasured until a real product source is supplied.
- Non-software (physical) products have no repository and are blocked (`no-repository`); a
  physical-product source record is a follow-up, not part of this change.
- Rollback reverts this coordinated change; do not leave a bypass or optional-admission shim.
