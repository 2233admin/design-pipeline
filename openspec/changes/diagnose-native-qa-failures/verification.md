# Verification

Date: 2026-10-08. Base: `a4f243f84c681fafd8b856eeb16c2a26ad523aa9`.
Delivery branch: `codex/diagnose-native-qa-failures`.

## Final complete run

The final corrected tree passed `npm test` on Windows with Node.js v26.3.1:

| Check | Result |
| --- | --- |
| Registered repository tests | 1,033 passed, 0 failed, 0 skipped; 427.35 seconds |
| Installed-package public CLI smoke | 12 passed, 0 failed; 14.89 seconds |
| Prewalk browser adapter self-test | Passed |
| Prewalk BuilderPort self-test | Passed |
| Package contents, reproducibility and isolated installation | Passed |
| Complete npm command | Exit 0 |
| Repository status before/after QA | Byte-identical |

The three originally failing cases passed in this final complete run:

- Dispatcher interruption recovery without repeating a completed unit: 27.09 seconds.
- Fresh completion invalidates old visual acceptance after metadata rewriting: 23.70 seconds.
- Public native failure counts follow observed input/output bytes: 28.59 seconds.

The runtime and test diff was frozen during this run. Only the completion record and task checklist were updated afterward. Strict OpenSpec validation also passed 52/52 on the corrected source tree; `git diff --check` passed.

## Regressions and review

The physical-alias and undefined-notice regressions failed before repair and passed afterward. Independent review additionally exposed an artifact-coordinate escape in the reused resolver change. The real artifact probe and registered regression failed before the caller-root rebasing correction, then passed with valid relative metadata and rejection of relative traversal.

After that correction, host-profile containment/diagnostic checks passed 2/2, and hermetic-volume containment passed 1/1. The new deterministic incomplete-capture regression confirms that an unobserved block preserves old failure evidence; a complete observation of changed output restarts the count. It does not simulate an observed semantic failure as a successful capture.

Independent final review found no blocking issues. Temporary observers and raw logs remain in ignored local `.design-pipeline/native-qa-diagnosis/` directories. No active debug instrumentation, added dependency, receipt schema, gate, counter-rule change or browser-threshold change is shipped.

## Limits

The original failed full run's fixtures were cleaned up, and its actual underlying native errors were masked. The stable related Windows root-alias defect was reproduced and repaired; the original three failure causes are not all established. See diagnosis.md for the intermediate failed run and causal boundaries.

The hermetic temporary volume could not enable per-directory case sensitivity even though fsutil returned exit 0. That specific subscenario emits an availability diagnostic; its distinct-root rejection was exercised in the host-profile focused run. Alias, link, artifact-coordinate and traversal checks ran in both environments. No other operating system or Node.js version was tested in this task.

These results verify software behavior and technical conformance. They do not claim user visual acceptance or authorize a release tag/version change.
