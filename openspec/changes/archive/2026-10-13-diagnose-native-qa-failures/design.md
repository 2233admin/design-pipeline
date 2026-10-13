# Design

## Feedback loop

The existing three-case command is `node --test --test-name-pattern "native technical progress recovers|fresh native completion cannot|public native failures retain" tests/component-eval.test.cjs tests/workflow-next.test.cjs`. It ran red in 22.50 seconds under the host environment: the two component assertions masked Git-root blocking, and the workflow case blocked before the original counter assertion. A read-only observation preload records actual verdicts before fixture cleanup.

The same cases under the QA environment passed 3/3, then 6/6 across two concurrent copies, then 3/3 using the original full-run temporary directory layout. Browser-based loops take tens of seconds because they exercise frozen toolkit copying and real public CLI verification. Direct existing containment regressions provide the faster seam for the reproducible Windows problem. Original full-run causes remain unconfirmed until new evidence distinguishes them.

## Ranked predictions

1. If Windows root spellings disagree, the same physical fixture is blocked under a short alias and works with native physical coordinates. The shared physical-root repair should remove that failure while still rejecting links and distinct roots.
2. If loaded browser recording is incomplete, completion should expose a capture/measurement error and preserve the prior semantic-failure count. Retained actual capture verdicts distinguish this from a counter-reset bug; pointer-sweep fixes do not establish a click-capture cause.
3. If file/state drift causes the failure, the recorded completion must show a hash/CAS conflict even with complete browser measurements. Merely changing temporary directory spelling should not repair that conflict.

## Decisions

Reuse the three runtime files from the published Windows repair: `resolveInside` retains lexical return coordinates but checks physical containment, repository/common-directory discovery uses native realpath, `samePath` compares actual nonzero filesystem identity, and native `visualContext` uses the same physical coordinates. Preserve linked-ancestor, unresolved-link, outside-root and case-sensitive-root rejection. There is no second target resolver.

Independent review identified that accepting an absolute physical alias while returning its foreign spelling could produce `../nested/file.txt` artifact metadata for a junction-root caller. A real artifact creation probe and the registered containment regression reproduced it before correction. Project an accepted absolute alias back into the caller's lexical root before returning it; relative paths outside that root remain rejected. The same shared resolver serves artifact and workflow consumers, so no per-caller normalization is introduced.

On the hermetic temporary volume, fsutil printed access denied while returning exit 0. The test now checks whether `Root` and `root` are actually distinct before assuming per-directory case sensitivity is available. It reports an unavailable distinct-root subscenario there; the host-profile focused run exercised that scenario. Alias, junction, metadata and traversal checks still run on both volumes.

Reuse `runStateMessage` already implemented in the other published branch by extracting the existing timeout formatter and passing it to all ten optional-notice assertions. Include a small assertion regression with a failed attempt and no notice. Keep production run/state/receipt schemas unchanged.

Do not import the independent GoodCSS or pointer changes. Keep technical conformance separate from user visual acceptance. The original failure-count test must continue to distinguish a measured semantic failure from tool, scope or capture blocking.

## Ownership and verification

Root owns this change's artifacts and the selected shared runtime/test diff in the clean candidate worktree. Read-only reviewers inspect callers and preservation of escape checks. The original workspace remains untouched by this fix. Use existing registered test files, strict OpenSpec validation and full `npm test`; keep temporary instrumentation and private logs under ignored `.design-pipeline/`.
