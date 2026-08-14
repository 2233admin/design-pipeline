# QA: Layered Adaptation Experiment

## Acceptance Matrix

| Area | Required evidence |
| --- | --- |
| Frozen boundaries | Attempts to alter Kernel, project constraints, gate thresholds, or evaluation criteria fail closed and leave the incumbent unchanged. |
| Precedence | Conflicting valid guidance resolves exactly one value per collaboration dimension as task > project > user > defaults while constraints/gates remain enforced. |
| Ephemerality | A Task Session Policy affects only its task and cannot become durable evidence without a separate candidate. |
| Candidate bounds | Only one explicit `add`, `replace`, or `delete` diff is admitted; malformed, broad, secret-bearing, or profile-like input is rejected. |
| Contract shape | Durable rules select only finite collaboration dimensions; free-form behavioral instructions and candidate/skill schema drift fail closed. |
| Independence | Held-out fixtures cannot overlap candidate-construction evidence; replay and held-out arms use the same pinned manifest for candidate and incumbent. |
| Promotion | Promotion succeeds only when all required gates pass and both comparisons strictly improve the predeclared primary metric in its declared direction. |
| Negative results | Tie, partial/unknown evidence, regression, evaluator conflict, and required-gate failure reject without changing live guidance. |
| Lifecycle | Review, opt-in, reject, rollback, expiry, and scoped forgetting produce inspectable receipts; successor chains must roll back before dependent snapshots are scrubbed and tombstones retained. |
| Recovery | Failpoints before and after external-skill writes prove deterministic recovery; a live owner excludes concurrent recovery and later versions supersede/restore exact predecessors. |
| Data minimization | Experience content and raw recorder/proposer/evaluator/approval/rejection labels do not enter the ledger; evidence metadata and dispositions remain hash-bound. |
| Default safety | Shadow mode never changes live task behavior; no RL, weight training, hidden profile, or silent adaptation path is reachable. |

## Verification Status

Verified on 2026-08-15 (Asia/Shanghai). A passing aggregate does not override a required failed or
unknown row; every acceptance row above was exercised by the focused lifecycle suite and the
independent black-box/adversarial runs.

| Command or review | Result |
| --- | --- |
| `node --test tests/adaptation.test.cjs` | PASS, 9/9. Covers bounded operations, finite dimensions, evidence/actor privacy, independent replay and held-out evaluation, declared maximize/minimize direction, negative transfer, scope precedence, immutable boundaries, incumbent/path/hash binding, tamper detection, process-owned journals, sequential versions, rollback, dependent-snapshot forgetting, tombstones, and full public CLI lifecycle. |
| `node --test tests/adaptation.test.cjs tests/designer-pipeline-cli.test.cjs tests/install-local.test.cjs tests/package-release.test.cjs` | PASS, 29/29. |
| `npx openspec validate internalize-layered-adaptation --strict` | PASS. |
| Independent public-CLI black-box experiment | PASS. `record` ×2 → `propose` → `evaluate` → interrupted `promote` recovery → `resolve` → `rollback` → `forget` → `check`; a second run proved dimension-keyed precedence, hash-only actor/review labels, and sequential promotion rollback. |
| Four-round adversarial review plus final narrow audit | PASS, no remaining P0–P2. Reproductions covered journal concurrency, dead-owner recovery, semantic gate bypass, schema/runtime drift, scope/path attacks, incumbent drift, disposition tampering, successor-chain forgetting, and lock exit semantics. |
| `node scripts/qa.cjs` | PASS, `QA_EXIT=0`: 60 repository test files (477 tests), reproducible tgz/zip/checksums, complete archive resources, isolated install/replacement, installed dependency self-check, installed adaptation/playground smoke, and installed public CLI smoke. |
| `git diff --check` | PASS; only existing CRLF conversion warnings were emitted. |

The source-tree foundation checks reported `DESIGN.md` and `MOTION.md` ready. A separate check of a
previously installed global copy found it stale relative to this repository and missing newer
resources; the hermetically packaged and isolated installation produced by this change passed its
dependency self-check, so the stale global copy is recorded as local environment drift rather than
release evidence.
