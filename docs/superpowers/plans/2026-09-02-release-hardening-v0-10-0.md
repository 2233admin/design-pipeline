# Release Hardening v0.10.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the v0.10.0 release contract self-checking, document usable release-asset installation on Windows and Unix, and verify the real GitHub release from synchronized `main`.

**Architecture:** Add one standard-library `scripts/release-contract.cjs` utility that reads the repository version and changelog and validates an optional tag. The release workflow invokes it before QA/package, and `scripts/package.cjs` invokes the same contract only in explicit release mode so QA/dev package versions remain supported. README becomes the executable release-install guide; changelog metadata is corrected; publication verification consumes downloaded release assets rather than the checkout.

**Tech Stack:** Node.js CommonJS scripts, GitHub Actions YAML, Markdown, Node built-in test runner, GitHub Releases API/CLI, ZIP/TGZ archives.

**Spec:** User-approved release-hardening design in the conversation; release criteria in `skill/references/open-source-readiness.md`.

## Global Constraints

- Release versions must be valid SemVer and must match `VERSION` exactly.
- Tag releases must use exactly `v<VERSION>`.
- `CHANGELOG.md` must contain exactly one `## [<VERSION>]` entry for the release version.
- Manual workflow dispatch must derive its version from `VERSION`; it must not accept an arbitrary version input.
- Ordinary QA/dev packaging must continue to support non-release versions such as `0.7.0-qa` and `0.0.0-dev`.
- Release scripts use Node standard-library dependencies only.
- Installation must support GitHub `.zip` on Windows PowerShell and `.tgz` on Git Bash/Unix.
- Release verification must use the three downloaded assets: `.tgz`, `.zip`, and `checksums.txt`.
- Never force-push or overwrite unrelated user work.

---

### Task 1: Release Contract Utility

**Files:**
- Create: `scripts/release-contract.cjs`
- Modify: `tests/package-release.test.cjs`

**Interfaces:**
- CLI: `node scripts/release-contract.cjs --version <version> [--tag <tag>] [--json]`.
- Export: `readReleaseContract(repoRoot)`, `validateReleaseContract(repoRoot, { version, tag })`, and `formatReleaseContractResult(result)`.
- Result fields: `ok`, `version`, `declaredVersion`, `tag`, `changelogEntryCount`, `errors`.

- [ ] **Step 1: Add failing contract tests**

Cover matching `VERSION`/tag/CHANGELOG, mismatched tag, mismatched requested version, duplicate changelog entry, missing changelog entry, JSON output, and no artifact mutation on failure.

- [ ] **Step 2: Run focused tests and observe failures**

Run: `node --test tests/package-release.test.cjs`
Expected: new contract assertions fail before the utility exists.

- [ ] **Step 3: Implement the utility**

Read `VERSION` and the first-level `## [x.y.z]` headings from `CHANGELOG.md`; reject invalid SemVer, mismatches, and duplicate release headings. Keep output deterministic and use exit code `1` for contract failure.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `node --test tests/package-release.test.cjs`
Expected: all package/release contract tests pass.

---

### Task 2: Enforce Workflow and Package Consistency

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `scripts/package.cjs`
- Modify: `tests/package-release.test.cjs`

**Interfaces:**
- Release workflow sets `RELEASE_MODE=1` and `PACKAGE_VERSION` from `VERSION`.
- Tag events validate `GITHUB_REF_NAME` against `v<VERSION>`.
- Manual dispatch has no free-form version input and uses `VERSION` from the checked-out commit.
- `scripts/package.cjs` calls the contract utility when `RELEASE_MODE=1`; non-release invocations preserve current version precedence.

- [ ] **Step 1: Update tests for the new workflow contract**

Replace the old dispatch-input expectation with assertions that no arbitrary `inputs.version` is used, `VERSION` is read, release mode is set, and tag validation invokes `release-contract.cjs` before QA.

- [ ] **Step 2: Run focused workflow tests and observe failures**

Run: `node --test tests/package-release.test.cjs`
Expected: the old workflow assertions fail until the YAML and package script are updated.

- [ ] **Step 3: Wire the shared contract into package and workflow**

Add the release validation step to the workflow before QA. Remove the manual version input. In `package.cjs`, load the shared validator and enforce the declared repository version only for release mode; retain `PACKAGE_VERSION`/tag/dev precedence outside release mode.

