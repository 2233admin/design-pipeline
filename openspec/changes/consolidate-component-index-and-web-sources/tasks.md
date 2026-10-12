## Implementation

- [x] 1. Extend the existing source catalog/schema/core and sourceId registry references; preserve existing IDs, source lineage and all vendor bytes.
- [x] 2. Register every required source and local pointer, verify license evidence, keep unresolved/commercial sources reference-only and exclude film/GEPA from web ranking.
- [x] 3. Replace the stale MengTo projection and fixed count with pinned-manifest equivalence; complete vendor navigation.
- [x] 4. Add independent inventory-derived index coverage, path containment, unique identity, licensing and projection tests; register new tests.
- [x] 5. Add components decisions immediately before every web build, with absolute-path record commands and decision-aware instructions. UI has generic work/delivery evidence, not an equivalent HTML build; retain it and document that boundary.
- [x] 6. Make HTML plus valid component-manifest.json an existing build completion condition; update required workflow and routing guides.

## Verification and delivery

- [x] 7. Record targeted regressions' failing-before and passing-after output, plus actual outside-directory CLI smoke evidence.
- [x] 8. Run `FONTTOOLS_PYTHON=<fonttools-python> npm test`, `npm run specs:check`, and `npm exec -- openspec validate consolidate-component-index-and-web-sources --strict`.
- [x] 9. Commit verified repository changes without pushing and write `<main-checkout>/.design-pipeline/component-survey/report-implement.md` with items 1–3, QA figures, commit SHA and unresolved license decisions.

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

Parent public-CLI smoke ran from `<main-checkout>`, outside the smoke project in this worktree: next returned components even when HTML existed; the returned absolute decide command preserved the answer; HTML without a manifest stayed build; scratch plus `{\"entries\":[]}` reached probe; changing the reply to index discovery returned build despite the same empty manifest; explicit scratch reached probe again. Explicit source search found GEPA as a doc with webRanking false. Returned route/search commands also executed successfully in the workflow regression.

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
FONTTOOLS_PYTHON=<fonttools-python> npm test
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

The four repository skips are three optional native GEPA runtime scenarios (`GEPA_PYTHON` not prepared) and the Windows case-variant collision scenario (filesystem aliases case). No component-index/workflow regression was skipped. Full QA and strict specs figures are recorded above. `git diff --name-only -- skill/vendor` reported only `skill/vendor/README.md`, proving vendor manifests/upstream files were not changed. Temporary smoke HTML, manifest and state were removed after observation.

Delivery report was written to the requested absolute path after the local implementation commit. This checklist closeout is included in that local commit; the final non-self-referential commit SHA is recorded in the external report. No push was executed. The report lists all six canonical commercial/unverified sources plus Depth Carousel identity, linked shadcn.io implementations and separately paid scope boundaries requiring the owner's decision. Repository status was clean after the implementation commit and is checked again after checklist closeout.

## Round 2 implementation and acceptance

- [x] 9. Apply the user's dated license decisions, verify Motion/anime.js and expose usable animation discovery; resolve Depth Carousel identity only with public evidence.
- [x] 10. Use the existing catalog core to validate real manifest sources, contained usage files, markers and license handling; support explicit scratch manifests and reject contradictory decisions.
- [x] 11. Project saved gate next text and finding fixes through the same absolute command helper without changing saved evidence; prove external-directory execution.
- [x] 12. Check both web route and search exclude film/GEPA/Prompt Motion/HyperFrames methods and templates; fix only observed leakage.
- [x] 13. Record focused failing-before/passing-after evidence and real CLI smokes, then freeze implementation bytes for full QA and strict specs validation.
- [x] 14. Commit verified changes locally without pushing and write report-implement-round2.md with the final commit SHA.

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

### Round 2 frozen-tree full verification and delivery

Implementation commit: `8377bacfc1577503d02ce58eb8be72d0ff2a7445`. Tested Git tree: `d9dda1b24328bc2543e27d4cab7260a852bbde83`; `git write-tree` returned the same value before and after full verification. All workers had finished and implementation, tests and source documentation were frozen during both checks.

```text
cmd /d /c "set FONTTOOLS_PYTHON=<fonttools-python>&&npm test"
Exit 0; wall time 664.47 seconds
Repository: 133 files; 1342 tests; 1338 pass; 0 fail; 4 skipped
Repository duration_ms: 620975.5948
Installed-package CLI smoke: 12 tests; 12 pass; 0 fail; 0 skipped
Reproducible tgz, zip and checksums: passed
Installed source/catalog checks: passed
QA repository status preservation: byte-identical
Browser adapter self-test: OK
BuilderPort self-test: OK
Full output figures recorded above.

npm run specs:check
71 passed; 0 failed; exit 0
Includes strict validation of this change
Full output figures recorded above.
```

