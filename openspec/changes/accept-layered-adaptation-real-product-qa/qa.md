# Layered adaptation / Playground / capability-route acceptance

Date: 2026-08-15 (Asia/Shanghai)

Decision: **CONDITIONAL GO** for the new hardening PR and a bounded, instrumented next-stage pilot.
This is **NO-GO for broad rollout or a generalization claim** until the gaps below have evidence.

The baseline under test is PR #23 merge `6aeec59` on `main`. The final CodeRabbit review was read
from [PR #23](https://github.com/2233admin/design-pipeline/pull/23); the six executable findings are
listed below with their pre-fix reproduction and regression coverage. No merged history was rewritten.

## Acceptance gates and results

| Gate | Threshold | Raw command | Exit / status | Artifact / hash | Failure evidence |
| --- | --- | --- | --- | --- | --- |
| Stale-lock ownership | A stale owner must be quarantined without deleting a replacement lock; fresh ownership must survive | `node --test tests/adaptation.test.cjs` | `0`; 14/14 pass | Regression `stale-lock reclaim preserves a lock that changed during quarantine` | Before fix, direct unlink was TOCTOU-prone; injected replacement was deleted. After fix, replacement token survives and check is blocked. |
| Own-property lookup | `__proto__` and `constructor` must be rejected as IDs and must not mutate prototypes | `node --test tests/adaptation.test.cjs` | `0`; 14/14 pass | Regression `identifier lookups reject inherited map keys` | Before fix, `reject({candidate:"__proto__"})` returned rejected and polluted `Object.prototype`; after fix it returns NOT_FOUND. |
| Blocked envelope | Blocked check must expose the ready envelope keys and neutral values | `node --test tests/adaptation.test.cjs` | `0`; 14/14 pass | Regression `blocked check envelopes retain the ready result shape` | Before fix, `scope`, `receipts`, and `expiredRules` were absent. |
| Independent promotion chains | Removing a predecessor dimension must not erase another chain's active rule | `node --test tests/adaptation.test.cjs` | `0`; 14/14 pass | Regression `independent promotion chains do not delete each other's dimensions` | Before fix, cross-chain `check` dropped the independent detailed rule while `resolvePolicy` kept it. |
| Release error preservation | A lock-release/read failure must not replace the original operation error | `node --test tests/adaptation.test.cjs` | `0`; 14/14 pass | Regression `lock release cannot mask the operation error` | Before fix, synthetic lock-read failure masked the invalid-scope error; after fix the scope error is preserved. |
| macOS kernel path guard | Case-insensitive kernel path protection must cover Darwin as well as Windows | `node --test tests/adaptation.test.cjs` | `0`; 14/14 pass | Guard includes `win32` and `darwin` | Darwin was not available in this runner, so the branch is statically guarded and covered by the platform condition; a macOS runner remains a gap. |
| Repository QA | Contracts, all listed tests, syntax, packaging, reproducibility, install, and installed CLI smoke must pass | `node scripts/qa.cjs` | `0`; 60 repository tests and all QA reports OK | Reproducible tgz 93,625,809 bytes; zip 108,680,475 bytes; checksums generated and compared in two isolated package roots | No failure. QA also reported byte-identical repository status before/after. |
| Fixture foundations / direction | DESIGN and MOTION are ready; preview and selection are ready; fixed viewport and three candidates are visible | `node openspec/changes/accept-layered-adaptation-real-product-qa/fixture/create.cjs --output-root openspec/changes/accept-layered-adaptation-real-product-qa/fixture/project` then `node openspec/changes/accept-layered-adaptation-real-product-qa/fixture/run.cjs --root openspec/changes/accept-layered-adaptation-real-product-qa/fixture/project` | Both `0`; foundation/preview/selection `ready` | DESIGN SHA-256 `a6fbac7d539e55624b17200037a9b5b236f9b82661b8a694a085803d2a107ebb`; MOTION SHA-256 `9df81b34d5f9e6b249441f8b430162878ada37257bb265b836ccfdae527e0d1b` | An invocation without the required explicit `--root` failed `ROOT_NOT_FOUND` (exit 1); the documented reproducible invocation passes. |
| Four single-file Playgrounds | Architecture visualization, component design adjustment, layout brainstorming, and game balance each need 3 controls, 3 presets, an immediate preview/prompt, copy affordance, and a next-task feedback edge | Same `fixture/run.cjs --root ...` command | `0`; four integration checks `ready`; 4 transitions, 3 feedback edges applied | `playground-feedback.json` SHA-256 `d65f432498ce5eb7633945ac7de281bce4a9e81a2ac016dae3c7ffd506c67d6a`; `acceptance-run.json` SHA-256 `b0052d4380fdd2cb5c7a6937a136b65badc7eae0b9f5a26e8e08ff280fd84c73` | The fixture records browser-style verification metadata and DOM contract checks; no independent visual reviewer or real browser session was run, so visual quality is not claimed. |
| Component capability route | Decompose the query, resolve the registry, and verify the receipt | Included in `fixture/run.cjs --root ...` | `0`; `decompose=ready`, `resolve=ready`, `verify=verified` | `component-resolution.json` and `component-receipt.json` under the fixture root; installed CLI smoke also passed | No failure. There is no separate public `component route` action; routing is exercised through decompose/resolve/verify. |
| Adaptation lifecycle / human-readable CLI | Candidate rule, evidence hashes, metric, scope, promotion chain, blocked reason, rollback target, and forget tombstones must be inspectable from JSON CLI output | Included in `fixture/run.cjs --root ...` | `0`; three proposals/evaluations/promotions passed; deliberate forget exit `2` with `BLOCKED`; final check `ready` | `acceptance-run.json` SHA above; active ledger 17,550 bytes, SHA-256 `38b6d64cb9576cfb716abf61e6879e83073c4020c10aaf1237ef9f29c5279bfd`; active rules: communication-density=concise, representation=diagram-first, evidence-order=evidence-first; final: 0 active rules, 3 tombstones | The CLI exposes rule/evidence/scope/chain hashes and the exact live-chain block reason. It does not yet render a human diff of the target skill; this is a P1 inspect/diff gap. |
| Baseline vs adapted effects | Same fixed task list and manifest; disjoint construction/replay/held-out IDs; independent evaluator; all three required dimensions improve correction count and score; invariants remain true | `node .../fixture/evaluate.cjs --root openspec/changes/accept-layered-adaptation-real-product-qa/fixture/project` | `0`; `status=ready`, `partitionOverlap=false`, `invariantsPass=true`, evaluator `independent-evaluator` | Manifest SHA-256 `da3b2f75c7b36a5b417507213620d47b80f1f75c2a1be5e6f45f820ac6844369`; `evaluation-result.json` SHA-256 `f6d59dca18b5675570c6134c78a81bc018cf73e24aef6a6b5dbfd8dc5e1fbae3` | Synthetic-only evidence. Effect sizes: communication corrections `-2`, score `+0.19`; representation `-2`, `+0.21`; evidence-order `-3`, `+0.29`. No population/generalization claim. |
| Concurrency / abort / locks | Two real processes produce exactly one commit; abort recovers; live lock blocks; dead lock is recoverable | `node .../fixture/security-recovery.cjs --output openspec/changes/accept-layered-adaptation-real-product-qa/fixture/project/security-recovery-result.json` | `0`; child exit codes `0,1`; committed experiences `1`; recovered/live/dead = `ready/blocked/ready` | `security-recovery-result.json` SHA-256 `40765e4c2fe6b1b10729a06cefc400c32084b6cf476ebce8ee218dd26bbae1b3` | No failure. |
| Tamper / path / scope / rollback / forget | State/evidence/candidate/promotion integrity, path and symlink containment, scope isolation, successor rollback and forget must fail closed or recover | `node --test tests/adaptation.test.cjs` plus the security command above | `0`; tests pass; security: tamper `blocked`, path/symlink contained, rollback chain complete | Adaptation test tamper cases cover candidate, evidence, and promotion integrity; security artifact covers state tamper/path/symlink; final tombstones are in `acceptance-run.json` | No failure. |
| 20-task maintainability | Record/check all 20 tasks; report latency and ledger growth; do not count ledger growth as adaptation benefit | `node .../fixture/scale.cjs --output openspec/changes/accept-layered-adaptation-real-product-qa/fixture/project/scale-result.json` | `0`; 20/20 checks passed | `scale-result.json` SHA-256 `354c41d13a1e18450627d3cb160f91eb8ffcef146c09f5d7ca048097229eb5b0`; p50 `132.2357 ms`, p95/max `179.1562 ms`; ledger `913 -> 14,954` bytes, growth `14,041` | Synthetic Windows workload only; no scale budget or long-term drift threshold is established. |
| Package / isolated install | Two package outputs must be byte-reproducible; isolated install and installed public CLI must smoke | Included in `node scripts/qa.cjs` | `0`; all package/install/smoke gates `OK` | QA package roots were temporary and intentionally not committed; archive/checksum reproducibility was verified | No failure. |

## Trust and product interpretation

The CLI evidence is sufficient to understand the current candidate values, evidence hashes, metric and
direction, scope, effective rules, live successor-chain block, rollback sequence, and post-forget
tombstones. It is not yet a good human diff: `beforeHash`/`afterHash` are opaque and the public CLI has
no compact inspect/diff view showing the exact target-skill delta or evidence strength in context.

The baseline/adapted rows are deliberately fixed synthetic effect sizes, not a claim that the system
will generalize. The fixture demonstrates that correction counts can fall while accessibility,
quality, security, and determinism invariants remain true in the recorded rows; it does not supply
real user telemetry or a blind independent human evaluator.

The Playground contract demonstrates user selection and adjustment from a template, prompt generation,
and three explicit prompt-to-next-task artifacts. The static HTML and metadata are reproducible, but
visual quality, browser compatibility, and actual user comprehension still need a real browser/manual
pass.

## Prioritized gaps

1. **P0 — Real independent evaluation and minimal telemetry.** Add blinded human/task evaluation with
   correction counts, quality/accessibility/security invariant checks, privacy-minimized event capture,
   and held-out tasks from real workflows. Keep effect sizes separate from generalization claims.
2. **P1 — Public inspect/diff and trust UX.** Show candidate-to-incumbent rule diffs, evidence strength,
   scope, expiry/freshness, predecessor/successor links, rollback point, and forget consequences without
   requiring hash interpretation.
3. **P1 — Feedback, freshness, and drift policy.** Connect Playground feedback to adaptation receipts,
   define stale/expired capability discovery behavior, and establish long-term policy/ledger budgets.
4. **P2 — Platform/browser coverage.** Run the Darwin guard on macOS and perform an independent visual,
   keyboard, reduced-motion, and assistive-technology review of all four single-file Playgrounds.

## Reproduction index

The fixture is fully regenerated by the create command in the table above. The complete happy-path
runner is `fixture/run.cjs --root <generated project>`, followed by `fixture/evaluate.cjs`,
`fixture/security-recovery.cjs --output <artifact>`, and `fixture/scale.cjs --output <artifact>`.
All generated evidence lives below this OpenSpec change and is safe to inspect or remove as a unit.
