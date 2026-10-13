# Verification

Recorded on 2026-10-13 on branch `feat/internalize-ui-craft-sources` (Windows host). Each result
below comes from a command run on the final tree unless the row says otherwise.

| Check | Result |
| --- | --- |
| `npm test` | Repository tests: 1276, 1272 pass, 0 fail, 4 skipped. The skips are host-dependent and predate this change: three GEPA cases need `GEPA_PYTHON`, and one intake case needs a case-sensitive filesystem. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `node --test tests/check-deps.test.cjs tests/source-governance.test.cjs` | 20 pass, 0 fail, including the new check that a clean package never reports bundled `emil-design-eng` as missing and the React Doctor reference-only pin. |
| `node --test tests/ui-craft-sources.test.cjs` | 18 pass, 0 fail. It covers byte integrity, tamper detection, import rejection, the release archive without `vendor/react-doctor/`, and guide links inside the packaged skill. |
| `npm run sources:check` | 74 pass, 0 fail on the final tree. |
| `npm run specs:check` | 71 passed, 0 failed, including this change. |
| Routing smoke | `designer-pipeline next --deliverable web --tier quick` returns `stage: build` and `guide: references/workflow-web.md#build`. That section routes to `ui-craft-sources.md`, and `## review` runs its agent-side checks. |
| Self-check smoke | `check-deps.cjs --json` no longer lists `emil-design-eng` in any companion group; the Visual taste fallback names `references/ui-craft-sources.md`. |

## Frozen Merge Tree

The rows above predate merging `origin/main` at `66e41c8` (#98), which made
`references/component-source-catalog.json` the single source index and added a `components`
stage before web `build`. After the merge, the tested implementation is commit
`ce3a7330f011bdfa9faf462527a63f25cddbebf7`, tree `c0253f90306d7846b7465d3c0a7c83d9bfb869f0`.

| Check | Result |
| --- | --- |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp`, after `npm ci` | Repository tests: 1402, 1398 pass, 0 fail, 4 skipped (the same host skips). The package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 73 passed, 0 failed. |

The six vendored sources are registered in that index: four new source records, while
`emilkowalski/skills` and `shadcn-ui/ui` link their vendor manifests and keep their existing pins.
Quick web `next` now asks the components question before `build`.

## Import Notes

- On this Windows host, two imports failed while renaming the staged directory into
  `skill/vendor/` (`EPERM`). Both rolled back without leaving stage or backup directories. One was
  the first `shadcn` import; the other was a later repeat import run to check idempotence. A retry
  of the first import succeeded and produced the reviewed tree hash. After the second failure,
  `tests/ui-craft-sources.test.cjs` confirmed every vendored byte still matches its manifest.

## Not Verified

- No page has been built with these sources yet, so no claim is made about their effect on
  visual quality. Visual Acceptance remains the owner's review.
- `shadcn`, `playwright-cli` and React Doctor commands were not run; this change only routes and
  bounds them.
