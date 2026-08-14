# GitHub Workflow Requirements

## Requirement: bounded read-only GitHub orientation

The pipeline MUST provide project-owned, read-only commands for PR state, review-thread state, and
CI failure drilldown without adding a runtime dependency.

### Scenario: PR orientation

Given an authenticated `gh` session and a PR, `pr-snapshot` returns metadata, checks, changed
files, review summaries, comments, and bounded thread counts in one report.

### Scenario: unresolved review work

Given an authenticated `gh` session and a PR, `pr-threads` returns review bodies, issue comments,
and unresolved/non-outdated inline threads while retaining resolution state in JSON output.

### Scenario: failing CI

Given a failed Actions run or a PR with failing Actions checks, `ci-failures` identifies failing
jobs and steps, prints an error-anchored bounded snippet, and stores the full log outside agent
context. A red CI result is a successful report, not a command failure.
