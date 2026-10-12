## Implementation

- [x] 1. Extend the existing source catalog/schema/core and sourceId registry references; preserve existing IDs, source lineage and all vendor bytes.
- [x] 2. Register every required source and local pointer, verify license evidence, keep unresolved/commercial sources reference-only and exclude film/GEPA from web ranking.
- [x] 3. Replace the stale MengTo projection and fixed count with pinned-manifest equivalence; complete vendor navigation.
- [x] 4. Add independent inventory-derived index coverage, path containment, unique identity, licensing and projection tests; register new tests.
- [x] 5. Add components decisions immediately before every web build, with absolute-path record commands and decision-aware instructions. UI has generic work/delivery evidence, not an equivalent HTML build; retain it and document that boundary.
- [x] 6. Make HTML plus valid component-manifest.json an existing build completion condition; update required workflow and routing guides.

## Verification and delivery

- [x] 7. Record targeted regressions' failing-before and passing-after output, plus actual outside-directory CLI smoke evidence.
- [x] 8. Run `FONTTOOLS_PYTHON=D:/Temp/dp-fonttools-venv/Scripts/python.exe npm test`, `npm run specs:check`, and `npm exec -- openspec validate consolidate-component-index-and-web-sources --strict`.
- [x] 9. Commit verified repository changes without pushing and write `D:/projects/design-pipeline/.design-pipeline/component-survey/report-implement.md` with items 1–3, QA figures, commit SHA and unresolved license decisions.

## Evidence

Checked tasks certify implementation and technical evidence only, not Component Conformance or Visual Acceptance.

### Item 1 — source metadata, routing and MengTo consumers

Baseline before product core/schema/projection changes:

```text
node --test tests/component-source-metadata.test.cjs
tests 43; pass 8; fail 35; duration_ms 93.6339; exit 1
```

Failures included localPaths objects rejected as strings, malformed metadata accepted, method/template and film/GEPA ranked as ready, uncertain/commercial licenses ranked ready, and the old 127-entry projection accepted while the actual 176-entry projection was rejected. Seven mutation rejection cases already passed because the obsolete guard rejected every current projection; the positive/current and obsolete/rejection cases disambiguate that behavior.

After final identity and licensing integration:

```text
node --test tests/component-source-metadata.test.cjs tests/component-source-routing.test.cjs tests/frontend-stack-routing.test.cjs
tests 53; pass 53; fail 0; skipped 0; duration_ms 124.739; exit 0
```

Evidence: `.design-pipeline/catalog-core-red.txt`, `catalog-core-green.txt`, `source-index-final.txt`. Original 17 component IDs remain; 71 source records occupy docs. Canonical source license counts: 63 verified, 4 commercial, 2 unverified, 1 project-owned, 1 platform. No vendor manifest/upstream file was edited.

### Item 2 — independent completeness

```text
node --test tests/component-source-completeness.test.cjs
Before: tests 5; pass 0; fail 5; duration_ms 105.2049; exit 1
After:  tests 5; pass 5; fail 0; duration_ms 395.7595; exit 0
```

The old index had no canonical source records, lacked localPaths and had the obsolete MengTo revision. Expected sources come from vendor manifests, stack/providers/companions/profiles, Astryx, Prompt Motion and the HyperFrames guide, not the index. Local pointers are checked lexically and through realpath inside skill/. An intermediate over-constraint comparing entire evidence arrays was corrected: components and sources must share license state/identifier, but can cite different nonempty documentation evidence.

Full baseline and final outputs: `.design-pipeline/component-source-completeness.before.txt` and `.design-pipeline/component-source-completeness.after.txt`.

### Item 3 — web decision and build completion

```text
node --test tests/workflow-components.test.cjs
Before: tests 13; pass 1; fail 12; duration_ms 88.1688; exit 1

node --test tests/workflow-components.test.cjs tests/workflow-next.test.cjs tests/workflow-action-commands.test.cjs
After initial workflow implementation: tests 127; pass 126; fail 0;
skipped 1; duration_ms 148424.6357; exit 0
```

All nine web combinations returned build before the fix instead of the required components ask; decide rejected the new stage and outside-directory commands lacked its record. The one initial passing test establishes UI's unchanged generic work/evidence contract. The skip is the existing filesystem case-alias collision check on Windows.

Integration found that empty entries incorrectly satisfied non-scratch replies. Added the boundary regression before correcting the predicate:

```text
node --test --test-name-pattern "non-scratch component decisions" tests/workflow-components.test.cjs
Before: tests 1; pass 0; fail 1; duration_ms 1267.6192; exit 1
Assertion: empty manifest must not satisfy Use src/components
Actual probe !== expected build

node --test tests/workflow-components.test.cjs tests/component-source-completeness.test.cjs tests/component-source-metadata.test.cjs
After: tests 62; pass 62; fail 0; skipped 0; duration_ms 5732.2859; exit 0
```

