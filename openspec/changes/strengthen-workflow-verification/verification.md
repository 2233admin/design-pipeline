# Verification

This change borrows pstack's actual-surface verification method and applies it to existing workflow gates, review and delivery. It adds no runner, gate schema or dependency. Pre-existing frontend/reference/film guidance edits remain in place.

## Performed checks

- Before runtime fixes: `node --test tests/workflow-next.test.cjs` reproduced 13 failures among 46 tests; 33 passed. A focused four-case RED run is retained at `.design-pipeline/workflow-verification-red.txt`.
- After the first runtime fixes: the same 46 tests passed with no skips. `node --test tests/film-project.test.cjs tests/film-edit.test.cjs` passed 17 tests with no skips, including generated footage analysis, edit/render/check and film capture hooks.
- Real browser/public CLI regression separately passed with no skip. It captured three static-click surfaces: default index advances, another measured local page does not prove index, and that other valid page checks successfully when index is absent. Its `responds: false` expectation tests binding, not a responsive interaction's functional acceptance.
- Windows public CLI case regression separately passed with no skip: checking `STORYBOARD.JSON` recognizes the same existing `storyboard.json`. Other platforms retain their own case semantics.
- Independent review identified actual-page binding, Windows key comparison and result/probe overwrite issues; all three received focused fixes and regressions. The overwrite regression passed for the same path and a hard-link alias without starting capture, preserving the original probe and state bytes. Final re-review found no remaining blocking issue.

## Real guide exercise

Ignored `.design-pipeline/harness-verification-1791384595797/` retains actual commands, stdout, stderr and exit codes in `before.json`, `guide-cli.json` and `after.json`, plus `cleanup.json`. The 11-command after-fix run used only the packaged public CLI:

1. Doctor returned ready and route returned the settings-page action. The CLI is per command and started no persistent server.
2. Quick web initialization returned build. Premature delivery now returns exit 1 / WORKFLOW_NOT_READY and leaves workflow state byte-for-byte unchanged; before the fix it returned exit 0 and recorded delivery.
3. A scaffolded film storyboard passed actual verification and next returned build. Replacing its bytes with invalid JSON while restoring its timestamp now returns plan; before the fix it stayed at build.
4. Restoring the original storyboard and rerunning the same verifier returns build. This proves recovery through the real check; it does not render or accept a finished film.
5. Cleanup removed only the four owned before/after temporary project directories after checking their absolute containment. All three evidence JSON files remain. No persistent process needed stopping.

## Integration checks

First repository QA attempt: 823 tests passed, but 14 consecutive test files failed to spawn the host NVM Node alias with ENOENT; none produced a test assertion failure. Packaging, reproducible archives, required QA-guide inclusion, isolated installation and its 12 public CLI tests all passed. Repository status stayed byte-identical after QA. Retained log: `.design-pipeline/harness-verification-1791384595797/npm-test.log`.

The fixed-executable `npm test` rerun passed with exit 0: 955 repository tests across 109 files and 12 installed-package public CLI tests, with zero failures and zero skips; both browser adapter and BuilderPort self-tests passed. Reproducible archives, required-resource inclusion, contained installation/replacement, packaged-source journeys and repository status preservation all passed. Retained log: `.design-pipeline/harness-verification-1791384595797/npm-test-fixed-runtime.log`. Only that shell's PATH used the resolved executable; machine defaults were not changed.

Strict `npm run specs:check` passed all 46 items with zero failures. `git diff --check` passed. The new OpenSpec change remains open for review; no archive, commit, push, installation into the real agent home or deployment was performed.

## Scope and limits

- Hashes bind declared primary files and the selected video, including active named film inputs; they do not discover every transitive asset or external runtime dependency. Run against an isolated instance without concurrent input edits.
- Native report/artifact hashes prove file/version integrity, not a tool invocation. This change does not resolve that separate provenance gap.
- Partial Playwright capture remains partial. Technical conformance and functional test coverage do not grant owner Visual Acceptance; legacy UI remains a declaration with acceptance not evaluated.
- Existing timestamp-only passes and unbound review/delivery records remain readable but require fresh checkpoints. No complete pstack/Cursor integration is claimed.