The four skips are three optional native GEPA scenarios without prepared GEPA_PYTHON and one filesystem case-alias collision scenario. No round-2 acceptance regression was skipped. Parent public CLI smoke from an unrelated temporary directory additionally routed spring animation successfully and searched HyperFrames with platform web to an empty result, both exit 0.

The external report is `<main-checkout>/.design-pipeline/component-survey/report-implement-round2.md`. The implementation is committed locally; no push occurred. This final tasks closeout is evidence-only, after the tested implementation commit, and does not change code, tests, catalog or source guides. Its final non-self-referential delivery SHA is recorded in the external report. Technical Component Conformance evidence is separate from Visual Acceptance, which was not assessed.

## Round 3 items 1–3 implementation and focused evidence

- [x] 9.1 Record required explicit component source choices in canonical `project,github,index,scratch` order; preserve the user's answer, reject invalid combinations and missing GitHub URLs, and reask legacy answer-only states.
- [x] 9.2 Replace answer-name inference with the recorded source set in the existing manifest validator; preserve all per-entry provenance, usage and license rules.
- [x] 9.3 Return invalid-manifest validator messages in existing build action findings and readable instructions, without a new gate or status.
- [x] 9.4 Scope the returned index search to `--platform web`; migrate existing test callers and update workflow guides, spec scenarios, CLI help and CHANGELOG.

The authorized public seams are CLI/next/decide/search and the existing manifest validator. All 14 round-3 contract regressions are independent of ffmpeg.

```text
node --test --test-name-pattern "round3 regression" tests/workflow-components.test.cjs
Before runtime changes: tests 14; pass 1; fail 13; skipped 0; exit 1
duration_ms 493.2488
After runtime changes: tests 14; pass 14; fail 0; skipped 0; exit 0
duration_ms 520.4962
```

Before: invalid choices were accepted; componentSources was absent; legacy answer-only state reached probe; all three specified scratch answers stayed at build; project/index choices accepted a scratch manifest; fabricated-source actions omitted the validator message; the returned search included cinetic, Prompt Motion and product-film records disabled for web ranking. The GitHub scratch contradiction already failed under the old URL heuristic, accounting for the one passing baseline test. After: every regression passes, including persisted canonical deduplication, unchanged answer bytes, source-set-only scratch behavior, existing finding shape and execution of the returned search command with query `film`.

An intermediate green run had tests 14; pass 13; fail 1; exit 1 (`duration_ms 485.0153`): findings carried the correct validator message but the readable build instruction omitted it. Prefixing the instruction with the existing finding message and fix resolved that failure; it was not suppressed. Exact local outputs are `.design-pipeline/round3-red.txt` and `.design-pipeline/round3-intermediate-green.txt`.

```text
COMPONENT_MANIFEST_SMOKE_LOG=.design-pipeline/round3-cli-smoke.jsonl node --test --test-name-pattern "actual CLI outside the project|round3 regression: returned search" tests/workflow-components.test.cjs
tests 2; pass 2; fail 0; skipped 0; exit 0
duration_ms 1215.7457
```

The smoke executed 12 public CLI commands from a directory outside the temporary project: components ask, scratch choice recording, invalid scratch manifest remaining at build, valid scratch reaching probe, index choice and fabricated/missing-usage manifests remaining at build with validator diagnostics, and valid indexed/project-owned/decision-named GitHub manifests reaching probe. Every CLI command exited 0; invalid manifests correctly remained unfinished rather than becoming usage errors. The additional search smoke executed the command returned in the build instruction with query `film`, exit 0, and found no web-disabled records. Exact ignored local evidence: `.design-pipeline/round3-cli-smoke.jsonl` and `.design-pipeline/round3-cli-smoke-output.txt`.

```text
node --test tests/workflow-components.test.cjs tests/workflow-action-commands.test.cjs
tests 74; pass 73; fail 0; skipped 1; exit 0
duration_ms 3460.1285
node --test --test-name-pattern "web" tests/workflow-next.test.cjs
tests 7; pass 7; fail 0; skipped 0; exit 0
duration_ms 143.6617
```

