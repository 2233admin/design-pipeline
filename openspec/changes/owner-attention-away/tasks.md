# Tasks

## 1. Planning

- [ ] 1.1 Proposal, `design-pipeline` delta, design and tasks; `npm exec -- openspec validate owner-attention-away --strict`.
- [ ] 1.2 Independent review; answer every finding; re-validate.

## 2. Decide later (Decisions 1–3)

- [ ] 2.1 `decide --later [--until]` (CLI options, `deferAsk`), the deferred `blocked` result in `nextAction`, and its end on time, basis change, another ask or any recorded decision; verify in `workflow-next` (deferred final review until a time, page change wakes it, answer ends it, refusals).

## 3. Catch-up (Decision 4)

- [ ] 3.1 `away` on owner asks from the agent's role entries and gates since the owner's last decision; verify in `workflow-next` (self-checks listed; nothing in between gives none; no owner decision yet gives none).

## 4. Docs and integration

- [ ] 4.1 `workflow-web.md`, `stages.md` or `pipeline-reference.md` where `next` and `decide` are described, CLI help and reference, CHANGELOG, `design-owner-attention` (phase 4 split; 3d done); `npm test`, `npm run specs:check`.

## Workflow follow-up

- Open the PR, address review findings that normal use can hit, merge when CI is green.
