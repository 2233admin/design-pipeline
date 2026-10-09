# Native GEPA supporting tool

Read [the task guide](../../references/gepa.md) for evaluation and adoption boundaries.
Use a task-local Python environment (Python 3.10–3.14), then install [requirements.txt](requirements.txt).
Before importing GEPA or creating output, the helper requires installed Git provenance
matching the reviewed revision in [the source manifest](../../vendor/gepa/manifest.json).
Unattested wheel/local-source installations and shadowed package imports are refused.

```sh
python -m pip install -r "<skill-root>/tools/gepa/requirements.txt"
python "<skill-root>/tools/gepa/optimize.py" \
  --seed "<skill-root>/tools/gepa/seed.md" \
  --task "<skill-root>/tools/gepa/synthetic-task.py" \
  --run-dir "<project>/.design-pipeline/gepa-smoke" --max-evals 16
```

The synthetic task executes real native GEPA search with a deterministic proposer that
consumes execution feedback. It requires no model credentials and proves integration only.
Bare runtime requirements cover this callable smoke. Model-name strings additionally need
the optional LiteLLM and tenacity versions allowed by the pinned upstream
[pyproject.toml](../../vendor/gepa/upstream/pyproject.toml), installed in the task environment.

A trusted Python task module supplies `evaluator(candidate, example) -> (score, side_info)`
with a finite score and JSON-safe diagnostic dict, nonempty JSON lists `dataset`, `valset`,
`test_set` with unique disjoint string `id` fields,
a nonempty `objective`, and exactly one explicit `reflection_lm` (callable or model string)
or `custom_candidate_proposer`. `background` is optional. Callbacks execute trusted Python;
the helper is not a sandbox. Keep provider credentials in the process environment.

All four CLI options above are required. Outputs must be new directories outside the packaged
skill. Seed/task files and in-memory split hashes are checked before and after execution.
The helper exports `seed.md`, `inputs.json`, `best-candidate.md`, `candidate.diff`, `result.json`,
`native.log`, and native `state/` and `evaluations/`. Failed runs keep `result.json`, `error.txt`
and available native evidence. Existing directories are refused; v1 has no resume option.

`result.json` preserves native candidates, parents, evaluation counts and `metadata`, including
baseline and selected final-test scores, plus the verified runtime version and revision.
Final-test evaluator calls are outside `--max-evals`;
callback model/rendering costs and wall time remain caller-owned. Cache, parallel evaluation
and cloudpickle are disabled. Every output is a proposal: Component Conformance and
Visual Acceptance are both `not-evaluated`. No installed guidance is promoted or rewritten.
