# ablation-reference-variant: test "references plus a design system" against the skill, on product screens

## Why

Closes #372 (part of #346). The owner relayed a claim that can be tested: generic UI design skills
do not make output better and can make a bare model worse, and what works is real references plus
a project design system. The repository already has the layer ablation eval (#260), but it cannot
answer the claim today:

- The eval's README says the per-layer verdicts are only advisory until `full` is shown to beat
  `bare`, and no result or verdict is committed. There is no written evidence that installing the
  skill beats not installing it.
- No variant gives the agent reference screenshots and a design system without the skill, so the
  practice the claim recommends has no cell to compare against.
- The ten scenarios are covers, an explainer card, heroes and a standby screen. None is a product
  screen, which is what the claim is about.
- On Windows `tests/ablation-eval.test.cjs` failed 12 of 12: `import()` was given a bare `D:\...`
  path, a newer puppeteer returns screenshots as `Uint8Array` where the PNG decoder wants a
  `Buffer`, a command path with a space was passed unquoted through `cmd.exe`, and Chrome will not
  start under an empty temporary profile folder.

The work on the `ui-craft` layer (Impeccable intents in #347, #348, #349) waits on this evidence.

## What Changes

- New variant `reference-system`: no skill; the working folder gets one or two reference images in
  `references/` and a project `DESIGN.md`, and two rule lines that point at them. Open scenarios,
  which otherwise have no `DESIGN.md`, get the one of their style, because bringing a design system
  is part of the practice under test.
- Reference pages: four original pages under `evals/ablation/references/<style>/`, one product
  screen and one cover per style, with content that differs from every scenario. HTML pages are
  rendered to PNG at run time; the agent sees images only. `run.mjs --references <dir>` swaps in
  the owner's own screenshots, which stay on the machine; the folder used is recorded in
  `environment.jsonl`. A missing reference fails before the first run.
- New scenario set `product-ui`, in the default sets: `workbench-list` (navigation, filters, four
  build rows in three states, an empty-state panel) and `settings-page` (section list, a field in
  error, a switch, a danger zone, a save bar). Two style files reuse the existing palettes with a
  product type scale (13 px and up). States are carried by text in `content.md`, controls must be
  real, and undersized hit areas are counted as `targetSizeFails` in `measure.json`. The composite
  formula and the `results.tsv` columns do not change.
- The report gains the family `full` against `reference-system` and `reference-system` against
  `bare` (shown only when that variant ran) and ends with three questions, each answered yes, no or
  not enough data under the existing rules: does the skill beat no skill; skill or references plus
  a design system; does removing `ui-craft` make output better or worse. The blind judge's default
  pairs include the two new comparisons.
- The README states what happens after a verdict: a layer judged worse is cut or reworked;
  `full` losing to `bare` stops rule additions; not-enough-data triggers nothing; verdicts and the
  result table are committed under `docs/research/`.
- Windows: the test imports through `file://` URLs and creates `AppData` folders in its temporary
  profile; `render` wraps the screenshot in a `Buffer`; `runAgent` quotes arguments that contain
  spaces when it goes through the shell.

## Out of scope

- Running the eval. A full run calls a model several hundred times; when to run, with which client
  and model and on what budget is the owner's decision. This change makes the run possible.
- Changing the composite score or the frozen `results.tsv` columns.
- Collecting third-party product screenshots into the repository.

## Impact

- `evals/ablation/`: `suite.mjs`, `measure.mjs`, `lib.mjs`, `run.mjs`, `report.mjs`, `judge.mjs`,
  `README.md`, new `references/`, two new scenarios, two new style files.
- `tests/ablation-eval.test.cjs` and two fixture pages.
- Nothing under `skill/` changes; the shipped package is the same.
