# Verification

Recorded on 2026-10-13 on branch `feat/internalize-ui-craft-sources` (Windows host). Each result
below comes from a command run on the final tree unless the row says otherwise.

| Check | Result |
| --- | --- |
| `npm test` with `TEMP` and `TMP` set to a fresh `D:\dp-qa-tmp` | Repository tests: 1289, 1285 pass, 0 fail, 4 skipped. The skips are host-dependent and predate this change: three GEPA cases need `GEPA_PYTHON`, and one intake case needs a case-sensitive filesystem. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm test` with the default user temp directory | Two runs failed only on `EPERM` from atomic directory renames under `%LOCALAPPDATA%\Temp`: 4 failures in a run before the last engine change, 6 on the final tree, in different DesignMD, palette-foundation, website-cloning and CodeRabbit-scaffold tests each time. None of them load the audit or interaction code. Rerunning those five files alone under the same temp root gave 97 of 98 passing, the failure again a rename `EPERM`. |
| `node --test tests/interaction-audit.test.cjs tests/interaction-evaluate.test.cjs` | 39 pass, 0 fail. Covers the 17-code contract, probe validation, summaries (failed, indeterminate, `not-declared`, one deduplicated `external-request` finding), every code firing on the violating fixture at 1280x800 and 390x844, the clean and undeclared fixtures, CLI exit codes 2/0/1, an outside-project stylesheet, lineage staleness and the web `probe` stage requirement. |
| `npm run specs:check` | 72 passed, 0 failed, including this change. |
| Smoke: remote dependency | `.design-pipeline/audit-smoke` is a quick web project (`index.html`, `styles.css`, an audit probe declaring numbers, stacks, an alignment group and content boxes). With a stylesheet linked from `http://127.0.0.1:9/vendor/inter.css`, `verify interaction` exits 2: all 17 checks settle at both viewports and one `external-request` finding names the URL with the fix to copy it into the project. Without the link it exits 0, the gate records lineage `files: [index.html, styles.css]` with empty `remote`, and `next` returns `web/quick: done`. |
| Smoke: lineage and a measured failure | Changing `.hero p` to `#aaaaaa` after that pass makes `next` report the gate `stale` with `workflow-input-changed` on `styles.css` and reopen `probe`. `verify interaction` then exits 2 with `audit.text-contrast` `2.32:1 (#aaaaaa on #ffffff)` against `at least 4.5:1` at 1280x800 and 390x844. Restoring `#4a4a4a` passes again and `next` returns `done`. |

## Not Verified

- No production page has been audited yet. The defaults (12px text floor, 24px targets, 8px gaps
  and insets, WCAG 2 contrast) are proven on fixtures, not tuned against real product pages.
- The `UC-` review checklist is applied by the agent at `review`; no command measures it.
- The audit is Component Conformance evidence. It makes no Visual Acceptance claim; that remains
  the owner's review.
