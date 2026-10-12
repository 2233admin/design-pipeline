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

## Round 2 implementation and acceptance

- [x] 9. Apply the user's dated license decisions, verify Motion/anime.js and expose usable animation discovery; resolve Depth Carousel identity only with public evidence.
- [x] 10. Use the existing catalog core to validate real manifest sources, contained usage files, markers and license handling; support explicit scratch manifests and reject contradictory decisions.
- [x] 11. Project saved gate next text and finding fixes through the same absolute command helper without changing saved evidence; prove external-directory execution.
- [x] 12. Check both web route and search exclude film/GEPA/Prompt Motion/HyperFrames methods and templates; fix only observed leakage.
- [ ] 13. Record focused failing-before/passing-after evidence and real CLI smokes, then freeze implementation bytes for full QA and strict specs validation.
- [ ] 14. Commit verified changes locally without pushing and write report-implement-round2.md with the final commit SHA.

### Round 2 acceptance boundaries

Items 9–12 correspond directly to brief items 1–4. Tests exercise real discovery, workflow completion and projected command execution rather than fixture field presence. Pure command-contract assertions do not require ffmpeg. License evidence is a technical source decision, not paid entitlement. Component Conformance and Visual Acceptance are reported separately; neither is inferred from repository QA.

The initial working tree was clean. `git fetch origin` succeeded; `git log --left-right --oneline origin/main...HEAD` showed only local merge `d62d0c2` and round-1 implementation `99aa5f3`, with no incoming target-only commit. The three-dot scope was the existing 37-file component-source/web-provenance change. `npm ci` installed the locked 145 packages; npm reported esbuild's install script blocked by its existing allowScripts policy.

### Round 2 manifest regression and smoke evidence

```text
node --test --test-name-pattern="round2 regression:" tests/workflow-components.test.cjs
Before: tests 6; pass 0; fail 6; skipped 0; exit 1
Log: .design-pipeline/round2-manifest-before.txt
```

The fabricated sourceId, missing consuming file, absent marker, unverified copy and contradictory scratch manifest incorrectly advanced to probe; Chinese scratch incorrectly remained at build. The same six assertions pass after the validator cutover.

```text
node --test tests/workflow-components.test.cjs
First after: tests 26; pass 25; fail 1; exit 1
Log: .design-pipeline/round2-manifest-first-after-failure.txt
After: tests 27; pass 27; fail 0; skipped 0; exit 0
Log: .design-pipeline/round2-manifest-after.txt
```

The first-after failure exposed spaced `React Bits` names missing the hyphenated repository-name contradiction check; matching the spaced identity fixed it. Additional direct validator checks cover contained real paths, named GitHub repositories, indexed state agreement, license notices and commercial adoption boundaries.

Actual public CLI smoke made 12 calls from outside its separate temporary project, all exit 0: Chinese decide recorded; missing scratch flag stayed at build; explicit scratch advanced to probe; fabricated source and missing file stayed at build; valid indexed, project-owned and named GitHub study manifests advanced to probe. Exact executable paths, roots, stdout/stderr and statuses are in `.design-pipeline/round2-manifest-cli-smoke.jsonl`.

```text
node --test --test-name-pattern="web quick walks|a rejected web draft|every command and record template|edit and web stages return" tests/workflow-next.test.cjs tests/workflow-action-commands.test.cjs
After fixture migration: tests 4; pass 4; fail 0; skipped 0; exit 0
Log: .design-pipeline/round2-manifest-fixture-compatibility.txt
```

### Round 2 saved gate regression and smoke evidence

```text
node --test --test-name-pattern="saved gate next|recorded gate repair" tests/workflow-action-commands.test.cjs
Before: tests 3; pass 1; fail 2; skipped 0; exit 1
Log: .design-pipeline/round2-gate-before.log
After: tests 3; pass 3; fail 0; skipped 0; exit 0
Log: .design-pipeline/round2-gate-after.log
```

