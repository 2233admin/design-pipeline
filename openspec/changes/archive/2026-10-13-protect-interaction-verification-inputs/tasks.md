# Tasks

## 1. Protect interaction measurement inputs and output boundaries

- [x] 1.1 Observe public CLI regression failures, reuse existing page resolution and path containment to reject probe/page/state aliases and escaping default/report destinations before capture, document the measured result in qa.md, and pass the focused workflow-next.test.cjs regressions.

## 2. Verify integration and report actual correctness limits

- [x] 2.1 Independently rerun the real-browser destructive-output counterexamples and valid capture controls, review the minimal diff, run npm test, npm run specs:check and git diff --check, and record outcomes plus the native producer/scope boundaries in verification.md.
