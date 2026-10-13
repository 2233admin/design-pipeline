## Implementation

- [x] 1. Add `discover` to the existing components decision through one canonical `COMPONENT_SOURCES` list (`project,github,index,discover,scratch`) shared by `decide`, the manifest validator and the `next` record template; keep scratch exclusive, the github URL rule and `invalidateCheckedEvidence` lineage.
- [x] 2. Offer the discover option in the web components ask, recommend `project,index,discover`, and update the decide errors and CLI `publicHelp`.
- [x] 3. Extend `validateComponentManifest`: classify url entries (decision-named GitHub repository, indexed source, discovered https source, project file), require the `discover` category before discovered provenance (`revision`, `license.id`, https `license.evidence`, non-project/platform state), and keep indexed URLs on their `sourceId`.
- [x] 4. Add copy/import safety for discovered sources (verified state plus a permissive SPDX id) and the optional entry `kind`; pin fonts that are neither indexed nor project-owned, exempt fonts from the category and scratch contradiction, treat serving a pinned font as copying, and require a non-font entry for nonscratch sets.
- [x] 5. Make the web build instruction search the index first, add the discover method only when selected, route font choice through `tools/fonts.md` and keep discovered code and fonts self-hosted with notices.
- [x] 6. Update `workflow-web.md` (components and build), `tools/fonts.md`, `stages.md`, `pipeline-reference.md` and CHANGELOG.
- [x] 7. Add `tests/workflow-component-discovery.test.cjs`, register it in `scripts/test-manifest.json`, and migrate the three `tests/workflow-components.test.cjs` assertions that pinned the four-choice ask.

## Verification and delivery

- [x] 8. Record the regressions' failing-before and passing-after output and a CLI smoke from outside the project.
- [x] 9. Run the focused component and workflow suites, `npm run specs:check` and `npm exec -- openspec validate let-agents-discover-open-source-resources --strict`.
- [x] 10. Run `FONTTOOLS_PYTHON=<fonttools-python> npm test` on the committed implementation tree and record the commit, tree and totals. Not a clean pass: the remaining failures are the workstation's EPERM temp-rename flake, reproduced on unchanged `origin/main` (below).
- [x] 11. Commit on `feat/agent-resource-discovery` without pushing or opening a PR.

## Evidence

Checked tasks certify implementation and technical evidence only, not Component Conformance or Visual Acceptance. Raw outputs are local in ignored `.design-pipeline/` (`discovery-before-final.txt`, `discovery-after-final.txt`, `full-qa-1.txt`, `full-qa-2.txt`, `test-browser.txt`).

### Regression tests, before and after

The final `tests/workflow-component-discovery.test.cjs` was run against an archive of `origin/main` 66e41c8 (`skill/` only) and against this change:

```text
node --test tests/workflow-component-discovery.test.cjs
Before (66e41c8): tests 11; pass 0; fail 11; duration_ms 98.4193; exit 1
After:            tests 11; pass 11; fail 0; duration_ms 660.4892; exit 0
```

Before, decide rejected every set with `discover` (`workflow: --choice must be a comma-separated subset of project,github,index,scratch`), the ask had four options, an unselected discovered entry failed with `entries[1].url must be a GitHub repository named in the components decision` instead of naming its category, and a font entry failed the same way.

Direct validator probe on the same inputs (old code, then new code):

```text
case [componentSources]                   before (66e41c8)                                                    after
discover entry valid [discover]           a recorded componentSources set is required; scratch cannot be...   valid
missing revision [discover]               a recorded componentSources set is required; ...                    entries[0].revision must pin the commit SHA, tag, package version or font release whose license was checked
missing evidence [discover]               a recorded componentSources set is required; ...                    entries[0].license.evidence must be a non-empty array of https URLs to the license text at that revision
non-permissive import [discover]          a recorded componentSources set is required; ...                    entries[0].usedIn[0] copying or importing a discovered source requires license.state verified and a permissive license.id (MIT, ..., OFL-1.1); otherwise only study/reimplementation
category not selected [project,index]     entries[1].url must be a GitHub repository named in the components decision   entries[1] source category discover is not in the recorded componentSources project,index; its url is not a GitHub repository named in the components decision, an indexed source or a project file
font without category [project]           entries[1].url must be a GitHub repository named in the components decision   valid
font under scratch [scratch]              entries[0].url must be a GitHub repository named in the components decision   valid
indexed repository url [index]            entries[0].url must be a GitHub repository named in the components decision   entries[0].url matches the indexed source shadcn-ui/ui: cite it by sourceId, or by url only as a GitHub repository named in the components decision
indexed homepage url [index]              entries[0].url must name a project file                             (same message as the indexed repository url)
```

An indexed source's URL is rejected before and after; only the message now names the indexed `sourceId` to cite. A decision-named indexed repository URL keeps the github rule and the indexed license-state check (covered in the regression file).

### Existing suites

```text
node --test tests/workflow-components.test.cjs
Before (66e41c8): tests 48; pass 48; fail 0
After code change, before migrating assertions: tests 48; pass 46; fail 2
After migration: tests 48; pass 48; fail 0 (also in the focused runs below)
```

The two expected failures were the ask's four-option count with its `<project|github|index|scratch, comma-separated>` record pattern, and the outside-directory test that substitutes that placeholder (the unsubstituted `<` became a shell redirection). Both now use the five-source template.

