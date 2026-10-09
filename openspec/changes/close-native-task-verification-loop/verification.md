# Native task verification

Date: 2026-10-08. Change: `close-native-task-verification-loop`.

## Implemented boundary

The existing native `next`/`decide --verdict complete` path now owns one supported local-web
interaction loop. Dispatch freezes the task's Git baseline and original authorization. Complete
runs the shared browser capture/evaluator, writes interaction-result.v1 measurements and generates
artifact.v1 metadata at the returned `<task-id>-completion.json` destination. Caller reports,
metadata and receipt labels cannot replace execution. Existing project-root verification retains
its own report/state ownership; scope inspection never invokes worktree cleanup.

Bindings are strict optional design-plan.v1 data; legacy plans and records remain readable but
cannot advance without observed completion. Inputs, outputs, plan, reports, native CAS and scope
are checked again after capture and after evidence writes. Exact-version owner review remains
separate. The native task example in the stage guide includes an executable local-page binding rather than a
report-only screenshot check.

The check counts below describe the original development working tree. The exact publication
candidate and its separate integration results are recorded in
`../verify-menu-business-state/verification.md`; independent frontend and film study edits are
excluded from that candidate.

The existing component-eval consumer now uses the same explicit binding and native
completion before owner review. Its owned benchmark Git window covers promoted declared outputs in runRoot;
attempt scratch and the host's plan projection are excluded. Model writes inside that scratch
retain the existing frozen-input/scope checks and are not claimed as Git-enforced write containment.
Native control and evidence protections are not relaxed for this consumer.
All output destinations are checked for aliases before any promotion copy. The generated native
metadata and measured artifacts are sealed into the existing attempt artifact manifest; a fresh
completion cannot transfer a previous displayed version's owner authorization to a new version.

## Independent public CLI proof

Final proof directory: `.design-pipeline/native-loop-159e8e03/native-cli-independent-round2/`.
`commands.json` records actual public CLI arguments, exits and returned results;
`SUMMARY.json` records seven passing scenarios. The earlier `native-cli-independent-round1/`
`timeout-commands.json` and `timeout-SUMMARY.json` record the eighth scenario; the final guard runs
after browser launch and does not alter the existing launch timeout.

| Scenario | Actual observation |
| --- | --- |
| Real browser completion and owner review | Chrome measured 26 frames; complete returned the exact review snapshot; acceptance led to done, with Visual Acceptance still not-evaluated at the harness level. |
| Original self-written-pass counterexample | Correct artifact hashes plus a passed `checks` report did not authorize the broken page. Real Chrome measured 25 frames, reported `dead-interaction`, overwrote the report with a failed interaction-result.v1 and returned exit 2. |
| Original scope counterexample | Another task's file and an outside file both blocked completion. Repeated next and an expanded plan stayed blocked; the frozen active window remained identical. |
| Missing tool | Explicit missing dependency blocked promotion; no completed record or generated report. |
| Incomplete measurement | A clearly labelled dependency fixture returned two frames; the existing capture rejected it, with no promotion. This is a failure-path test, not a browser quality claim. |
| Metadata/input collision | A same-name bound input blocked before capture and retained its bytes. |
| Actual outer timeout | A clearly labelled pending-launch dependency fixture was terminated by the existing 60,000 ms kernel deadline. Total CLI time was 61,434 ms; exit 2 with ETIMEDOUT, no report/completion, active baseline retained. |

Real-browser testing also found a further false pass: JS and meta redirects navigated from the
declared local output to an undeclared page, while the capture labelled measurements with the
requested URL. Both counterexamples were reproduced through the public CLI, then rejected after
the shared capture checked the actual canonical local page after navigation and sampling. Final
`redirect-proof/green/{SUMMARY,commands}.json` records exit 2 and no report or completion for both.
Capture tests also reject hardlink aliases and remote destinations while retaining same-page
fragments, Windows path casing and existing remote verification behavior.

Independent read-only review also reproduced and verified repairs for late scope changes after
metadata writes, canonical review output paths, and Windows equivalent-root identities. The late
write proof used the trusted capture seam to test transaction ordering; it does not claim browser
behavior coverage. Regression tests inject outside/output/report changes at that same boundary.

## Focused checks

All new logical branches have runnable checks in existing manifest-listed test files. Logs stay
under the ignored proof directory, with worker scope logs in
`.design-pipeline/native-scope-task11-20261008/`.

- Plan/state contracts: 29 tests passed, including legacy readability, strict descriptor binding,
  active/observed state data and malformed snapshot/scope rejection.
- Shared browser CLI/capture: 17 tests passed, zero skips; real responding and nonresponding pages,
  actual measured target binding, redirect controls, protected-file aliases and missing-tool recovery.
