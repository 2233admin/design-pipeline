# Design: Read-only GitHub Workflow Surface

`skill/scripts/github.cjs` exposes three subcommands:

- `pr-snapshot`: metadata, checks, files, reviews, comments, and review-thread counts.
- `pr-threads`: review bodies, issue comments, and inline threads with resolution/outdated state.
- `ci-failures`: recent-run listing or failing jobs/steps with error-anchored log snippets; full
  logs are written under the OS temp directory.

All `gh` invocations use `execFile`, bounded buffers, explicit `-R` repository routing, and the
known valid check exit codes (1 for failing and 8 for pending). The surface is read-only. Review
and CI output is bounded for agent context, while `--json` remains available for structured use.

## Spec Reconciliation

The implementation uses the existing Node 22+/stdlib package style and preserves the repository's
no-auto-install and no-remote-publication boundaries.