A first wider focused run (`workflow-component-discovery`, `workflow-components`, `workflow-next`, `workflow-action-commands`, `returned-command-safety`, `component-routing`, `component-source-routing`, `component-source-completeness`, `component-source-metadata`, `design-system-provider`, `designer-pipeline-cli`, `skill-cli-handoff`) reported `tests 282; pass 278; fail 3; skipped 1`. Two `workflow-action-commands` tests call every web stage action with empty decisions and hit a TypeError on the absent `componentSources`; the build instruction now checks for an array. The `workflow-next` treatment test showed that quick and replicate builds must not mention a treatment; the font sentence now says "the treatment" only at standard/full brief builds and "the page's direction" otherwise. After those fixes:

```text
node --test tests/workflow-component-discovery.test.cjs tests/workflow-components.test.cjs tests/workflow-action-commands.test.cjs tests/workflow-next.test.cjs
tests 180; pass 179; fail 0; skipped 1
node --test <the twelve files above>
tests 282; pass 281; fail 0; skipped 1; duration_ms 154290.2289
node --test tests/workflow-component-discovery.test.cjs tests/workflow-components.test.cjs
tests 59; pass 59; fail 0 (after aligning the build instruction's font-copy wording)
```

The skip is the existing Windows case-alias collision check.

### CLI smoke outside the project

From a separate project directory under ignored `.design-pipeline/`, `next --deliverable web --tier quick --mode brief` returned the components ask with five options, the `project,index,discover` recommendation and a `--choice <project|github|index|discover|scratch, comma-separated>` record. `decide --choice discover,index,project` exited 0 with `componentSources` `["project","index","discover"]`. With `index.html` and a manifest holding a project entry, an npm-page library and an OFL font, `next` returned `probe`; deleting the library's `revision` returned `build` with a `CONTRACT_INVALID` error finding `component manifest: entries[1].revision must pin the commit SHA, tag, package version or font release whose license was checked`.

### Specs

```text
npm run specs:check
Totals: 72 passed, 0 failed (72 items)
npm exec -- openspec validate let-agents-discover-open-source-resources --strict
Change 'let-agents-discover-open-source-resources' is valid
[INFO] Archive would refuse this delta: design-pipeline MODIFIED failed for header "### Requirement: Web build follows an explicit component source decision" - not found
```

The INFO is expected: both MODIFIED requirements are still ADDED by the in-flight `consolidate-component-index-and-web-sources`, which validates on its own. Archive that change first.

### Full QA on the frozen implementation tree

Implementation commit `0020b79eec79a6fdb60aa28cfee6af3f2622a955`, tree `8365db76e827687cb620e87d7bba8b2bcc5b51c7`. Only this verification record changed afterwards.

```text
FONTTOOLS_PYTHON=<fonttools-python> npm test
Run 1 (system temp on C:): repository tests 1380; pass 1351; fail 25; skipped 4; exit 1
Run 2 (TEMP/TMP on a D: directory): repository tests 1380; pass 1371; fail 5; skipped 4; exit 1
  2234 OK checks; the only FAIL is "repository tests (134 files)"; packaging reproducibility,
  installed-package tests (12/12), installed CLI smoke and byte-identical repository status pass
npm run test:browser (not reached by npm test after the qa.cjs failure; run separately): exit 0
  OK prewalk pipeline browser adapter self-test; OK prewalk BuilderPort self-test
```

Run 1 ran out of disk: the system drive had about 450 MB free, and 24 of its 25 failures are `ENOSPC` or "There is not enough space on the disk" while copying skill trees into the hermetic temp root (check-deps, component-eval, doctor, install, packaged install, Prism, Art Motion and release-archive tests). The 25th is `EPERM: operation not permitted, rename` in `website-cloning-init.test.cjs`. Run 2 moved only the temp root to a drive with free space.

Run 2's five failures are all in the three files with the known Windows temp-rename flake. Three show `EPERM: operation not permitted, rename` on a temporary directory: `carried-forward-defects.test.cjs` F10, `palette-foundation.test.cjs` "palette foundation rejects non-object JSON without crashing" and `website-cloning-init.test.cjs` "isolates primary and reference targets with stable ids". The other two are `website-cloning-init.test.cjs` initializer runs that exited 1 instead of 0: "rejects a damaged manifest instead of treating it as resumable" and "evaluator blocks completion when the project motion foundation disappears". These files load `init-website-clone.cjs`, `evaluate-website-clone.cjs` and the palette/website-cloning cores, none of which require the modules this change edits.

The same three files, run standalone, also fail intermittently on unchanged `origin/main` 66e41c8 (a full `git archive` extraction) with the same temp root:

```text
66e41c8 run 1: tests 51; pass 48; fail 3 (palette non-object JSON, website-clone complete palette evidence, damaged manifest); 2 EPERM rename errors
66e41c8 run 2: tests 51; pass 48; fail 3 (legacy complete manifests, explicit authority, manifest commit ordering); 1 EPERM rename error
This change, standalone: tests 51; pass 48; fail 3 (damaged manifest, unresolved required port, verdict history)
```

The failing tests change from run to run on both trees, so these failures are environmental and pre-existing, not caused by this change.
