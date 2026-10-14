## 1. Change records

- [x] 1.1 Write proposal.md, design.md and the `design-pipeline` spec delta (ADDED requirements only).
- [x] 1.2 `npm exec -- openspec validate adopt-ai-fluency-decision-roles --strict` is valid and
  `npm run specs:check` passes (28 passed, 0 failed).
- [ ] 1.3 Archive after `make-web-workflow-conversational` and its chain; this change edits the code
  that chain adds.

## 2. Phase 1: decision roles and diligence (Decisions 1, 2, 3, 6; director routing from 5)

- [x] 2.1 `workflow-core.cjs`: `state.delegation` defaults per deliverable and tier (design.md
  table), `--director` defaults, locked checkpoints, filling a missing map on `next`.
- [x] 2.2 Intake records in `workflows/{web,film,edit}.cjs` apply repeatable `--delegate`/`--keep`;
  stated skip and quick stated decision record `intake` as agent; the web playback instruction names
  what the agent decides.
- [x] 2.3 `decide` requires `--by owner|agent`; refuses agent on owner and locked checkpoints; writes
  `by`/`agent` on every history entry.
- [x] 2.4 Add a locked owner `review` stage to web quick (after `probe`, in `workflows/web.cjs`),
  edit quick (after `check`), and to ui at every tier (after `work`, in `workflow-core.cjs`
  `codeStages`), reusing the shared final review; `reviewInputHashes` binds ui's work evidence.
- [x] 2.4a `--director` stops routing the `review` ask; a director note is an agent `drafts[]` entry
  with `verdict: "recommend"`.
- [x] 2.5 `direction-preview-core.cjs`: `decision.by`/`agent`/`delegation` (`workflow-state` with
  `stateSha256`, or `owner-instruction` with a quote); selection fails on missing `by`, missing
  agent delegation, or a verified state that keeps `concept` with the owner; `direction check`
  accepts `--project-root`; `direction-preview.md` replaces "bounded autonomous selection".
- [x] 2.6 `surface-design-artifacts-core.cjs`: `selectedBy` on the selection receipt and in
  `RECEIPT_KEYS`; no `user-selected-template` default when `selectedBy` is `agent`; `approval.by`.
- [x] 2.7 `next --assisted-by`; statement renderer; delivery writes `diligence.md` bound to the
  state hash, `deliveryInputHashes` and, for files, `deliveredSha256`; stale detection reuses the
  `shared.cjs` delivery-current check; read-only `diligence [--write]` command.
- [x] 2.8 `cli-core.cjs`: register `--by`, `--delegate`, `--keep`, `--assisted-by` in
  `KNOWN_OPTIONS`; COMMANDS entry and help for `diligence`.
- [x] 2.9 Tests in existing suites: `workflow-next` (delegation, `--by` refusals, locked review,
  director routing, statement and staleness), `workflow-action-commands`, `direction-preview`,
  `surface-design-artifacts`, `designer-pipeline-cli`; shared `tests/helpers/web-flow.cjs` passes
  `--by owner`.
- [x] 2.10 Docs: `SKILL.md` (when to claim owner, pass `--assisted-by`), `stages.md`,
  `workflow-web.md`, `pipeline-reference.md`, CLI help, CHANGELOG `[Unreleased]`.

## 3. Phase 2: creative intent (Decision 4)

Superseded by `owner-attention-asks`: creative intent is the playback card the owner confirms, with no
fifth intake question and no `Product Context` label check. The tasks and their two requirements
were removed from this change.

## 4. Phase 3: discernment (Decision 5 reasons, Decision 7)

- [ ] 4.1 Owner variant pick and final acceptance require a three-word reason; `recommended` stored
  beside owner records when a director recommended.
- [ ] 4.2 Optional retrospective question on the done action; answers go through
  `adaptation record` only.
- [ ] 4.3 Tests: `workflow-next`, `web-concept-screening`, adaptation suite for the shadow candidate.
- [ ] 4.4 Docs and CHANGELOG.

## 5. Verification

- [ ] 5.1 `npm test` passes, including "QA leaves repository status byte-identical".
- [ ] 5.2 Real CLI smoke in a scratch project: a standard web flow to `done` with `--director`
  showing an agent section decision, an owner final acceptance and a rendered `diligence.md`; a
  quick web flow and a ui flow, each ending with the owner's acceptance before delivery.
- [ ] 5.3 Dogfood on KATANAview: run one standard web change and attach its `diligence.md` to the
  PR.
- [ ] 5.4 CI green on each phase PR.
