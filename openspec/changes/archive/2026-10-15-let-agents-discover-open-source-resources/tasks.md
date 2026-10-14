## Implementation

- [x] 1. Add `discover` to the existing components decision through one canonical `COMPONENT_SOURCES` list (`project,github,index,discover,scratch`) shared by `decide`, the manifest validator and the `next` record template; keep scratch exclusive, the github URL rule and `invalidateCheckedEvidence` lineage.
- [x] 2. Offer the discover option in the web components ask, recommend `project,index,discover`, and update the decide errors and CLI `publicHelp`.
- [x] 3. Extend `validateComponentManifest`: classify url entries (decision-named GitHub repository, URL of an indexed source, discovered `https://github.com/<owner>/<repo>` repository, project file; every other URL is rejected), check the `discover` category before discovered provenance (`revision`, https `license.evidence` with one URL on the same repository containing the revision, a non-project/platform license state, a non-empty `license.id` when given), and keep indexed URLs on their `sourceId`.
- [x] 4. Add copy/import safety for discovered sources: `license.state: verified`, a `license.id` from MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense or CC0-1.0, and a contained, non-empty `license.file`; anything else is study/reimplementation only. License text is not recognised by content.
- [x] 5. Make the web build instruction search the index first, add the discover method only when selected, route font choice through `tools/fonts.md` without a silent system-stack fallback and keep discovered code and fonts self-hosted with their notices.
- [x] 6. Update `workflow-web.md` (components and build), `stages.md`, `pipeline-reference.md`, CHANGELOG and one sentence in `tools/fonts.md`; state that the validator checks an auditable shape offline and does not authenticate the upstream.
- [x] 7. Keep fonts out of the manifest: no entry `kind`, no font exemptions from the category or scratch rules, and no font-specific copy rule. Fonts keep following `tools/fonts.md`, which records their provenance in the project's design notes.
- [x] 8. Add the `discovery:` cases to `tests/workflow-components.test.cjs` and migrate the three assertions that pinned the four-choice ask; no separate discovery test file.

## Verification and delivery

- [x] 9. Record the regressions' failing-before and passing-after output and a direct validator probe on the same manifests.
- [x] 10. Run the focused component and workflow suites, `npm run specs:check` and `npm exec -- openspec validate let-agents-discover-open-source-resources --strict`.
- [x] 11. Run `FONTTOOLS_PYTHON=<fonttools-python> npm test` with TEMP/TMP on a drive with free space and record the commit, tree and totals.
- [x] 12. Commit on `feat/agent-resource-discovery` without pushing or opening a PR.
- [x] 13. Archive `consolidate-component-index-and-web-sources` before archiving this change; both requirements this change modifies are added by that change.

## Evidence

Checked tasks certify implementation and technical evidence only, not Component Conformance or Visual Acceptance. Raw outputs are local and not committed.

### Regression tests, before and after

The final `tests/workflow-components.test.cjs` was run against a `git archive` extraction of `origin/main` 66e41c8 (`skill/`, `tests/`, `scripts/`) and against this change:

```text
node --test tests/workflow-components.test.cjs
Before (66e41c8): tests 62; pass 46; fail 16; exit 1
After:            tests 62; pass 62; fail 0; exit 0
```

Before, all 14 `discovery:` cases failed, plus the two migrated assertions (the ask had 4 options; the outside-directory test substituted the old `<project|github|index|scratch, comma-separated>` placeholder, so the unsubstituted `<` became a shell redirection). Twelve `discovery:` cases failed at `workflow: --choice must be a comma-separated subset of project,github,index,scratch`; the ask case failed on the option count; the category case got `entries[1].url must be a GitHub repository named in the components decision` instead of a message naming the `discover` category.

The cases, one test each unless noted: decide with `discover` (accepted, canonical order, scratch exclusive); adding `discover` invalidates checked evidence; the ask; the build instruction; complete discovered entries accepted (copied, study-only, commercial study, study without `license.id`); missing or invalid provenance (revision, evidence, empty `license.id`, project-owned/platform state, copy without `license.id`); non-GitHub URLs rejected (npm page, project homepages, owner page, unnamed deep link, other host, `http:`, credentials, `ftp:`); evidence not at the revision rejected (default branch, prefix revision, fork, other host, `raw.githubusercontent.com`); category not selected rejected; non-permissive copy rejected (`OFL-1.1`, `GPL-3.0-only`, `MIT OR Apache-2.0`, `LicenseRef-Custom`, unverified); copy/import without `license.file` rejected; empty, blank, outside, directory, missing or URL `license.file` rejected; a complete copied discovered entry accepted; a URL of an indexed source keeps the existing citation rule.

