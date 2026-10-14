# Tasks

## 1. Self-checks and web defaults (Decisions 1, 2, 4)

- [ ] 1.1 `roles.cjs`: add `checkpointOf(state, stageId)`, use it in `defaultDelegation`, and default `components`, `description` and `section` to the agent; verify with a `workflow-next` test that a new standard web map holds those three as `agent` and that a project with stored owner entries keeps them.
- [ ] 1.2 `workflow-core.cjs` `nextAction`: convert an agent-delegated, non-director ask into a `selfCheck` run (keeping `show`, `questions`, `recommended` and `section`); verify with `workflow-next` tests for a delegated section, a `--keep section` project that still asks, and a `--director` project that keeps its routed ask.
- [ ] 1.3 `web.recordSection`: accept the section the self-check names; verify that a `--by agent` accept on the current section passes and that a section out of order still fails with `WORKFLOW_NOT_READY`.
- [ ] 1.4 `decide`: refuse `--by agent --verdict reject` outside director picks; verify that exit 1 leaves the state bytes unchanged.
- [ ] 1.5 Intake delegation hint offers `--keep section`; verify that the intake ask's `delegation.instruction` names it.
- [ ] 1.6 Update `tests/helpers/web-flow.cjs` and the existing ask-shape tests (keep the checkpoint where a test checks an owner ask); verify with `node --test tests/workflow-next.test.cjs tests/workflow-action-commands.test.cjs tests/designer-pipeline-cli.test.cjs` (explicit files, never bare `node --test`).
- [ ] 1.7 Docs: `workflow-web.md` (components, description and build sections: self-check by default, `--keep` to review), `SKILL.md` delegation lines, and `stages.md`; verify that `node scripts/qa.cjs` reports no doc-link or guide-anchor failures.

## 2. Trade-off asks and language (Decisions 3, 7)

- [ ] 2.1 `cli-core.cjs`: register `--tradeoff` and pass it, with `--scope` and `--promote`, to `decide`, plus help lines; verify that `decide --tradeoff` parses and an unknown flag still fails with `UNKNOWN_OPTION`.
- [ ] 2.2 `decide`/`stampRecord`: store `tradeoff` on owner role entries, refuse it with `--by agent`, and print it in the statement; verify with a `workflow-next` test for both cases and the statement line.
- [ ] 2.3 Self-check instruction names when to ask the owner (component sources: new dependency, license obligation or notable cost) and the ask shape; every ask and self-check carries `language`; verify with `workflow-next` assertions on the components self-check and the intake ask.
- [ ] 2.4 Docs: `workflow-web.md` trade-off asks and language, and the CLI help text; verify that the documented `--tradeoff` command runs in the test project.

## 3. Playback card and creative intent (Decision 8)

- [ ] 3.1 `web.cjs` `CONVERSATION`: the card replaces the 200-300 word playback; verify that the intake instruction names the three intent lines and the delegation line.
- [ ] 3.2 Owner-confirmed playback appends a `creative-intent` role entry; the statement drops the "planned in phase 2" line; verify that confirm lists creative intent under the owner and that a skip lists it as not stated.
- [ ] 3.3 Docs: `workflow-web.md` intake section; verify that its wording matches the code's skip line and card instruction (fixing the skip-line drift found while mapping).

## 4. Rule scope and promotion (Decisions 5, 6)

- [ ] 4.1 Rule creation (`web.addRule`, the sample and draft rejects) stores `object` and `since`; `--scope project|object` is validated; verify that a bad value exits 1 with no change.
- [ ] 4.2 Effective rules: `nextAction` returns active rules, with object rules labelled; verify that a section rule is returned before that section's acceptance and not after, while `state.rules` keeps it.
- [ ] 4.3 Review ask `ruleCandidates` and `--promote` on the owner's review record; verify promotion of one rule, refusal of an unknown `from` with no write, and refusal on `--by agent`.
- [ ] 4.4 Statement lists each rule's scope; verify the statement test lines for object, project and promoted rules.
- [ ] 4.5 Docs: `workflow-web.md` rules section and `stages.md` diligence contents; verify with `node scripts/qa.cjs`.

## 5. In-flight deltas (Decision 9)

- [ ] 5.1 Edit the named `make-web-workflow-conversational` requirements in place, remove the two creative-intent requirements and tasks 3.x from `adopt-ai-fluency-decision-roles`, and add a note to each design; verify with `npm exec -- openspec validate --all --strict`.

## 6. Integration

- [ ] 6.1 Walk the two-section standard sample with default delegation and count owner asks (expected 3); verify with a `workflow-next` test that drives the whole flow through `tests/helpers/web-flow.cjs`.
- [ ] 6.2 `npm test` and `npm run specs:check` pass locally (the known ffmpeg-only environment failure excepted); CHANGELOG `[Unreleased]` entry; verify both commands' exit codes.
- [ ] 6.3 Mark design-owner-attention task 2.1 done and move the deferred items (decide later, rule history edits, later delegation changes, cross-project ledger) into its phase 4 text; verify with `npm exec -- openspec validate design-owner-attention --strict`.

## Workflow follow-up

- Independent review of these artifacts by an agent that did not write them, before implementation.
- Open the PR, address review findings, merge when CI is green.
- Archive after the in-flight chain (`make-web-workflow-conversational`, `adopt-ai-fluency-decision-roles`) archives.
