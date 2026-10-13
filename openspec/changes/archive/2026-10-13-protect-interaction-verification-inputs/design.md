# Design

## Context

See proposal.md for the reproduced failures. The existing public interaction handler validates its probe, checks explicit output containment and compares the report inode only with the probe. Its capture kernel already resolves the page through `resolvePageUrl`; workflow state has an exported `STATE` path.

## Goals / Non-Goals

**Goals:** Reject the observed destructive and escaping destinations before browser execution, while preserving successful output and existing gate lineage.

**Non-Goals:** Infer every transitive page asset, authenticate externally supplied reports, add a runner or receipt schema, enforce native task modification scope, or claim visual acceptance.

## Decisions

1. Reuse `contained` for both the chosen output directory and its final report path. Checking only the directory misses a report-file link; checking only explicit output misses the default evidence junction. In shared `resolveInside`, use `lstat` to reject an unresolved link before walking to a parent: `existsSync` alone treats a dangling link as a missing file, although a later write can follow it. Existing resolved contained links and ordinary new paths retain their behavior. No second path resolver is needed.
2. Export the existing `resolvePageUrl` helper and reuse it in the CLI to identify the same local page before capture. Require that local project file to be contained. Preserve HTTP(S) targets without substituting index.html. Separate URL parsing in the CLI would risk disagreement with capture.
3. Extend the current filesystem-identity comparison once to the probe, resolved local page and existing `workflow.STATE`. Follow links with `stat` and compare device/inode to cover hard links as well as path aliases. Missing state does not block a check. Existing collision code and normal result/gate formats remain unchanged.
4. Root owns runtime and these change records. The test worker owns only the existing workflow test file; independent reviewers write only ignored proof fixtures. All preserve unrelated edits. Public CLI tests use invalid browser tools to prove rejection happens first; real-browser controls verify valid capture remains possible.

## Risks / Trade-offs

- Link targets could change concurrently after validation: this guard covers stable filesystem inputs; run verification in an isolated owned instance. It is not a transactional filesystem boundary.
- Checks bind declared inputs, not every script/image/server dependency: the report states the actual checked surface.
- Native completion currently accepts a structurally valid self-declared report and does not independently compare actual edits with declared scope: retain the audit counterexamples. A hash or self-written receipt does not prove a verifier ran.

## Migration Plan

No schema, artifact path or CLI flag changes. Previously unsafe destinations now return the existing contract-error exit code; choose a separate contained output directory and rerun. No state migration or historical evidence deletion is required.