- [ ] **Step 4: Run package/release tests**

Run: `node --test tests/package-release.test.cjs`
Expected: all focused tests pass, including QA-compatible non-release packaging.

---

### Task 3: Document Release-Asset Installation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Add a release installation section using `v0.10.0` as the example version.
- Include GitHub asset URLs, `checksums.txt` verification, Windows PowerShell ZIP commands, Git Bash/Unix TGZ commands, post-install `doctor` and `route`, Node 22+ requirement, approximate bundled-resource size, and optional companion fallback behavior.

- [ ] **Step 1: Write executable installation examples**

Use only commands supported by the repository installer: PowerShell `Invoke-WebRequest`, `Expand-Archive`, `Get-FileHash`, and `node scripts/install-local.cjs`; Git Bash/Unix `curl`, `sha256sum`, `tar`, and the same Node installer.

- [ ] **Step 2: Add guidance for package boundaries**

State that the release package contains reference snapshots, does not install target-project dependencies, and reports missing optional companion skills as warnings with documented fallbacks.

- [ ] **Step 3: Review the resulting README section**

Check every command against `scripts/install-local.cjs` and the generated package layout; remove any source-checkout-only assumption from the release path.

---

### Task 4: Clean Public Changelog Metadata

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Add the `[0.10.0]` compare link at the bottom.
- Rename the duplicate second `0.9.0-beta.5` heading to the correct historical version represented by its compare range, without changing release content order.

- [ ] **Step 1: Correct headings and links**

Keep the `0.10.0` entry first, retain all historical entries, and make every link target a real GitHub compare URL.

- [ ] **Step 2: Run changelog contract tests**

Run: `node scripts/release-contract.cjs --version 0.10.0 --tag v0.10.0 --json`
Expected: `ok: true` and one `0.10.0` changelog entry.

---

### Task 5: Verify Release Candidate Before Publication

**Files:**
- No source files; verification only.

**Interfaces:**
- Candidate commit is `main` after all implementation commits are pushed.
- Candidate tag is `v0.10.0`.

- [ ] **Step 1: Run the full regression suite**

Run: `node --test tests/*.test.cjs`
Expected: zero failures, zero skipped, zero todo.

- [ ] **Step 2: Run hermetic QA and package release mode**

Run: `node scripts/qa.cjs` and `RELEASE_MODE=1 PACKAGE_VERSION=0.10.0 node scripts/package.cjs --output-root <temporary-directory>`.
Expected: QA passes and all three package artifacts are created.

- [ ] **Step 3: Confirm synchronized main and clean tree**

Run: `git fetch origin`, compare `main` and `origin/main`, inspect `git status --short`, then check out `main` only if clean and already synchronized.
Expected: no uncommitted changes and `main` points at the tested release candidate.

---

### Task 6: Publish and Verify Real GitHub Assets

**Files:**
- No source files; Git/tag/release operations and temporary verification files only.

**Interfaces:**
- Push annotated or lightweight tag `v0.10.0` from synchronized `main`.
- GitHub Actions creates `design-pipeline-skill.tgz`, `design-pipeline-skill.zip`, and `checksums.txt`.

- [ ] **Step 1: Create and push the release tag**

Run regular `git push origin main` if needed, then `git tag v0.10.0` and `git push origin v0.10.0`.
Expected: tag points at the synchronized `main` release commit and the Release workflow starts.

- [ ] **Step 2: Wait for the workflow and inspect the release**

Use GitHub Actions/Release APIs or `gh` to verify the run is successful and the release is non-draft, non-prerelease, and named `design-pipeline v0.10.0`.
Expected: all three assets exist with published checksums.

- [ ] **Step 3: Download all three assets and verify bytes**

Download the release `.tgz`, `.zip`, and `checksums.txt`; run checksum verification with the downloaded files, not local build output.
Expected: every checksum passes.

- [ ] **Step 4: Run isolated packaged-install smoke**

Extract the downloaded `.tgz` or `.zip` into a temporary directory, run the packaged `scripts/install-local.cjs` into an isolated skills root, then run installed `doctor --json` and one installed `route --json` command.
Expected: installation succeeds atomically, doctor is `ready`, route returns the versioned success envelope.

---
