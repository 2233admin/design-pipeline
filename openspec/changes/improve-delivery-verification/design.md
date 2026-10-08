## Decisions

1. Reuse `.github/workflows/ci.yml` and the existing execution-target/storyboard tests. Windows CI must execute its intended alias branch; unsupported optional NTFS behavior is an explicit skip. Keep the Ubuntu full-QA/package job.
2. Change only the long test batch's stdio in `scripts/qa.cjs`. Other calls retain captured output because callers parse it. Preserve environment isolation, bounded concurrency, exit checks and unchanged-status verification. Redirecting npm output must still capture the complete log.
3. Document fetching the actual PR target, reviewing left/right commits and three-dot diff, reconciling dependencies, then freezing a commit/tree for full QA. Later integrations need fresh evidence and cannot inherit an old full-pass claim. Use the same `npm test` and `npm run specs:check` commands in the PR template.

## Ownership

- Windows owner: `.github/workflows/ci.yml`, Windows regressions in `tests/execution-target-routing.test.cjs` and `tests/workflow-next.test.cjs`.
- Documentation owner: `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`.
- Primary owner: `scripts/qa.cjs`, this change, final review, full QA and publication.
- Native regression owner: existing public-CLI fixtures in `tests/workflow-next.test.cjs`; explicitly carry the resolved test browser dependency into temporary projects instead of relying on host ancestor installations.
- Pointer regression owner: `tests/interaction-capture.test.cjs`, after an observed causal reproduction. Preserve input pacing, genuine-jump rejection and existing thresholds.
- Host skill owner: installed `github-workflows` resources outside this repository, with backups and a bounded repair.

All owners share the publication worktree and preserve others' changes. The original dirty checkout remains untouched. No schema migration or user-data change is involved. Visual direction is waived for this maintenance-only change; technical checks do not imply Visual Acceptance.

## Verification

Run the exact Windows CI command locally and confirm the alias assertions execute. Validate the YAML and strict OpenSpec deltas. Run `npm test` on the frozen integrated tree, observe output while the repository test child is still running, and retain its full log and exit status. The existing full QA covers manifests, syntax, complete tests, packaging and isolated installation. Record tested commit/tree and hosted CI results separately; never call skipped capabilities passed.

The previously published head's Ubuntu run 37735968494 reports six failures: five public native verification fixtures and one delayed pointer fixture. These are pre-existing integration evidence gaps, discovered during this change, and must be resolved before claiming the updated PR's full QA passes. Reproduce absent ancestor dependencies and inspect actual pointer samples before changing tests; do not weaken acceptance thresholds or suppress genuine product failures.
