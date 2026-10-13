# Verification

Recorded on 2026-10-13 on a Windows host, on branch `fix/audit-coderabbit-limits` (#105) in its own
worktree. The final tested implementation is commit `9f924734d81843ac5ffc36dade09b6bd3ccfbc4a`, tree
`a16bd0d266c3c9a8e7738b879cb99af5d71db3df`, held unchanged during the full runs; later commits change
only these records.

## Regressions

Each case is in `tests/interaction-audit.test.cjs` and fails on the engine it fixes.

| Case | Before | After |
| --- | --- | --- |
| A 16px button whose 2px `::after` over-constrains `inset: -8px` | Engine of `66a7e97`: passes target size, widened to 32px | Fails target size |
| An inline link whose `::after` reaches 4px past each edge | Engine of `66a7e97`: fails target size, its padding box taken as zero-size | Passes |
| White generated text that its margins move off a dark host onto the white page | Engine of `66a7e97`: `indeterminate`, "moved by its margins" | Fails at `1:1 (#ffffff on #ffffff)` |
| A badge on its own fill under a translucent sibling, and a badge moved by `transform: translate(50%, -50%)` | Engine of `66a7e97`: no finding for either | `indeterminate`: "#veil paints over or under the text", "is transformed" |
| A badge under a positioned child of its host, and a badge under its host's painted `::after` | Engine of `f672ee9`: no finding for either | `indeterminate`: "#bell-veil paints over or under the text", "#chip::after paints over or under the text" |
| A badge over an in-flow child of its host, and an `::after` badge over a `::before` layer | No finding | No finding |
| `<p>Read the notes<br><a>Go</a></p>`, and a link in the sentence after such a break | Engine of `66a7e97`: both exempt | The first fails target size; the second stays exempt |

## Checks

| Check | Result |
| --- | --- |
| `node --test tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs tests/ui-craft-sources.test.cjs tests/workflow-components.test.cjs` | 116 pass, 0 fail. |
| Smoke: `verify interaction` on `.design-pipeline/audit-smoke` | Passes, with `audit.text-contrast` checking 16 texts. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1478, 1474 pass, 0 fail, 4 skipped (the host skips recorded for `audit-rendered-ui-craft`), 136 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests pass, and QA leaves repository status byte-identical. |
| `npm run specs:check` | 25 passed, 0 failed, including this change. |

## History

`f672ee9` fixed CodeRabbit's three findings on a branch from `main` at `66a7e97`. `main` then gained
#102 and #97, merged in as `a10e782` (full QA: 1478 tests, 1474 pass, 0 fail, 4 skipped), and #104,
which archived `audit-rendered-ui-craft`. The archived records stay as #104 wrote them, and this
change carries the follow-up. Codex's review of #105 at `2093841` found that paint from the host's
descendants and other pseudo-element was still skipped over generated text on its own fill;
`9f92473` adds that check.

## Not Verified

- Host descendants are weighed only over an absolute pseudo-element. Generated text in flow is placed
  at its host's box, so its host's descendants are not weighed, as for other text.
- No production page has been audited with these rules.
