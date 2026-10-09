# GEPA integration verification — 2026-10-09

## Result and scope

The independent supporting-tool route reaches the maintained GEPA guide, complete official
source skill and callable native optimizer. It remains optional for ordinary design production.
The optimizer exports proposals and does not adopt guidance, change existing gates/receipts,
or grant Component Conformance or Visual Acceptance. Existing unrelated working-tree changes
were preserved. The initial implementation verification did not commit, publish or replace
the installed skill.

## Publication scope and validation

At the user's explicit request, the GEPA-only changes were prepared on
`codex/internalize-gepa-optimization`, based on `origin/main` at
`7205ee80f1328ce85550bc3fd18a1f8d3f91f799`, in a separate managed worktree.
The original workspace's Git status and tracked diff hashes remained unchanged.
No unrelated Good CSS, Taste, film or other pending changes were included.

- `npm ci` passed; no dependency or lockfile changes were needed.
- Strict OpenSpec validation passed all 47 items in this publication tree.
- GEPA source/native tests: 11 total, 10 passed, 0 failed, 1 dependency-absence
  check skipped because the reviewed native dependency was available.
- The first canonical `npm test` run passed all 965 repository tests (964 passed,
  1 skipped) and all 12 installed-package CLI tests. Its overall exit was 1 because
  the host's global `*.bin` ignore matched an already-tracked MengTo source asset,
  and the two package snapshots differed while a concurrent syntax review created
  then removed ignored Python bytecode in the source tree.
- A subsequent canonical run used only process-scoped Git excludes and
  `PYTHONDONTWRITEBYTECODE=1`, without changing host configuration. Reproducible
  tgz/zip/checksums, archive resources, isolated installation/dependency checks and
  all 12 installed CLI tests passed. One existing repository CLI test encountered
  `spawnSync node.exe ENOENT` when starting the feedback kernel; the other 963
  repository tests passed and 1 was skipped. The complete affected CLI file was
  rerun separately and passed 12/12. No maintained-code workaround was introduced.
- Both browser-tool self-tests passed via `npm run test:browser`.
- An independent publication review found no actionable scope, credential,
  resource-registration or dependency findings. The first packaging discrepancy
  was absent on the static-source rerun.

The checks above passed across the recorded runs; they do not claim a single full
`npm test` invocation exited 0 in this publication worktree. Full QA and focused
logs remain under its ignored `.design-pipeline/gepa-publication-*.log` paths.
Publication does not merge the branch, publish a release or replace the global skill.

## Source and environment

- Upstream: `https://github.com/gepa-ai/gepa`, revision
  `462e437a09be67d2acb59564cc0ea59132f5777c`.
- Root Git tree: `105cafea9959b259f1fa63ca0b5b375bcc611b9e`.
- Imported scope: all seven official skill files plus LICENSE, README and pyproject metadata;
  10 files, 107619 bytes, preserved as original Git blobs.
- Scoped SHA-256: `c8bc85080ff2179e42879d573a29fa4f7d779e179da67a9d37528b8d2cfc2795`.
- Node.js 26.3.1, Python 3.14.7, uv 0.12.23; native dependency reports GEPA 0.1.4.
  The documented uv command installed the exact Git revision from the pinned requirements.
  The early task-local test environment installed the reviewed checkout; final provenance checks
  use that isolated environment reinstalled from the exact Git requirement, with matching
  `direct_url.json` Git commit metadata. Unknown local-directory provenance is now rejected.

## Actual native execution

The guide's uv command ran `--max-evals 20` without provider credentials or model calls.
Output remains under ignored `.design-pipeline/gepa/native-smoke-20261009/`.

- Two native candidates, parents `[[null], [0]]`.
- Validation and final-test scores: seed 0, selected candidate 1.
- Search evaluation count and native metric-call count: 20; recorded inference cost: 0.
- Seed, task and frozen split hashes unchanged; selected text, unified diff, native history,
  metadata and final-test comparison exported with status `proposed`.