Direct validator probe on the same manifests (old code, then new code):

```text
case [componentSources]                      before (66e41c8)                                                after
complete copied discovered entry [discover]  a recorded componentSources set is required; scratch cannot...  valid
study entry without license.id [discover]    (same)                                                          valid
npm page url [discover]                      (same)                                                          entries[0].url must be a GitHub repository URL https://github.com/<owner>/<repo> or a project file
missing revision [discover]                  (same)                                                          entries[0].revision must pin the commit SHA or tag whose license was checked
evidence without the revision [discover]     (same)                                                          entries[0].license.evidence must include a URL on https://github.com/davidjerleke/embla-carousel that contains the revision 4c3b2a1...
copy without license.file [discover]         (same)                                                          entries[0].usedIn[0] copying or importing a discovered source requires license.file naming the project file that holds its license text
empty license.file [discover]                (same)                                                          entries[0].license.file must not be empty
uncontained license.file [discover]          (same)                                                          entries[0].license.file must be a file contained inside the project
non-permissive copy, GPL-3.0-only [discover] (same)                                                          entries[0].usedIn[0] copying or importing a discovered source requires license.state verified and a permissive license.id (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense or CC0-1.0); otherwise only study/reimplementation
discover not selected [project,index]        entries[1].url must be a GitHub repository named in the ...    entries[1] source category discover is not in the recorded componentSources project,index; its url is not a GitHub repository named in the components decision, an indexed source or a project file
indexed source url [index]                   entries[0].url must be a GitHub repository named in the ...    entries[0].url matches the indexed source shadcn-ui/ui: cite it by sourceId, or by url only as a GitHub repository named in the components decision
```

An indexed source's URL is rejected before and after; only the message now names the indexed `sourceId` to cite. A decision-named indexed repository URL keeps the github rule and the indexed license-state check (covered in the regression file).

### Focused suites

```text
node --test tests/workflow-components.test.cjs tests/workflow-next.test.cjs tests/workflow-action-commands.test.cjs tests/returned-command-safety.test.cjs tests/component-routing.test.cjs tests/component-source-routing.test.cjs tests/component-source-completeness.test.cjs tests/component-source-metadata.test.cjs tests/design-system-provider.test.cjs tests/designer-pipeline-cli.test.cjs tests/skill-cli-handoff.test.cjs
tests 285; pass 284; fail 0; skipped 1; exit 0
```

The skip is the existing Windows case-alias collision check.

### Specs

```text
npm run specs:check
Totals: 72 passed, 0 failed (72 items)
npm exec -- openspec validate let-agents-discover-open-source-resources --strict
Change 'let-agents-discover-open-source-resources' is valid
[INFO] Archive would refuse this delta: design-pipeline MODIFIED failed for header "### Requirement: Web build follows an explicit component source decision" - not found
```

The INFO is expected: both MODIFIED requirements are still ADDED by the in-flight `consolidate-component-index-and-web-sources`, which validates on its own. Archive that change first (task 13).

### Full QA

Implementation commit `0f54ddee217fa4aa0f6c7047bc72231f608c911d`, tree `bad7fcbae97701af1903858a8ab0d9f5d369a2c8`. Only this verification record changed afterwards.

```text
TEMP=<temp dir on a drive with free space> TMP=<same> FONTTOOLS_PYTHON=<fonttools-python> npm test
Run 1: repository tests 1383; pass 1372; fail 7; skipped 4; exit 1
  FAIL repository tests (133 files); FAIL QA leaves repository status byte-identical
Run 2: repository tests 1383; pass 1374; fail 5; skipped 4; exit 1
  2234 OK checks; the only FAIL is "repository tests (133 files)"; installed-package tests (12/12),
  installed-package public CLI smoke and "QA leaves repository status byte-identical" pass
```

`npm run test:browser` is chained after `scripts/qa.cjs` and was not reached in either run.

Run 1's status failure was caused by writing this record while QA ran; run 2 left the tree untouched and that check passed. Every repository-test failure is in a file that does not load the modules this change edits (`design-system-catalog-core.cjs`, `workflow-core.cjs`, `workflows/web.cjs`) and none appears in both runs:

- Run 1: `art-motion-voice.test.cjs` (Windows `PermissionError` on a temp `.wav` replace), `coderabbit-round-two.test.cjs`, `palette-foundation.test.cjs` and one `website-cloning-init.test.cjs` case with `EPERM: operation not permitted, rename` on a temporary directory, and three more `website-cloning-init.test.cjs` initializer runs that exited 1 (damaged manifest, motion foundation, verdict history).
- Run 2: `runtime-review.test.cjs` and one `website-cloning-init.test.cjs` case with `EPERM ... rename`, and three more `website-cloning-init.test.cjs` initializer runs that exited 1 (legacy manifest authority, preflight foundations, JSONL handoff evaluation).