The one skip is the preexisting host filesystem case-alias collision test. An earlier combined command (`node --test tests/workflow-components.test.cjs tests/workflow-next.test.cjs tests/workflow-action-commands.test.cjs`) reached the tool's 120-second deadline without a final summary; all printed component/action tests passed, but that invocation is not claimed as successful. Focused affected files and all web-next cases completed with the figures above; the integration owner still runs the complete frozen QA suite. A preliminary Windows smoke invocation with escaped filter quotes matched no individual smoke cases (only the file runner); it is not counted as smoke evidence. The subsequent correctly supplied filter executed and passed both named cases.

The integration owner normalized preexisting machine-specific paths and session-only references, preserving commands and observed numbers. Full QA and strict specs validation run on the frozen final tree; the local external report records their results and the delivery commit SHA. No post-verification repository evidence edit is required.


### Integration regression — indexed project-owned scratch boundary

The indexed `project-components` record is explicitly project-owned in both availability and license state. Scratch permits that boundary as well as contained project paths; external records remain forbidden. Integration found and corrected the local ownership flag so it also recognizes this existing indexed boundary.

```text
node --test --test-name-pattern "scratch accepts the indexed" tests/workflow-components.test.cjs
Before: tests 1; pass 0; fail 1; skipped 0; exit 1
duration_ms 61.9446
Error: component manifest: entries[0] external source contradicts fromScratch

node --test --test-name-pattern "round3 regression" tests/workflow-components.test.cjs
After: tests 15; pass 15; fail 0; skipped 0; exit 0
duration_ms 558.8762
```

The added regression validates the manifest through the public validator and executes the actual `next --json` CLI, observing stage `probe` for the indexed project-owned scratch entry. This is item 1's permitted project-owned-only behavior, not a new source policy.

### Integration regression — components decision lineage

- [x] 10.1 Invalidate downstream evidence when a different components answer or source set is recorded: reuse the review-rejection invalidation (drop film/edit/interaction gates and delivery fields) through one helper. An identical answer and canonical set changes nothing. A legacy answer-only state has no recorded set, so any re-record there invalidates; that state already asks components again.

```text
node --test --test-name-pattern "lineage regression" tests/workflow-components.test.cjs
Before: tests 3; pass 1; fail 2; skipped 0; exit 1
✖ lineage regression: changed components decision invalidates a quick interaction pass
  AssertionError [ERR_ASSERTION]: 'done' !== 'probe' (tests/workflow-components.test.cjs:464)
✖ lineage regression: changed components decision unbinds review and delivery
  AssertionError [ERR_ASSERTION]: 'done' !== 'probe' (tests/workflow-components.test.cjs:476)
✔ lineage regression: identical components re-record keeps checked evidence

After: tests 3; pass 3; fail 0; skipped 0; exit 0
✔ lineage regression: changed components decision invalidates a quick interaction pass
✔ lineage regression: changed components decision unbinds review and delivery
✔ lineage regression: identical components re-record keeps checked evidence

node --test tests/workflow-components.test.cjs
tests 45; pass 45; fail 0; skipped 0; exit 0
```

Before the fix, the changed decision left the passed interaction gate, the accepted draft and the delivery bound to unchanged page hashes, so `next` reported done. After it, the quick tier returns to probe with no interaction gate; on the standard tier, re-recording an interaction pass with identical hashes returns to review with the delivery fields removed.

- [x] 10.2 Never rewrite recorded review verdicts. Web review drafts record `componentDecision`, the sha256 of the canonical components answer and source set they judged; review completes only when the last accept carries the current digest (film and edit carry none). A changed decision therefore leaves every draft byte-identical yet requires a fresh review, replacing 10.1's first approach of deleting `inputHashes` from history.

```text
node --test --test-name-pattern "lineage regression" tests/workflow-components.test.cjs
Before (10.1 code): tests 3; pass 2; fail 1; exit 1
✖ lineage regression: changed components decision requires a fresh review and delivery
  AssertionError [ERR_ASSERTION]: recorded review verdicts and their bindings are never rewritten
  (actual draft lacks inputHashes; tests/workflow-components.test.cjs:482)

After: tests 3; pass 3; fail 0; exit 0
✔ lineage regression: changed components decision invalidates a quick interaction pass
✔ lineage regression: changed components decision requires a fresh review and delivery
✔ lineage regression: identical components re-record keeps checked evidence
```

### PR review regression — source categories and first explicit decision