- Native workflow focused runs verified frozen scopes, nested Git coordinates, non-Git/cross-root
  rejection, unchanged dirty work, expanded-scope rejection, legacy/probe/report invalidation,
  all bound-file aliases, metadata role collisions, execution-time drift, native CAS conflict,
  late evidence-write drift, retries and scoped owner review.
- Git scope checks cover index-only MM drift, unmerged stages, commit/revert paths, rename endpoints,
  deletion/untracked/mode/link changes, changed branch/history/root, snapshot coherence and preserved
  inspection versus existing finalizer cleanup. All 29 tests passed, zero skips, in the same long
  scratch-path and isolated-home environment as full QA. A missing Git revision/path delimiter was
  independently reproduced and repaired without changing scope or cleanup semantics
  (`scope-revision-path-fix/{revision-disambiguation-red,hermetic-29-green}.txt`).
- The non-Git fixture is now isolated from ancestor repositories using Git's discovery ceiling.
  The previously failing case passed in an isolated home under the maintenance repository
  (`workflow-nongit-isolated-green.log`); no runtime scope rule was relaxed.
- Component-eval's final run passed all 17 cases, zero skips, using real native browser verification
  for completion, rejection/rework and recovery (`component-eval-proof/component-file-final-green.txt`).
  Promotion aliases preserve protected bytes before any copy, and a fresh public completion rejects
  an old displayed version's review without recording an accept. Existing interrupted accept/reject
  decisions remain idempotent on the exact original evidence.

## Repository checks

Final checks passed:

- `npm test`: exit 0; all 1,015 repository tests across 109 manifest-listed files passed,
  plus all 12 installed-package CLI tests and both browser adapter/BuilderPort self-tests.
  Repository and installed test runs reported zero skips. Packaging, reproducibility and isolated
  installation checks also passed (`npm-test.log`).
- `qa-result.json`: `testExit: 0`, `statusUnchanged: true`, `error: null`.
  Both the QA runner and the independent wrapper confirmed byte-identical Git status before/after.
- `npm run specs:check`: exit 0, 49 passed and zero failed (`specs-check-final.log`).
- `git diff --check`: exit 0. An unrelated existing CRLF normalization warning was retained;
  that file was not rewritten for this check.

The initial full QA run was intentionally interrupted to fix the real-page redirect counterexample;
its partial log is retained as `npm-test-initial-interrupted.log` and is not a passing result.
The subsequent full run recorded 1,000 passed and 11 failed repository tests, zero skips,
and unchanged Git status (`npm-test-compatibility-red.log`, `qa-compatibility-red.json`). It exposed
remaining report-only evaluation consumers, Git revision/path ambiguity under long Windows scratch
paths, and a non-Git fixture inheriting the QA home's ancestor repository. Those compatibility
failures were repaired before the subsequent complete runs.
After those repairs, the next full run recorded 1,014 passed and one failed repository test,
zero skips. All changed workflows passed, as did packaging and all 12 installed-package CLI tests;
the single failure was EPERM renaming an existing palette fixture's temporary directory
(`npm-test-windows-rename-red.log`, `qa-windows-rename-red.json`). The run retained unchanged
Git status. It is retained as a failed run alongside the final successful full run.

The palette initializer's intermittent Windows rename failure remains undiagnosed. Under the same
QA environment, its existing 12-test file reproduced EPERM in a different case (11 passed,
one failed); both affected cases then passed targeted verification. The initializer uses synchronous
filesystem writes, and the observed source/target/child paths were below the Windows length limit.
No palette source or tests were changed. The successful final full run does not establish a root-cause
repair for this intermittent failure (`palette-rename-triage/{palette-hermetic,palette-targeted-controls}.txt`).

The full run uses the resolved Node 26.3.1 executable, existing browser resolver and owned temporary
storage. Machine-specific paths remain in ignored logs and environment configuration.

## Coverage and trust limits

Scope measures tracked and non-ignored untracked working files, separate index OID/mode/stage data,
and every visible commit's changed paths in the preserved window. It does not subtract dirty names,
use another task's scope or erase a failed window. Non-Git/unmerged/unobservable/replaced-history
windows block scope verification. Unchanged pre-existing edits are preserved.

An owned execution window is required. Git cannot attribute simultaneous writers, observe ignored
or outside-repository writes, or prove that an uncommitted write was restored before inspection.
Installed verifier code and selected dependencies are assumed trusted. A builder with permission
to rewrite the harness, local state and records can rewrite local claims; adversarial provenance
requires independent host/CI execution on the exact snapshot with protected records.

Interaction checks cover only their declared measurements. They do not establish screenshot
fidelity, complete business journeys, Component Conformance or owner Visual Acceptance. Broader
verifiers remain unsupported in this slice. No new packaged runner, receipt family, resolver or dependency
was introduced; original receipt/target lineage and unrelated working-tree edits are preserved.
