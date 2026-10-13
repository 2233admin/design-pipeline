# Verification — verify-menu-business-state

## Result

PASS. Native completion verifies declared ordered menu states and returns snapshot-bound repair findings. The real implementing agent's output passed, a labeled selection fault was detected, and the same agent repaired it before an independent unchanged-probe rerun passed. Focused checks, full repository QA and strict specs passed. Component Conformance and Visual Acceptance remain separate; no owner acceptance has been recorded.

## Focused checks and independent review

| Check | Result | Evidence under ignored `.design-pipeline/menu-loop-20261008/` |
| --- | --- | --- |
| Ordered capture/evaluation/CLI, including legacy motion and origin guard | PASS, 49/49, zero skips | `journey-origin-threefiles-green.txt` |
| Origin counterexample before shared guard repair | Expected RED, 0/1 | `journey-origin-red.txt` |
| Native workflow and progress state, including scope/CAS/hashes, incomplete or forged states, changed-byte reset, repeated-next and missing-tool controls | PASS, 94/94, zero skips | `runtime-tmp/native-final.txt` |
| Documented probe/plan validation and equality with frozen actual-trial probe | PASS | `docs-example-check.json` |
| Independent runtime and trial review | PASS after origin fix; no remaining blocking findings | `/root/verification_diff_review` reviewed the shared origin guard, strict ordered coverage, legacy compatibility, actual failure/repair reports, frozen hashes, scope and provenance |

The reviewer reproduced a missing-origin capture that could skip external-resource findings. Its failing check now passes after validating the declared journey origin in the shared evaluator. A legacy-only positive control preserves prior motion compatibility. Typed fixture observations establish contract rejection; they are not described as model output or real browser observations.

## Actual agent provenance and trial

The frozen task is an owned ignored Git window at `real-agent/menu-task/`, with brief, plan, interaction probe and QA guide fixed before dispatch. Only `index.html` and `implementation.md` belong to the implementing agent. The maintained guide's exact eight-step probe is used unchanged.

The installed OMP request returned HTTP 401 (invalid token), exit 1, zero tool calls and no implementation files. Evidence is retained in `real-agent/proof/final-task/attempt-01/`. No provider configuration or credentials were changed. The successful implementation instead came from the actual collaboration worker `/root/menu_component_builder`; its exact model identifier is not exposed by the tool. `collaboration-provenance.json` records this distinction. Scripted documentation and test fixtures are not substituted for that output.

| Observation | Result | Evidence in `real-agent/proof/final-task/` |
| --- | --- | --- |
| Original agent output, independent native Chrome check | PASS, eight ordered steps, native exit 0; exact-version visual review pending | `initial-agent-native.json`, `initial-agent-interaction.json`, `initial-agent-index.html` |
| Deliberately disable selection readout update after original success | Host fault injection, not an original agent defect | `fault-injection.json` |
| Complete edited output before new dispatch | BLOCKED, native exit 2, missing task baseline; prior evidence stale | `injected-fault-native.json` |
| Rebind current owned task window with native next | Dispatched; same frozen inputs | `injected-fault-dispatch.json` |
| Measure injected selection defect with actual Chrome | Expected FAIL, native exit 2, three `state-mismatch` findings; attempts 1 | `injected-selection-native.json`, `injected-selection-interaction.json` |
| Same agent repairs actual findings; independent unchanged-probe rerun | PASS, eight ordered steps, native exit 0; exact-version visual review pending | `repaired-agent-native.json`, `repaired-agent-interaction.json`, `repaired-agent-index.html` |

The first blocked attempt's `injected-fault-interaction.json` is an unchanged copy of the previous passing report, not a new capture or failure measurement. The later `injected-selection` report is fresh and failed: `choose`, `keyboard-select` and `escape` expect `#selection-value` text `按更新时间` but observe `默认顺序`. Native next returns those typed actual/expected values, the failing step/selector and a concrete repair hint. Old HTML/report receipts become stale when implementation bytes change.

The same actual collaboration worker read those reports and restored the shared selection transition's `readout.textContent = selected.textContent`. Its only other edit was the authorized implementation note. Independent native completion then captured all eight steps again, bound fresh report receipts to the unchanged frozen inputs and restored output bytes, and returned `technicalCompletion: passed` with `visualAcceptance: not-evaluated`. Restoring identical original HTML does not reuse the old report: the new report hash is `71b3c37b7a14bfe59b8ab72354f7f2a6e5b6c12d39f17a3dcf07ce88ca912182`.

