## Why

`npm test` on a Windows host with Git for Windows first on PATH fails 8 tests that say nothing about
the product. GNU tar reads `D:\...` as a remote host ("Cannot connect to D:"), six package tests
fail on it. A snapshot verifier prints a native path with backslashes, so one test cannot find
its own message. One test checks two folders that differ only in case, which cannot exist on a
case-insensitive checkout. One browser launch test hangs for 120 s under the parallel QA run and
passes alone in 1.2 s. A red suite that is red for the host teaches people to ignore red.

## What Changes

- Package tests call `tar` with the archive as a relative name and `cwd` set to its folder, which
  works with GNU tar and bsdtar.
- Snapshot verification issues name files with `/` on every platform.
- The look-alike folder case in `reference-name-scope.test.cjs` runs only on a case-sensitive
  filesystem and reports a diagnostic otherwise.
- The browser launch test: cause and fix recorded in tasks 2.4 once found.

## Capabilities

- `design-pipeline`: ADDED `Verification output and repository tests do not depend on the host OS`.

## Reuse

- Existing verifiers, the `run` helpers in each test file and `scripts/qa.cjs`. No new gate.

## Impact

- Product behavior changes only in issue text: separators in `mengto` verification issues.
- `npm test` result on Windows becomes comparable to Linux CI.