- [x] 10.3 Bind each manifest entry's source category to the recorded `componentSources`, judged by how the entry cites its source: `project` for a contained project file or the indexed project-owned `project-components` record, `github` for a decision-named GitHub URL, `index` for every other indexed `sourceId`, platform records included. Scratch manifests keep their existing rules. The validator message names the entry, its category and the recorded set, and tells a github-only set to cite the named repository by url. Existing tests that paired a project file or GitHub URL entry with an `index` decision now record the matching choice.
- [x] 10.4 Record the first explicit components decision as a change too: a legacy web state with a checked page but no components decision loses its interaction pass and delivery, so a quick workflow returns to probe instead of reporting done. A fresh project has no checked evidence, so nothing changes there; identical re-records still change nothing.

```text
node --test --test-name-pattern "category regression|lineage regression" tests/workflow-components.test.cjs
Before: tests 5; pass 3; fail 2; exit 1
✖ category regression: each entry's source category must be in the recorded componentSources
  AssertionError [ERR_ASSERTION]: Missing expected exception.
  (project-only decision accepted indexed shadcn-ui/ui; tests/workflow-components.test.cjs:506)
✖ lineage regression: first explicit components decision invalidates a legacy interaction pass
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal
  (the interaction gate survived the first decide; tests/workflow-components.test.cjs:526)

validateComponentManifest per case, before -> after:
project + indexed shadcn-ui/ui:                 accepted -> rejected: entries[0] source category index is not in the recorded componentSources project
index + contained project file:                 accepted -> rejected: entries[0] source category project is not in the recorded componentSources index
github (example/library) + indexed shadcn-ui/ui: accepted -> rejected: entries[0] source category index is not in the recorded componentSources github
github (shadcn-ui/ui) + indexed shadcn-ui/ui:    accepted -> accepted
project,index + one entry of each:              accepted -> accepted

After: tests 5; pass 5; fail 0; exit 0
✔ lineage regression: changed components decision invalidates a quick interaction pass
✔ lineage regression: changed components decision requires a fresh review and delivery
✔ lineage regression: identical components re-record keeps checked evidence
✔ category regression: each entry's source category must be in the recorded componentSources
✔ lineage regression: first explicit components decision invalidates a legacy interaction pass

node --test tests/workflow-components.test.cjs tests/workflow-next.test.cjs tests/workflow-action-commands.test.cjs
tests 168; pass 167; fail 0; skipped 1
```

The skip is the preexisting host filesystem case-alias collision test. Full QA and strict specs validation run on the committed tree.

- [x] 10.5 Follow the PR review's exact rule (CodeRabbit: an entry resolved to an indexed source by sourceId is rejected when componentSources omits index). 10.3's first version let an indexed sourceId for a decision-named repository satisfy github and left platform records unconstrained; both now count as index.

```text
node --test --test-name-pattern "category regression" tests/workflow-components.test.cjs
Before (updated assertions on the 10.3 validator): tests 1; pass 0; fail 1; exit 1
✖ category regression: each entry's source category must be in the recorded componentSources
  AssertionError [ERR_ASSERTION]: Missing expected exception.
  (github (shadcn-ui/ui) + indexed shadcn-ui/ui was accepted; tests/workflow-components.test.cjs:509)

node --test tests/workflow-components.test.cjs
After: tests 47; pass 47; fail 0; skipped 0; exit 0
github (shadcn-ui/ui) + indexed shadcn-ui/ui: rejected: entries[0] source category index is not in the recorded componentSources github; cite a named GitHub repository by url instead of sourceId
github (shadcn-ui/ui) + the same library by url:  accepted
project + native-dom (platform):                 rejected: entries[0] source category index is not in the recorded componentSources project
index + native-dom (platform):                   accepted
```

- [x] 10.6 Follow two further PR review findings. Route validates every component entry's routing metadata before filtering candidates, restoring the v1 order, so malformed metadata on an entry filtered out by web ranking or record type still fails. `decide --stage components` is refused for film, edit and ui workflows before it can change their state or drop their gates and delivery.

```text
node --test --test-name-pattern "filters out|outside web workflows" tests/component-routing.test.cjs tests/workflow-components.test.cjs
Before: tests 2; pass 0; fail 2; exit 1
✖ route validates routing metadata on every component entry, including ones web ranking filters out
  AssertionError [ERR_ASSERTION]: Missing expected exception. (tests/component-routing.test.cjs:166)
✖ components decisions are rejected outside web workflows and leave their state untouched
  AssertionError [ERR_ASSERTION]: Missing expected exception: film (tests/workflow-components.test.cjs:545)

After: both pass
✔ route validates routing metadata on every component entry, including ones web ranking filters out
✔ components decisions are rejected outside web workflows and leave their state untouched
```