The baseline returned the bare saved command; actual execution failed because Windows could not resolve `designer-pipeline`. After projection, the same saved gate's returned command executes from an unrelated directory using both absolute roots and a project path with spaces. Actual film blocks output is found/cached with catalogSize 1 and camera-orbit. Both projection and execution preserve state bytes; the unrelated directory stays empty. The existing offline catalog cache removes network and ffmpeg prerequisites from this contract smoke.

### Round 2 licensing, discovery and typed web evidence

```text
node --test tests/component-source-routing.test.cjs
Before discovery/filtering: tests 6; pass 4; fail 2; exit 1
Log: .design-pipeline/round2-license/before-routing.txt
node --test --test-name-pattern="owner decisions|GSAP" tests/component-source-routing.test.cjs
Before license decisions: tests 2; pass 0; fail 2; exit 1
Log: .design-pipeline/round2-license/before-license-routing.txt
node --test --test-name-pattern="proven public" tests/component-routing.test.cjs
Before public identity: tests 1; pass 0; fail 1; exit 1
Log: .design-pipeline/round2-license/before-depth-routing.txt
node --test tests/component-source-routing.test.cjs tests/component-routing.test.cjs tests/component-source-completeness.test.cjs
After: tests 22; pass 22; fail 0; skipped 0; exit 0
Log: .design-pipeline/round2-license/after-routing.txt
node --test --test-name-pattern="component route selects platform-specific" tests/designer-pipeline-cli.test.cjs
After public identity caller: tests 1; pass 1; fail 0; exit 0
Log: .design-pipeline/round2-license/after-depth-cli-test.txt
```

`gh api repos/motiondivision/motion/license` returned MIT, blob `81110442c72270dd317667cc52181522647401f2`, observed repository revision `e6bf03ead39cae7a2c5f8fe902ce8a9c1a9a22e8`. `gh api repos/juliangarnier/anime/license` returned MIT, blob `f999fa58ebdda6d8d0f3ae581ebdfe821f09603a`, observed revision `01b81be1df6843ccfe0a71c0699a746bf740dd77`; its existing pinned license is identical. Raw and decoded responses are under `.design-pipeline/round2-license/`.

GSAP uses `LicenseRef-GSAP-Standard-No-Charge`, with notice and competing no-code visual-animation-tool consent conditions recorded; it is not MIT. User decisions dated 2026-10-12 preserve all unverified/commercial study/reimplementation boundaries and no paid entitlement. Free verified scopes remain usable; Transitions Pro/Business, beUI Pro, Magic UI Pro and shadcn.io's 75 linked implementations do not inherit free-source permission.

Depth Carousel live JS-CSS and TS-TW registry objects match public repository objects and component contents at `496968c4117e21278f13917201b7d615bc5e7450`. License blob `6425315416e94469f28d0223a09f7285b2f785ab` is MIT + Commons Clause. Evidence: `.design-pipeline/round2-license/depth-carousel-identity-observations.json`. The public identity replaces the incorrect Pro identity without an alias.

Actual external-cwd public CLI evidence: `.design-pipeline/round2-license/before-cli.json` contains 14 baseline commands; `after-cli.json` contains 24 final commands covering route, default platform search and explicit-index platform search for spring animation, scroll reveal, timeline, film, GEPA, Prompt Motion, HyperFrames and depth carousel. Motion/anime.js are ready/findable for all three animation queries; GSAP for scroll/timeline. Search excludes all four non-web method/reference sources; source-only route queries return expected blocked exit 2. Public Depth Carousel routes ready. Search without platform retains Astryx.

Actual npm/ESM smoke installed seven packages only in an ignored temporary evidence prefix, then imported Motion 14.1.0, animejs 4.5.0 and GSAP 3.15.0. `motion.animate`, `motion.spring`, `animejs.animate`, `animejs.createTimeline` and `gsap.gsap.to` were observed functions; exit 0. Full setup/runtime output: `.design-pipeline/round2-license/import-smoke.txt`. These package versions are smoke observations, not new project dependency pins.

`git diff --exit-code HEAD -- skill/vendor` exited 0 before freezing: no vendor byte changes in round 2.
