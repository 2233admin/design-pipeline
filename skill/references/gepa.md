# Independent GEPA guidance optimization

Use this supporting tool when the user wants to improve a bounded design prompt or skill
instruction by running comparable cases. It runs separately from normal design production.
Start with one instruction and a declared editable scope, frozen cases, an evaluator, explicit
inference configuration and an evaluation budget. Search produces a reviewable proposal.

The complete official [gepa-optimize-anything skill](../vendor/gepa/upstream/.claude/skills/gepa-optimize-anything/SKILL.md)
is bundled at reviewed revision `462e437a09be67d2acb59564cc0ea59132f5777c`, reviewed on
2026-10-09. Its seven files, root README, package metadata and
[MIT license](../vendor/gepa/upstream/LICENSE) preserve original bytes; Copyright © 2025
Lakshya A Agrawal. [manifest.json](../vendor/gepa/manifest.json) records the selected source
scope, root Git tree and individual blobs. Only that source skill and metadata are bundled;
the optional Python runtime is installed at the exact same revision.

Read the source's [evaluator guidance](../vendor/gepa/upstream/.claude/skills/gepa-optimize-anything/references/writing_evaluators.md)
when constructing a task, [API reference](../vendor/gepa/upstream/.claude/skills/gepa-optimize-anything/references/api.md)
for native options, [gotchas](../vendor/gepa/upstream/.claude/skills/gepa-optimize-anything/references/gotchas.md)
for debugging, and [tracking](../vendor/gepa/upstream/.claude/skills/gepa-optimize-anything/references/tracking.md)
for inspecting search. The maintained [callable tool](../tools/gepa/optimize.py) selects only
the native GEPA backend. Upstream alternative engines, default models, global installs,
plugin installation and dependency commands do not change the user's authorized scope.

## Run an integration study

Python 3.10–3.14 and the [pinned requirements](../tools/gepa/requirements.txt) are needed only
for this tool. Prepare an isolated task environment with the user's usual Python tooling;
`uv` can resolve the exact dependency on the first explicit run. The bare requirements support
the included deterministic proposer and caller-provided callables. A `reflection_lm` model
string also needs LiteLLM and tenacity in the task environment, using the compatible ranges in
the bundled [package metadata](../vendor/gepa/upstream/pyproject.toml). Provider calls need the
caller-selected model and its environment credentials; keep credentials out of task source
and exported feedback. The included study uses no model service.

