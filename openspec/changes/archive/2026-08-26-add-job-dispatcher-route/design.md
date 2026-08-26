# Design: job dispatcher

## Extension point

`skill/references/job-registry.json` is the only place a new capability is registered for Stage 0.

A job records:

- `id` and `activation` (`explicit`, `scored`, or exactly one `default`)
- `priority` for explicit ties
- `keywords`
- `primaryKnowledge` (catalog id, CLI family/action, admission)
- `secondaries` (reference-only, never a second primary)
- `kernel` commands that always run

Adding a feature does not add a Stage 0 search. It adds a job. Unknown jobs, missing fields, duplicate
ids, and missing default fail closed.

## Classification

1. Score jobs by substring keyword hits on the brief (case-folded; CJK preserved).
2. If any `explicit` job scores above zero, the unique top explicit job wins. Equal score plus equal
   priority is `needs-clarification`.
3. Otherwise the unique top `scored` job wins, with the same tie rule.
4. Otherwise the `default` job wins with low confidence.
5. Ready routes attach kernel commands and list `next` CLI steps. Catalog hits stay inert until
   admission allows execution.

## CLI

`designer-pipeline route --query "<brief>" --json` returns
`design-pipeline.job-route.v1`. Status `ready` exits 0; `needs-clarification` and `blocked` exit 2.
Existing `mengto`, `prism`, `designmd`, `design-system`, and `component` commands stay public.

## Stage 0

SKILL.md runs `route` first and forbids opening every catalog. Capability-routing.md points at the
registry instead of listing peer primaries as mandatory searches.