These match the workstation's known Windows temp-rename flake. An earlier verification of this change reproduced it standalone on unchanged `origin/main` 66e41c8 in `palette-foundation.test.cjs` and `website-cloning-init.test.cjs`; `art-motion-voice`, `coderabbit-round-two` and `runtime-review` were not rerun on `origin/main` this time.

### Rebase onto `origin/main` d9f2981 (PR #99 merged)

The branch was rebased; the hashes above name the pre-rebase commits. The only conflict was additive in `CHANGELOG.md` (both entries kept). PR #99 makes the web `probe` stage require an audited interaction probe with recorded lineage, so the discovery lineage case now records its pass with the audited probe file and lineage that the existing lineage regressions use (commit `a0c90ec`).

```text
node --test tests/workflow-components.test.cjs   tests 62; pass 62; fail 0
npm run specs:check                              Totals: 74 passed, 0 failed (74 items)
```

CI on `a0c90ec` (run 38372464415): `windows-path-regressions` passed; `qa-and-package` first failed one browser case in `component-eval.test.cjs` ("native technical progress recovers a dispatcher interruption without redoing a completed unit"), which passed locally on this branch and on `origin/main`, then passed on rerun with the whole job green.

## Review fixes

PR #100 review findings, fixed in `design-system-catalog-core.cjs`, the web build instruction and the docs.

- [x] 14. Copy detection counts `bundle`/`bundled`/`bundling`, `vendor`/`vendored`/`vendoring`, `self-host`/`self-hosted`/`self-hosting`, `download`/`downloaded`/`downloading` (and 打包, 自托管, 下载) in `usedIn.how` as copying, for discovered and indexed sources alike.
- [x] 15. Evidence pins the revision only as the raw, undecoded ref segment right after `blob`, `tree`, `raw`, `commit`, `releases/tag` or `archive` (also `archive/refs/tags`, minus `.zip`/`.tar.gz`) on the same repository; `HEAD`, `main` and `master` are rejected as revisions (case-insensitive). Other branch names are still not detected.
- [x] 16. GitHub first segments `topics`, `orgs`, `sponsors`, `marketplace`, `settings`, `features`, `collections`, `explore`, `enterprise`, `login`, `apps`, `users` and `search` are not repository owners, for entry, evidence and decision URLs.
- [x] 17. Discovered entries use availability `bundled-implementation`, `reference-link` or `metadata-only`; `bundled-implementation` counts as copied whatever `how` says, so study-only entries use `reference-link` or `metadata-only` (case in "requires a verified permissive license"; `tests/workflow-components.test.cjs` 67/67).
- [x] 18. A web build records its chosen font family under Typography in `DESIGN.md`, which the audit probe's `thresholds.fonts` reads (`tools/fonts.md`, the build instruction, `workflow-web.md`, `stages.md`).

The six affected `discovery:` cases (five new, one extended) were run against the previous core (`git show HEAD:skill/scripts/design-system-catalog-core.cjs` swapped in, then restored) and against the fix:

```text
node --test tests/workflow-components.test.cjs
Before (core at 810ac6c): tests 67; pass 61; fail 6; exit 1
After:                    tests 67; pass 67; fail 0; exit 0
```

Before, five failed with `Missing expected exception` (the reviewer's repros were accepted: GPL or unverified source "bundled"/"vendor"/"self-host"/"downloaded" into the page, permissive bundling without notice handling, revision `LICENSE`/`blob`/`deadbeef` behind `main%2Fdeadbeef%2F`, `HEAD`/`main`/`master`, `https://github.com/topics/widgets`, discovered `availability: project-owned`). The extended evidence case failed on the old message; its new rejected shapes (revision only as a later segment, outside a ref position, or behind an encoded slash) are covered by the new cases too.

```text
node --test <14 related files: astryx-bundled-snapshot, cli-routing, component-fit-matrix, component-routing, component-source-{completeness,metadata,routing}, design-system-{catalog,decision,provider}, guided-multi-surface-cli, surface-design-artifacts, workflow-action-commands, workflow-next>
tests 278; pass 277; fail 0; skipped 1 (the existing Windows case-alias collision check); exit 0
npm run specs:check
Totals: 74 passed, 0 failed (74 items)
```

The full `npm test` was not run for these fixes (low free space on C:).