Install from the pinned Git requirements, including when reusing a prepared environment.
The helper compares the installed distribution's exact Git commit from
[direct URL provenance](https://packaging.python.org/en/latest/specifications/direct-url-data-structure/)
with the bundled source manifest before loading GEPA. An unreviewed version or an installation
without that provenance fails before creating experiment output; a package version label alone
does not establish the reviewed commit.

From the user's project, set `skillRoot` to the installed skill directory and run:

```powershell
uv run --python 3.14 --with-requirements "$skillRoot/tools/gepa/requirements.txt" python `
  "$skillRoot/tools/gepa/optimize.py" `
  --seed "$skillRoot/tools/gepa/seed.md" `
  --task "$skillRoot/tools/gepa/synthetic-task.py" `
  --run-dir ".design-pipeline/gepa/native-smoke" `
  --max-evals 20
```

With an already prepared environment, invoke its Python directly with the same arguments.
Choose a new run directory each time. The helper rejects an existing directory before loading
the task and keeps failed-run output for diagnosis. It does not resume external serialized
state or install dependencies itself.

The synthetic study validates native evaluation, feedback-driven proposals, candidate selection,
parent history, final-test separation and export. Its scores do not measure rendering,
Component Conformance or Visual Acceptance.

## Supply a real design evaluator

Replace the synthetic task with a trusted, project-owned Python module exporting:

| Export | Meaning |
| --- | --- |
| `evaluator(candidate, example)` | Run the existing agent/renderer with the candidate guidance; return a finite higher-is-better score and an exportable diagnostic dictionary without NaN or infinity |
| `dataset` | Nonempty training fixtures; each is a JSON-compatible dictionary with a unique nonempty string `id` |
| `valset` | Distinct validation cases used to compare and select candidates |
| `test_set` | Distinct final-test cases kept outside search and selection; keep expected answers evaluator-only |
| `objective` | The bounded improvement sought and the allowed changes |
| `reflection_lm` or `custom_candidate_proposer` | An explicitly selected native model/callable, or a proposer with GEPA's documented signature |
| `background` | Optional relevant constraints and context for reflection |

All fixture ids must be unique within and disjoint across the three splits. Use genuinely
different cases; relabeling one case does not establish generalization. Keep the model, actual
model identity, common prompts, reference inputs, runtime, evaluator and required checks fixed
between seed and candidate runs. A fresh execution context and unchanged private expectations
protect the comparison; reuse [benchmark fairness](benchmark-manifest.schema.json) where
applicable. The maintenance repository's `evals/cases/` library is a private answer key,
not instructions to reveal to the production model; that library is not packaged as a
downstream runtime dependency.

For each candidate, collect actual deliverables, source/output hashes, execution failures and
applicable existing gate results. Return actionable feedback: the specific output, difference,
failed check and next useful observation. Visual feedback needs real reference/render images,
comparable view/time/light and motion playback; paths or a gate pass cannot substitute for
observing the result. Reuse [visual calibration and RSI](feedback-loop.md#visual-calibration-and-rsi).
Required failures and unknown evidence stay visible regardless of the aggregate search score.

Task modules and callbacks are trusted executable Python, not a sandbox. They own model calls,
generation, rendering and their outputs. Run them in an isolated task workspace with explicit
file scope and callback/process timeouts. The helper checks input hashes for drift; it cannot
undo arbitrary callback side effects. Runtime absence fails clearly without affecting normal
pipeline use. Missing or unknown quality evidence cannot be scored as success.

## Budget and inspect

`--max-evals` is a positive finite cap on search evaluation calls. Allow enough calls for the
seed, repeated proposals and validation of each candidate. Native final-test evaluation runs
outside that cap: the seed baseline before search and the best candidate afterward (the same
baseline is reused if the candidate is unchanged). Model tokens, rendering
cost and wall time require separate caller limits; evaluation count is not a total-cost cap.
Parallel execution and evaluation caching are disabled by this entry.

The fresh run contains a seed copy, hashed input/budget record, native search/evaluation output,
selected guidance, unified diff and native result including final-test metadata. Read the
candidate pool and parent history, inspect concrete failure feedback and compare final-test
seed/best results. Preserve ties, regressions and failed runs. Final-test results are private
evaluation evidence, not another source of feedback for a new round under the same test set.

Search scores are proposals. **Component Conformance** requires existing applicable checks;
**Visual Acceptance** requires the owner's actual scoped decision. A higher score changes
neither status automatically.

## Adopt through the existing maintainer loop

1. Inspect the candidate diff and evidence against the original editable scope and invariants.
2. Independently compare seed/candidate with applicable replay and final-test cases, preserving
   actual outputs, model attribution and failures; calibrate any visual judge against real review.
3. Record reusable findings with the existing feedback recorder and link an OpenSpec change
   before modifying packaged guidance. Apply the smallest demonstrated improvement and retain
   a regression check; [maintainer self-hosting](feedback-loop.md#maintainer-self-hosting-loop)
   handles adoption, QA and publication authority.
4. Preserve target, snapshot, source, policy digest and receipt lineage. Changed upstream inputs
   require recomputation or invalidation of downstream evidence; earlier outputs remain available.

The helper never writes a live installed skill, evaluation criteria, constraints, gates or
policy digests. [Bounded adaptation](adaptation.md) remains limited to its finite project/user
collaboration rules and independent promotion lifecycle; arbitrary optimized guidance does not
become an adaptation rule or approved release merely because search finished.
