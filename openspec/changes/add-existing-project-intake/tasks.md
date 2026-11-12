# Tasks

Behaviour: the spec. Rules: `design.md`. Verification: `node scripts/qa.cjs` only.

- [x] Shrink proposal, design, spec and tasks to Phase 1 (instant prompt); `openspec validate
  add-existing-project-intake --strict` passes.
- [x] `skill/scripts/existing-project-core.cjs` (read-only `inspectHost`, `hostWorkCommand`) and its line in
  `skill/references/package-resources.json`.
- [x] `skill/scripts/workflow-core.cjs`: host-first `work` action when `package.json` exists; `line` uses the first
  line of `command`; a new project keeps today's text.
- [x] `tests/workflow-next.test.cjs`: existing-project fixture (paths, order, checks, missing markers, quotes, no
  writes, rediscovery) and caps (25 docs, 3 quotes per file, full tier keeps OpenSpec).
- [x] `CHANGELOG.md`.
- [x] `node scripts/qa.cjs` exit 0; smoke `next --deliverable ui --tier quick` on a `git archive` copy of KATANAview
  `d08c06a`; greenfield `ui` output byte-identical to before at quick, standard and full.

Pending, not part of this change: the real-model trial; the user's approval; persistence and staleness (proposal:
Later).