Only explicit `Write from scratch`, ignoring case/outer whitespace, permits empty entries. Project paths, index discovery, named GitHub and mixed replies remain build without usage entries.

Parent public-CLI smoke ran from `D:/projects/design-pipeline`, outside the smoke project in this worktree: next returned components even when HTML existed; the returned absolute decide command preserved the answer; HTML without a manifest stayed build; scratch plus `{\"entries\":[]}` reached probe; changing the reply to index discovery returned build despite the same empty manifest; explicit scratch reached probe again. Explicit source search found GEPA as a doc with webRanking false. Returned route/search commands also executed successfully in the workflow regression.

### Full QA and delivery

`npm ci` succeeded (145 packages); Node v26.3.1 and fonttools 4.66.1 were observed. An `env ... npm test` launcher attempt exited 127 before QA because the Windows npm shell shim could not be resolved; the requested direct assignment command was used instead.

`npm run specs:check`: 71 passed, 0 failed. Strict requested change validation passed. Final QA figures and delivery evidence are recorded after the final run.

The first complete QA ran 133 repository test files: 1311 tests, 1301 passed, 6 failed, 4 skipped (exit 1). Failures exposed the provider consumer's unsupported sourceId and stale test assumptions about researched licenses/default profile copies. Existing full-QA failures supply the failing-before evidence; no confirmation rerun was used. The consumer now validates optional canonical sourceId and retains it without granting license authority. Uncertain-license tests use an explicit fixture; commercial review checks assert no adoption fields; the full default-profile copy assertion was removed.

```text
node --test tests/component-fit-matrix.test.cjs tests/component-routing.test.cjs tests/design-system-provider.test.cjs
After consumer correction: tests 38; pass 38; fail 0; skipped 0;
duration_ms 5502.7134; exit 0
```

The actual route smoke additionally exposed commercial React Bits Pro registry-copy/install metadata despite review status. Removed those fields from App UI and Depth Carousel and made selected/alternative route projections suppress executable adoption fields for explicit unverified/commercial states.

```text
node --test --test-name-pattern "never expose executable copy" tests/component-source-metadata.test.cjs
Before: tests 2; pass 0; fail 2; duration_ms 68.3838; exit 1
Actual registry-copy !== expected reference-adaptation

node --test tests/component-source-metadata.test.cjs tests/component-source-completeness.test.cjs tests/component-routing.test.cjs tests/component-source-routing.test.cjs tests/component-fit-matrix.test.cjs tests/design-system-provider.test.cjs tests/workflow-components.test.cjs
After: tests 104; pass 104; fail 0; skipped 0; duration_ms 6014.7997; exit 0
```

Final public CLI smoke from outside the worktree routed `depth carousel` as review/reference-adaptation without commercial package/install/source-code fields, and explicitly instructed study/reimplementation without copying. The independent completeness test also rejects executable commercial/unverified metadata in the index. A passing QA run that overlapped the last edits is superseded by a final post-edit full run; only that final run supplies delivery figures.

Final post-edit QA command exited 0 in 707.80 seconds:

```text
FONTTOOLS_PYTHON=D:/Temp/dp-fonttools-venv/Scripts/python.exe npm test
Repository: 133 files, 1314 tests, 1310 pass, 0 fail, 4 skipped
Repository runner duration_ms: 657986.989
Installed-package CLI smoke: 12 tests, 12 pass, 0 fail, 0 skipped
Reproducible tgz, zip and checksums: passed
Installed source/catalog CLI checks: passed
QA repository status preservation: byte-identical
Browser adapter self-test: OK
BuilderPort self-test: OK

npm run specs:check
Totals: 71 passed, 0 failed (71 items); exit 0

npm exec -- openspec validate consolidate-component-index-and-web-sources --strict
Change 'consolidate-component-index-and-web-sources' is valid; exit 0
```

The four repository skips are three optional native GEPA runtime scenarios (`GEPA_PYTHON` not prepared) and the Windows case-variant collision scenario (filesystem aliases case). No component-index/workflow regression was skipped. Final full output is `artifact://156`; strict specs output is `artifact://159`. `git diff --name-only -- skill/vendor` reported only `skill/vendor/README.md`, proving vendor manifests/upstream files were not changed. Temporary smoke HTML, manifest and state were removed after observation.

Delivery report was written to the requested absolute path after the local implementation commit. This checklist closeout is included in that local commit; the final non-self-referential commit SHA is recorded in the external report. No push was executed. The report lists all six canonical commercial/unverified sources plus Depth Carousel identity, linked shadcn.io implementations and separately paid scope boundaries requiring the owner's decision. Repository status was clean after the implementation commit and is checked again after checklist closeout.
