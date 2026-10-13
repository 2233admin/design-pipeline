# Verification

Recorded on 2026-10-13 on a Windows host: through the Third Review Fix on branch
`feat/internalize-ui-craft-sources`; after #99 merged, the Fourth to Seventh Review Fix on branch
`fix/ui-audit-review-round3` (#101); and after #101 merged, the CodeRabbit Review Fix on branch
`fix/audit-coderabbit-limits`. Sections follow the order the checks ran, and each names the tree it
ran on; the final implementation is the one in CodeRabbit Review Fix.

On the round-two tree, before the merge with `main`:

| Check | Result |
| --- | --- |
| `npm test` with `TEMP` and `TMP` set to a fresh `D:\dp-qa-tmp` | Repository tests: 1289, 1285 pass, 0 fail, 4 skipped. The skips are host-dependent and predate this change: three GEPA cases need `GEPA_PYTHON`, and one intake case needs a case-sensitive filesystem. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm test` with the default user temp directory | Two runs failed only on `EPERM` from atomic directory renames under `%LOCALAPPDATA%\Temp`: 4 failures in a run before the last engine change, 6 on the final tree, in different DesignMD, palette-foundation, website-cloning and CodeRabbit-scaffold tests each time. Each failing stack ended in such a rename, outside the audit and interaction code. Rerunning those five files alone under the same temp root gave 97 of 98 passing, the failure again a rename `EPERM`. |
| `node --test tests/interaction-audit.test.cjs tests/interaction-evaluate.test.cjs` | 39 pass, 0 fail. Covers the 17-code contract, probe validation, summaries (failed, indeterminate, `not-declared`, one deduplicated `external-request` finding), every code firing on the violating fixture at 1280x800 and 390x844, the clean and undeclared fixtures, CLI exit codes 2/0/1, an outside-project stylesheet, lineage staleness and the web `probe` stage requirement. |
| `npm run specs:check` | 72 passed, 0 failed, including this change. |
| Smoke: remote dependency | `.design-pipeline/audit-smoke` is a quick web project (`index.html`, `styles.css`, an audit probe declaring numbers, stacks, an alignment group and content boxes). With a stylesheet linked from `http://127.0.0.1:9/vendor/inter.css`, `verify interaction` exits 2: all 17 checks settle at both viewports and one `external-request` finding names the URL with the fix to copy it into the project. Without the link it exits 0, the gate records lineage `files: [index.html, styles.css]` with empty `remote`, and `next` returns `web/quick: done`. |
| Smoke: lineage and a measured failure | Changing `.hero p` to `#aaaaaa` after that pass makes `next` report the gate `stale` with `workflow-input-changed` on `styles.css` and reopen `probe`. `verify interaction` then exits 2 with `audit.text-contrast` `2.32:1 (#aaaaaa on #ffffff)` against `at least 4.5:1` at 1280x800 and 390x844. Restoring `#4a4a4a` passes again and `next` returns `done`. |

## Frozen Merge Tree

The rows above predate merging `origin/main` at `66e41c8` (#98, component index and web sources).
After the merge, the tested implementation is commit `ce3a7330f011bdfa9faf462527a63f25cddbebf7`,
tree `c0253f90306d7846b7465d3c0a7c83d9bfb869f0`, held unchanged during these runs.

| Check | Result |
| --- | --- |
| `npm ci` | Installed the locked workspace (145 packages). |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1402, 1398 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 73 passed, 0 failed. |

The merge keeps both web probe rules: a changed components decision drops the interaction pass,
and a pass needs an audit probe and lineage. The audit and component fixtures now record the
components decision before build, an audit probe and lineage.

## Review Fix

Codex review on PR #99 found that a motion or journey probe on a local page could load a `file:`
outside the project: it shares the page's `file:` origin, so the per-probe origin check passed it
and the gate's lineage left it out. Motion and journey probes now carry the project bound, so such a
file fails the probe that requested it with `external-request` and the fix to copy it into the
project (commits `75b8894` and `f60fbec`, which replace the first, run-level check of `343826f`). An
audit probe also judges its whole request log, including loads while the viewport is restored, and
the capture snapshots its run log before the browser closes. That implementation was tested as
commit `f60fbecc413c4569f8e8fcf4b059f78ccc60bf19`, tree
`125e4efcc997213a742a4643e383625f258e5f5b`.

| Check | Result |
| --- | --- |
| Regression: a journey whose click appends a stylesheet from outside the project | With `interaction-core.cjs` from before the review (`cc97a72`), `verify interaction` exited 0 and recorded a passed gate. On the final tree it exits 2: the journey probe `load` fails with one `external-request` finding naming the file and the copy-into-the-project fix, and the gate records `failed` with no lineage. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1404, 1400 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 73 passed, 0 failed. |

## Second Review Fix

Codex's review of `c77d0b2` raised no new finding on that fix, and two P2 findings on the audit
engine. `audit.control-gap` measured layout boxes while `audit.target-size` measured hit areas
widened by an absolute `::before` or `::after`, so two overlapping widened targets passed both
checks; and gap checks treated controls or stacked items that share neither axis as infinitely
apart. Control spacing now measures hit areas, and gaps are edge to edge along the diagonal (commit
`eb4d7ce`; `c901a79` extends the regression to a declared stack). That implementation was tested
as commit `c901a796d6df8ba3431a1a5464240e8b594cf9dc`, tree
`4207c64495e015827a78bcbae039014341a788cf`.

| Check | Result |
| --- | --- |
| Regression: two 16px icons widened to 32px targets 8px apart by layout, two 24px buttons offset 2px on each axis, and two tiles of a declared grid stack offset 2px on each axis | With the previous engine, no `audit.control-gap` or `audit.layout-gap` finding. With the fix: control gaps `#icon-a` "overlapping it by 8px" and `#corner-a` "2.83px from it", and the stack gap `#tile-a` "2.83px from it"; `audit.target-size` stays clean. The violating, clean and undeclared fixtures keep their results. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1405, 1401 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 73 passed, 0 failed. |

## Third Review Fix

Codex's review of `a1c6498` raised three P2 findings, all confirmed and fixed in `82fb16c`:

- Generated `::before` and `::after` text has no text node, so `audit.text-contrast` never measured
  it, although `audit.font-size` did. It is now measured over its pseudo-element's own background
  when that paints, otherwise over the background behind its box; generated text the engine cannot
  place is `indeterminate`.
- The inline-link exemption from `audit.target-size` and `audit.control-gap` counted any text in the
  link's block, so a standalone link after a paragraph, or beside hidden text, was exempt. It now
  counts only text in the link's own inline formatting context.
- `verify interaction` wrote its report before hashing the files the page loaded, so a page that
  loaded the report destination had the new report bound instead of the bytes it was measured with.
  Observation now refuses that destination with `OUTPUT_COLLISION` before anything is written. The
  observation is shared with native completion, which then stops as `blocked`.

Checking the generated-text fix showed that the background resolver stopped at the first opaque
background, so opacity, a filter or a blend mode above it, including on the host of a badge with
its own background, still produced a definite ratio. `7b53b12` makes such text `indeterminate`, as
the contrast rule states. That implementation was tested as commit
`7b53b127274ca5714bc89acb667b66ec859faeaf`, tree `b30e3d4d3a782843bc7c04a0ca068b5ecd950a86`; full QA
ran on that tree before it was committed.

| Check | Result |
| --- | --- |
| Regression: a pale in-flow required marker, a badge whose text barely differs from its own fill, readable generated text, and generated text fixed to the viewport | With the engine of `a1c6498`, no `audit.text-contrast` finding. With the fix: `#email::after` "1.47:1 (#d4d4d8 on #ffffff)", `#inbox::after` "1.13:1 (#fde047 on #fef08a)", and `#draft::after` `indeterminate` because its box cannot be located; the readable `#note::before` passes. |
| Regression: a badge with its own dark fill on a host at `opacity: .5`, and text on an opaque card inside a wrapper at `opacity: .5` | With the engine of `82fb16c`, no finding. With the fix both are `indeterminate`, naming `#beta` and `#fade` as translucent. |
| Regression: a 16px link after a paragraph, one beside hidden text, and one inside a sentence | With the engine of `a1c6498`, no `audit.target-size` finding. With the fix: `#after-paragraph` and `#beside-hidden`; the link inside the sentence stays exempt. |
| Regression: a clean page that also loads `evidence/interaction.json`, the default report destination | With the code of `a1c6498`, `verify interaction` exited 0, overwrote the file and recorded a passed gate. With the fix it exits 1 with `OUTPUT_COLLISION` naming `evidence/interaction.json`, leaves the file's bytes unchanged and records no gate. |
| `node --test tests/interaction-audit.test.cjs`, then `tests/interaction-cli.test.cjs` with `tests/ui-craft-sources.test.cjs` | 19 and 29 pass, 0 fail, including the violating, clean and undeclared fixtures and the shared preflight and observation that native completion uses. |
| Smoke: `.design-pipeline/audit-smoke` | `verify interaction` still passes; `audit.text-contrast` checks 16 elements at 1280x800. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1409, 1405 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 73 passed, 0 failed. |

## Fourth Review Fix

PR #99 merged at `a1c6498`, so the Third Review Fix and this one reach `main` through #101.
Codex's review of #101 at `06e78ec` raised two P2 findings:

- The inline-link exemption still accepted text hidden by `visibility`, `opacity` or clipping, so a
  standalone link beside it skipped `audit.target-size` and `audit.control-gap`. `5095850` counts
  only visible text. Text hidden only from assistive technology is still painted on the line, so it
  keeps the exemption.
- A link the page requests that dangles at capture, and resolves to the report once it is written,
  was said to let a pass bind the report. Not adopted: every probe on a local page judges its
  `file:` requests against the project bound, which cannot contain an unresolved symlink. Reproduced
  on `7b53b12` with `page.css -> evidence/interaction.json`: `verify interaction` exits 2 with
  `external-request` on `page.css`, and the gate records `failed` with no lineage.

That implementation was tested as commit `50958502aed31213698e039d44789d394e7e8dbb`, tree
`42b44b21002d4a135c94f0fd80af8be2f0f03946`; full QA ran on that tree before it was committed.

| Check | Result |
| --- | --- |
| Regression: 16px links beside text that is not displayed, invisible, transparent or clipped away, a link inside a sentence, and one beside words hidden only from assistive technology | With the engine of `7b53b12`, `audit.target-size` flagged only `#after-paragraph` and `#beside-hidden`. With the fix it also flags `#beside-invisible`, `#beside-transparent` and `#beside-clipped`; both sentence links stay exempt. |
| `node --test tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs tests/ui-craft-sources.test.cjs` | 48 pass, 0 fail. |
| Smoke: `.design-pipeline/audit-smoke` | `verify interaction` still passes. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1409, 1405 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 73 passed, 0 failed. |

## Fifth Review Fix

Codex's review of #101 at `a38f417` raised three P2 findings:

- Generated text without its own background was measured at its untransformed box when a
  `transform` moved it elsewhere, and generated text below opacity 1 had that opacity folded into
  its text alpha, so either could pass. Both are now `indeterminate` (`b3e297a`), like other text
  under those effects. Generated text with its own opaque background keeps its measurement under a
  transform, since the background moves with the text.
- Lineage was read after the report was written, so a request that reaches the report only once it
  exists could be bound as something the page loaded. Codex's trailing-dot example does not hold
  here: Node on this Windows host does not open `interaction.json` or `evidence` with a trailing
  period or a trailing space as the existing report. It opens a case variant, which
  `path.win32.relative` already treats as the same path. A directory link does reproduce the
  problem, and `b3e297a` reads lineage before the report is written: the request stays `absent`
  and reopens the gate, and the next run refuses it with `OUTPUT_COLLISION`.

That implementation was tested as commit `b3e297a923999285b0090b1ff051d719ddbdb480`, tree
`519347a65e52fb5323d627d1add0a7b4e5dd4567`; full QA ran on that tree before it was committed.

| Check | Result |
| --- | --- |
| Regression: generated text moved by `transform: translateY(-200%)`, and generated text at `opacity: .8`, both without their own background | With the engine of `5095850`, no finding. With the fix: `#lift::after` "is transformed" and `#soft::after` "is translucent (opacity 0.8)", both `indeterminate`. |
| Regression: a clean page that requests `ev/interaction.json`, where `ev` links to the empty report directory | With the code of `5095850`, `verify interaction` exited 0 and the lineage's `absent` list was empty, because the request was read after the report existed. With the fix it exits 0 with `ev/interaction.json` in `absent`, `next` reopens `probe`, and a rerun exits 1 with `OUTPUT_COLLISION`. |
| `node --test tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs tests/ui-craft-sources.test.cjs` | 49 pass, 0 fail. |
| Smoke: `.design-pipeline/audit-smoke` | `verify interaction` still passes. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1410, 1406 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 73 passed, 0 failed. |

## Merge With #100

`main` gained #100 (agent resource discovery) after that run. #100 changed no file this change
touches except `CHANGELOG.md` and one help line in `cli-core.cjs`, and both merged without
conflicts. That merge was tested as commit `eb8ff216dcb62c756a3914bbcf0ffb9a1e14f0ab`, tree
`a69186028cbee2c05c509863278beb0c9b0621e5`.

| Check | Result |
| --- | --- |
| `node --test tests/workflow-components.test.cjs tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs` | 98 pass, 0 fail, including #100's discovery and lineage cases on audited pages. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1429, 1425 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 74 passed, 0 failed. |

## Sixth Review Fix

Codex's review of #101 at `5471f6e` raised two P2 findings, fixed in `c5ad554`:

- Each observation checked only its own check file, so with two verification bindings a page could
  load the other binding's existing check, both observations passed, and completion then overwrote
  that check. Observation now checks the page against every report the caller writes afterwards:
  native completion passes all of its checks and its metadata, and stops as `blocked` with
  `OUTPUT_COLLISION` before writing any check.
- Generated text without its own background that relative positioning offsets was measured at its
  unshifted box. Such text is now `indeterminate`, and so is sticky generated text with any inset,
  which scrolling can move even at `top: 0`.

That fix was tested as commit `c5ad5549fd1e6b995468b01836a5eb616cc5dff7`, tree
`c0e728309efab20b0ae3c65db3eb8854c474a862`; full QA ran on that tree before it was committed.

| Check | Result |
| --- | --- |
| Regression: a native task with two pages, where the first page loads the second binding's existing check | With the code of `b3e297a`, completion returned `recorded` and rewrote that check. With the fix it returns `blocked` naming `second-check.json`, which keeps its bytes, and no check is written. |
| Regression: white generated text moved off its dark host by `position: relative; top: 64px`, and generated text with `position: sticky; top: 0` | The offset text had no finding with the engine of `b3e297a`, and the sticky text had none with the first version of this fix, which counted only non-zero offsets. With the fix both are `indeterminate` ("is relatively positioned", "is sticky"). |
| `node --test tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs tests/ui-craft-sources.test.cjs tests/workflow-components.test.cjs`, then the native regression in `tests/workflow-next.test.cjs` | 116 and 1 pass, 0 fail. |
| Smoke: `.design-pipeline/audit-smoke` | `verify interaction` still passes. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1430, 1426 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 74 passed, 0 failed. |

## Seventh Review Fix

Codex's review of #101 at `250ee46` raised two P2 findings, fixed in `fa74c63`:

- A standalone link beside text in a transparent color, such as `color: transparent`, was exempt
  from `audit.target-size` and `audit.control-gap`, because the sentence check tested only whether
  the text's element was visible. Text in a transparent color now counts only when a painting stroke
  or shadow draws it, or when a background clipped to text paints it, on its element or an ancestor,
  and no background painted in between covers that.
- Absolute generated text without its own background was placed by its insets alone, so margins
  that moved it off its host were ignored. Such text with any non-zero or unresolved margin is now
  `indeterminate` ("is moved by its margins"). The inset box itself is unchanged.

That fix was tested as commit `fa74c63c9db521e0f8894b661a4aec830552d1b1`, tree
`8ed8015c47e05bae2647115f17e5549b90c71e98`; full QA ran on that tree before it was committed, in a
separate worktree of `250ee46` holding only this change, because another session had uncommitted
edits in the main checkout.

| Check | Result |
| --- | --- |
| Regression: a link beside `color: transparent` text, and white absolute generated text on a dark positioned host with `inset: 0; margin-left: -200px; margin-right: 200px` | With the engine of `250ee46` the link had no `audit.target-size` finding and the generated text no `audit.text-contrast` finding. With the fix the link fails target size and the text is `indeterminate`. |
| Regression: a link beside transparent text whose only shadow is transparent (`text-shadow: 0 0 transparent`) | The first version of this fix counted any shadow as paint and exempted the link; with the fix it fails target size. |
| Headless Chrome render: red pixels in the glyph boxes of transparent text under a red `background-clip: text` | Text in the clipped element, and in a `<span>` inside it, both showed 2884; transparent text without a clip, and text under a white background placed between it and the clipped ancestor, showed 0. The fixture pins the nested, unclipped and covered cases, and keeps links beside stroke-outlined or shadow-drawn transparent text exempt. |
| `node --test tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs tests/ui-craft-sources.test.cjs tests/workflow-components.test.cjs` | 116 pass, 0 fail. |
| Smoke: `.design-pipeline/audit-smoke` | `verify interaction` still passes, with `audit.text-contrast` checking 16 texts. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1430, 1426 pass, 0 fail, 4 skipped (the same host skips), 135 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 74 passed, 0 failed. |

## CodeRabbit Review Fix

CodeRabbit's review of #101 at `8b6a417` raised three findings, addressed after #101 merged in
`f672ee9`, on a branch from `main` at `66a7e97`:

- Generated text on its own fill was measured against that fill without checking paint over it, so
  a translucent sibling over a badge left a definite ratio. Its located box is now checked for
  overlapping paint like any other text, and generated text on its own fill that cannot be placed
  (transformed, offset by relative positioning, sticky, or otherwise unplaceable) is
  `indeterminate`, since paint over it cannot be ruled out.
- A link was exempt as part of a sentence when any painted text shared its inline formatting
  context, so `<p>Introduction<br><a>Go</a></p>` exempted a link standing alone on its line. A
  `<br>` or an in-flow block box now ends the line run, and only text with neither between it and
  the link counts. A sentence that merely wraps keeps its link exempt, as WCAG 2.5.8 intends, so the
  result does not depend on the viewport width.
- The box of an absolute pseudo-element was built from its four insets even when its size
  over-constrained them, so a small `::after` with an explicit size and negative insets widened its
  control as if it filled them. The box is now the pseudo-element's border box, placed by its insets
  and margins, and only when size, margins and insets add up to the containing block; otherwise it
  widens nothing, and generated text in it cannot be placed. An inline host on one line now uses its
  own padding box, where `clientWidth` and `clientHeight` had made it zero-size; an inline host that
  wraps cannot place it.

Because margins are now placed, white generated text that its margins move off a dark host onto the
white page is measured where it sits, `1:1 (#ffffff on #ffffff)`, instead of "is moved by its
margins".

That fix was tested as commit `f672ee90fa034aad40fec13d715e9bebf293ff4d`, tree
`62eebfe72ec479a1912854ed3f2a1102c471546e`; full QA ran on that tree before it was committed, in its
own worktree.

| Check | Result |
| --- | --- |
| Regression, hit areas: a 16px button whose 2px `::after` over-constrains `inset: -8px`, and an inline link whose `::after` reaches 4px past each edge | With the engine of `66a7e97` the button passed `audit.target-size`, widened to 32px, and the link failed it. With the fix the button fails and the link passes. |
| Regression, generated text: a white badge on a dark fill under a translucent white veil, a badge moved by `transform: translate(50%, -50%)`, and white text that its margins move off its dark host | With the engine of `66a7e97` neither badge had a finding and the moved text was "moved by its margins". With the fix the veiled badge is `indeterminate` ("#veil paints over or under the text"), the transformed badge is `indeterminate` ("is transformed"), and the moved text fails at `1:1`. |
| Regression, sentence links: `<p>Read the notes<br><a>Go</a></p>`, and a link in the sentence after such a break | With the engine of `66a7e97` the first link was exempt. With the fix it fails target size; the second stays exempt. |
| `node --test tests/interaction-audit.test.cjs tests/interaction-cli.test.cjs tests/ui-craft-sources.test.cjs tests/workflow-components.test.cjs` | 116 pass, 0 fail. |
| Smoke: `.design-pipeline/audit-smoke` | `verify interaction` still passes, with `audit.text-contrast` checking 16 texts. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1446, 1442 pass, 0 fail, 4 skipped (the same host skips), 136 files; `main` had gained the tests of #103. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 75 passed, 0 failed; `main` had gained change `add-ff-tracking-template`. |

Before publishing, `main` gained #102 (the conversational web workflow) and #97. They were merged
into the branch without conflicts, the one shared file being the setup helpers of
`tests/interaction-audit.test.cjs`. The final tested implementation is that merge, commit
`a10e78201873b28e1e2fc59ae2aa41e8e61f6f08`, tree `faa6e1dd22873ac7e5f93c6f6cd2cf0082eb270c`, held
unchanged during these runs; later commits change only these records.

| Check | Result |
| --- | --- |
| The same focused suites | 116 pass, 0 fail. |
| `npm test` with `TEMP` and `TMP` set to `D:\dp-qa-tmp` | Repository tests: 1478, 1474 pass, 0 fail, 4 skipped (the same host skips), 136 files. The hermetic package build, the installed-package CLI smoke (12/12) and the browser-tool self-tests also pass. |
| `npm run specs:check` | 76 passed, 0 failed. |

## Not Verified

- No production page has been audited yet. The defaults (12px text floor, 24px targets, 8px gaps
  and insets, WCAG 2 contrast) are proven on fixtures, not tuned against real product pages.
- The `UC-` review checklist is applied by the agent at `review`; no command measures it.
- The audit is Component Conformance evidence. It makes no Visual Acceptance claim; that remains
  the owner's review.