- Component Conformance and Visual Acceptance both `not-evaluated`.
- Tests inspect native reflection records and evaluation logs to establish that the final-test
  sentinel is absent from search evidence. The native seed baseline runs before search and the
  selected-candidate final test afterward, both outside the search budget.

These are synthetic integration scores, not evidence of design-quality improvement.

## Checks

- `npm run sources:check`: 49 passed, 0 failed.
- `npm run specs:check`: 56 items passed, 0 failed.
- `npm test`: exit 0; repository tests 1055 total, 1054 passed, 0 failed, 1 skipped
  (the missing-GEPA branch in a prepared native environment). All 113 declared test files ran.
  The installed-package CLI suite passed 12/12; both browser-tool self-tests passed.
- QA verified reproducible tgz/zip/checksums, archive resource coverage, isolated installation,
  installed dependency checks, existing public CLI journeys and byte-identical repository status.
- The existing component-eval/workflow suites were slow while copying and hashing the complete
  skill tree and executing real browser/native CLI fixtures; observed progress and final exit 0
  resolved that concern. No unrelated test or implementation was changed for speed.
- Final focused checks cover feedback export, runtime provenance and aggregate overflow guards
  added after the full QA's initial GEPA phase: 11 tests, 10 passed, 0 failed, 1 skipped
  (dependency absence in a prepared environment). Ordinary Python without GEPA separately
  passed 4/4 available checks, including clear dependency-absence failure and provenance
  rejection; its three native checks were skipped and are covered above. All seven runtime
  tests and all four source tests have executed in their applicable environments.
  Nonfinite/circular feedback and aggregate-overflow failures retain `result.json`, and
  printable diagnostic objects remain accepted. The existing core implementation did not
  change after full QA; scoped tests, strict specs and package/native checks were repeated.

## Final package and relocation

`npm run package:skill -- --output-root .design-pipeline/gepa-pinned-package-20261009` passed.
The final tgz was extracted to a fresh isolated directory with Python's standard tarfile data
filter, then installed by the packaged `install-local.cjs`. The installed dependency checker
passed with `DESIGN_PIPELINE_SKILL_ROOTS` explicitly pointing at that isolated install root.
The packaged optimizer successfully ran the same budget-20 study; its helper bytes match the
final repository source. Output: ignored `.design-pipeline/gepa-pinned-installed-run-20261009/`.
The result records runtime GEPA 0.1.4 at the exact reviewed Git commit, a two-candidate pool
with parent lineage, unchanged inputs, 20 search evaluations and final-test scores 0 → 1.

The host's Windows tar failed on existing Huashu source filenames containing non-ASCII text;
Python extraction succeeded. An initial dependency check without the isolated-root override
inspected the older global installation instead; the corrected explicit-root check passed.
Neither diagnostic required a maintained-code change or global installation update.

## Review and limits

The first reviewer confirmed the feedback-export regression, but exceeded its assigned
read-only scope by editing the helper/test/README and change records. Root and the runtime
owner audited and took over these new-task edits, restored the minimal fixture-only helper,
and verified the final export-compatible feedback check. The strict interim validation is
not retained. A fresh review with no inherited implementation history identified the unchecked
runtime-provenance gap. The helper now compares installed Git provenance with the existing
bundled manifest, rejects shadow imports and records actual runtime identity. Both the native
and dependency-absence environments passed the final tests, and the regenerated archive passed
isolated install/dependency/native checks. The same independent reviewer rechecked the fix
read-only and reported the provenance finding resolved, with no remaining actionable findings
in the scoped review. Its review did not inspect unrelated dirty files or run full builds/QA.

No paid/model-string inference, real design/rendering quality comparison or owner visual
acceptance was evaluated. Those need a trusted real evaluator, independently calibrated cases,
explicit optional provider dependencies/credentials and scoped review before adoption.
Multica returned server errors; scope, progress and evidence are retained in this change and
chat for later tracker reconciliation. Code-Intel was unavailable due the previously recorded
oversized graph and glossary case mismatch; bounded inspection and real checks were used.

Local full logs and runs remain in ignored `.design-pipeline/`; they are diagnostic experiment
output, not new gate receipts or a published release.
