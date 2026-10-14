# Tasks

## 1. Planning

- [x] 1.1 Write the proposal, design, spec delta and tasks from `openspec instructions <artifact>`; verified with `npm exec -- openspec validate owner-attention-asks --strict`.
- [x] 1.2 Independent review by an agent that did not write the artifacts, with every finding answered in the artifacts; verified by re-running strict validation after the revision.

## 2. Self-checks and web defaults (Decisions 1, 2, 3, 5)

- [x] 2.1 `roles.cjs`: add `checkpointOf`, use it in `defaultDelegation`, and default web `components`, `description` and `section` to the agent; verify with `workflow-next` tests that a new standard web map holds those three as `agent` and that stored owner entries survive.
- [x] 2.2 `nextAction`: convert those three when delegated and not director-routed into a `selfCheck` run with a per-checkpoint `check`, the record command `--by agent` (for a section, `--verdict accept` with no placeholder) and the correction command `--by owner`; verify with tests for a delegated section, a `--keep section` project that still asks, a `--director` section ask, and a `--delegate concept` project that keeps its ask.
- [x] 2.3 `recordSection` accepts when `next` is the section ask or a `selfCheck` run for it; verify that an accept passes on the self-check and fails with `WORKFLOW_NOT_READY` while the build run shows findings.
- [x] 2.4 `decide` refuses `--by agent --verdict reject` outside director picks, and a `--by agent` accept of a section or description whose latest record is an unchanged owner reject; verify each refusal leaves the state bytes unchanged and that the revised section is accepted.
- [x] 2.5 Intake delegation hint offers `--keep section` only where a `section` checkpoint exists; verify on standard web (named) and film (absent).
- [x] 2.6 Ask-count walk: drive the two-section brief-mode sample through `tests/helpers/web-flow.cjs` with the components, description and section calls recorded `--by agent`, and count owner asks (3); also the quick walk (1); update the helpers and the ask-shape tests that need `--keep`; verify with `node --test tests/workflow-next.test.cjs tests/workflow-action-commands.test.cjs tests/designer-pipeline-cli.test.cjs`.
- [x] 2.7 Docs and changelog: `workflow-web.md` (components, description and build sections: self-check by default, `--keep` to review), `SKILL.md` delegation lines, `stages.md`, and a CHANGELOG `[Unreleased]` entry; verify with the guide-sections test in `workflow-next` and by grepping that `workflow-web.md` names `--keep section`.

## 3. Trade-off asks and language (Decisions 4, 8)

- [x] 3.1 `cli-core.cjs`: register `--tradeoff` and pass it to `decide`, with help lines; verify that `decide --tradeoff` parses and an unlisted flag still fails with `UNKNOWN_OPTION`.
- [x] 3.2 Store `tradeoff` on owner role entries, refuse it with `--by agent`, and print it in the statement; verify with `workflow-next` tests for an accepted and a declined trade-off, the refusal, and the statement line.
- [x] 3.3 The self-check instruction names when to ask (component sources: new dependency, license obligation or notable cost) and the ask shape; every ask, including the no-state ask, and every self-check carries `language`; verify with `workflow-next` assertions.
- [x] 3.4 Docs and changelog: `workflow-web.md` trade-off asks and language, and the CHANGELOG entry extended; verify that the documented `--tradeoff` records run through the real CLI (`decideCli` in the `workflow-next` trade-off test).

## 4. Playback card and creative intent (Decision 9)

- [x] 4.1 `web.cjs` `CONVERSATION`: the card replaces the 200-300 word playback; verify that the intake instruction names the three intent lines and the delegation line.
- [x] 4.2 An owner-confirmed playback appends a `creative-intent` role entry, and the statement drops "planned in phase 2"; verify that confirming lists creative intent under the owner and that a skip lists it as not stated.
- [x] 4.3 Docs and changelog: the `workflow-web.md` intake section matches the code's skip line and card instruction (fixing the skip-line drift found while mapping); verify by grepping the guide for the exact skip line.

## 5. Rule scope and promotion (Decisions 6, 7, 10)

- [x] 5.1 Rule creation (`web.addRule`, the anti-goal path, and the sample and draft rejects) stores `scope`, `object` and `since`; validate `--scope project|object` and refuse it on calls that create no rule; anti-goal dedupe compares project rules only; verify a bad value and a misplaced `--scope` each exit 1 with no change, and that an anti-goal matching an earlier correction is added.
- [x] 5.2 `nextAction` returns active rules, with section and sample rules prefixed; verify that a section rule is returned before that section's acceptance and not after, and that a component-round rule holds until final acceptance.
- [x] 5.3 Review ask `ruleCandidates` (active and retired), and `--promote` (in `REPEATABLE_OPTIONS`) on the owner's review record; verify that a retired rule is promoted and returned again, that all rules sharing a `from` are promoted, and that an unknown `from` or `--by agent` is refused with no write.
- [x] 5.4 Reword "project rule" in the `web.cjs`, `workflow-core.cjs` and `shared.cjs` texts; the statement lists each rule's scope; update tests asserting `scope: "project"` and plain section rule texts; verify that `grep -rn "project rule" skill/scripts/workflows skill/scripts/workflow-core.cjs` finds only project-scope wording, and check the statement test lines.
- [x] 5.5 Docs and changelog: rules sections of `workflow-web.md`, `workflow-film.md` and `workflow-edit.md`, the diligence contents in `stages.md`, and the CHANGELOG entry; verify with the guide-sections test and a grep for `--promote` in `workflow-web.md`.

## 6. In-flight deltas (Decision 11)

- [x] 6.1 Edit the named `make-web-workflow-conversational` requirements in place, remove the two creative-intent requirements and tasks 3.x from `adopt-ai-fluency-decision-roles`, and note the edit in each design; verify with `npm exec -- openspec validate --all --strict`.

## 7. Integration

- [ ] 7.1 `npm test` and `npm run specs:check` pass locally (the known ffmpeg-only environment failure excepted); verify both exit codes.
- [x] 7.2 Mark design-owner-attention task 2.1 done, and move the deferred items (decide later, rule history edits, later delegation changes, cross-project ledger) into its phase 4 text; verify with `npm exec -- openspec validate design-owner-attention --strict`.

## Workflow follow-up

- Open the PR, address review findings, merge when CI is green.
- Archive after the in-flight chain (`make-web-workflow-conversational`, `adopt-ai-fluency-decision-roles`) archives.