## Historical working-tree integration checks

| Check | Result | Evidence under ignored `.design-pipeline/menu-loop-20261008/` |
| --- | --- | --- |
| `npm test` | PASS, exit 0: repository suite 1031/1031, installed-package CLI 12/12, both with zero failures/skips; two browser-tool self-tests passed | `npm-test.log`, `qa-result.json` |
| QA preserves repository status | PASS, before/after status bytes identical; wrapper independently compares them | `status-before-full.bin`, `status-after-full.bin`, `qa-result.json` |
| `npm run specs:check` | PASS, 50/50 strict items, zero failed | `specs-check.log` |
| `git diff --check` | PASS | `diff-check.log` |

The full repository suite took 511,060 ms; installed CLI checks took 16,616 ms. No skipped tests substitute for unavailable behavior. Existing unrelated working-tree edits were preserved. The QA installation is isolated; it does not replace the user's global skill installation. Only verification documents/task completion markers were finalized after runtime QA.

A fresh initial-state screenshot and element capture are retained at `real-agent/proof/final-task/preview/` using the existing composition capture tool. They help inspect the actual output and are not an artistic acceptance verdict.

## Exact publication candidate

The candidate is `codex/harness-verification`, based on remote `improve-beta-motion` revision
`f6ac26cb6ceb7dd01e605836d27f0054689fb8a9`. It includes the five connected harness changes,
26 selected existing files and one root `.gitignore` exception. Independent frontend-redesign,
film/reference studies and raw local logs remain outside publication. Original working-tree
1031/50 results above include those independent changes and do not stand in for this candidate.

The first candidate run had 1029/1029 repository tests and 12/12 installed CLI tests passing,
with zero skips, but `npm test` exited 1 because the existing tracked-ignored-file audit found
the remote branch's newly committed `layout.bin` matched a personal `*.bin` rule. Browser-tool
self-tests were not reached after that failure. The precise root ignore exception preserves
the upstream file and audit. Proof is retained in the original ignored study workspace under
`.design-pipeline/menu-loop-20261008/publication/first-run/`.

| Final publication check | Result | Evidence under original ignored `.design-pipeline/menu-loop-20261008/publication/` |
| --- | --- | --- |
| `npm test` | PASS, exit 0; repository tests 1029/1029 and installed CLI 12/12, zero failures/skips; both browser-tool self-tests passed | `npm-test.log`, `qa-result.json` |
| Candidate Git status before/after QA | PASS, byte-identical, independently compared by the wrapper | `status-before-full.bin`, `status-after-full.bin`, `qa-result.json` |
| `npm run specs:check` | PASS, 49/49 strict items, zero failed | `specs-check.log` |
| `git diff --check` | PASS | `diff-check.log` |
| Independent publication review | PASS; exact ignore exception, intact remote source/fixes, complete harness dependencies and excluded unrelated/private changes | `/root/push_dependency_review` |

The final candidate's repository suite took 542,168 ms and installed CLI checks took 19,532 ms.
Runtime code stayed frozen across the rerun; only task completion markers and this verification
record were finalized afterward. The root ignore exception is for one existing tracked file;
another binary in the same directory remains ignored by the personal rule. Source bundles and
locks are unchanged. The two independent frontend tests were excluded with their separate
runtime change, explaining the difference from historical 1031-test working-tree results.

## Coverage limits

The journey uses real click/keyboard input and end-of-window literal DOM observations in one page. It establishes initial closure, opening, selecting a displayed value, closing, reopening, keyboard selection, Escape and focus recovery. It does not establish underlying data sorting, backend persistence, complete accessibility, click reachability for every geometry or screenshot fidelity. No new runner, gate, receipt schema, target resolver, policy digest or dependency is added. The three-identical-snapshot stop-repeating hint is verified by native workflow tests; it is not claimed as three runs by the real implementing agent.

Final owner Visual Acceptance requires the existing exact-version review reply. A passed browser gate does not grant creative acceptance or advance through that decision.
