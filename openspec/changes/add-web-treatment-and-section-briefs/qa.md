# QA record: add-web-treatment-and-section-briefs

## Conformance on the port onto main (2026-10-10)

- Implementation commit `48a94bdc973261326ba71826c1d52644342e6984`, tested tree
  `9111d97b548c75107ef631632d463b4e5c7f7788`, on main `f41da71`.
- `node scripts/qa.cjs` on that frozen commit after `npm ci`, run directly with its output outside the
  repository: exit 0. Repository tests (120 files): 1,114 tests, 1,111 passed, 0 failed, 3 skipped
  (the optional pinned GEPA runtime is not installed on this machine). Reproducible TGZ, ZIP and
  checksums; the archive contains `references/web-direction.md`; isolated install; installed-package
  public CLI smoke 12 of 12; repository status byte-identical. The font-subset test needs Python with
  `fonttools==4.66.1` (`CONTRIBUTING.md`); `HUASHU_PYTHON` pointed at such an environment outside the
  repository.
- Baseline on the same machine: main `f41da71` in a clean worktree, without that Python, gave 1,109
  tests, 1,105 passed, 1 failed (`No module named 'fontTools'` in the font-subset test) and 3
  skipped. The port adds five tests and no failure.
- `npm run specs:check`: 64 passed, 0 failed (main's 63 plus this change).
  `openspec validate add-web-treatment-and-section-briefs --strict`: valid.
- Red/green with `node --test --test-name-pattern` on `tests/workflow-next.test.cjs`: against main's
  `web.cjs` the three web prompt tests failed (intake ids, concepts section arc, build treatment) and
  the two guard tests passed; with the port all five passed. The whole file passed, 85 of 85.
- The probe examples in `web-direction.md` and `workflow-web.md` pass main's `validateProbeFile`.
- CLI smoke from empty temporary projects as cwd. Web standard: intake asks `product`, `audience`,
  `scope` and `assets`; after `decide --stage intake` and `decide --stage reference --answer none` the
  concepts `run` asks for the section arc and `## Treatment`; with `concepts.md` the ask recommends
  "the concept whose section arc best serves what the visitor should do first"; after
  `decide --stage concept --choice 1` the build command starts "extend the chosen card in
  concepts.md with `## Treatment` and write the section briefs (references/web-direction.md) before
  you build index.html", with `remaining` 4. With `index.html` and a click probe, `verify interaction`
  ran in Chrome (the HyperFrames headless shell, `--puppeteer-module` from the maintenance workspace)
  and passed; `next` then returned the shared review ("Inspect the checked page and its key
  interactions", `show` = the checked `index.html` and `evidence/interaction.json`) with `guide`
  `references/workflow-web.md#review`. Film standard intake still asks "How long?" and film concepts
  still speak of the picture and beats. A `replicate` web project gets the web intake and a build
  with no treatment.
- No gate, finding code, receipt, schema, workflow stage or workflow-state field was added.

## Conformance on the original branch (`b631fcd`, 2026-09-30)

Recorded on branch `project-progress-status` before the port onto main. The web review override
these notes mention was dropped in the port (`design.md` section 8).

- `openspec validate add-web-treatment-and-section-briefs --strict`: valid.
- `node scripts/qa.cjs`, run directly with output outside the repository: exit 0 (QA_EXIT=0) on
  the final tree, after the implementation, registration, changelog, task ticks and this file.
- `references/web-direction.md` is registered in `skill/references/package-resources.json`.
  `tests/workflow-next.test.cjs` (already in the manifest) gained the web prompt tests; no new test
  file, so `scripts/test-manifest.json` is unchanged.
- The worked probe examples in `web-direction.md` and `workflow-web.md` were parsed and passed
  through `validateProbeFile` from `skill/scripts/interaction-core.cjs` in a throwaway script.
- Smoke through the real CLI, from empty temporary directories as cwd: web intake asks product,
  audience, scope and assets with page wording and no duration question; web concepts asks for the
  section arc and says the chosen card is extended with `## Treatment`; web build at standard starts
  with the treatment and section briefs; once `index.html` exists the next stage is `probe`. Film
  intake still asks "How long?" and film concepts still speaks of the picture and beats.
- The web review stage was not walked through the CLI (it needs a passing probe gate). It is covered
  by `tests/workflow-next.test.cjs` and by a worker's throwaway script through `nextAction`,
  `decide` and `recordGate`.
- Stage-aware comparison: intake is compared for film, edit and ui; concepts for film (edit and ui
  have no concepts stage); review for film and edit (ui has no review stage). Web overrides all
  three and keeps stage ids, `finished` conditions and `record` strings.
- No gate, finding code, receipt, schema, workflow stage or workflow-state field was added.

## Open questions and answers

- Scope: change 1 only (approved). Changes 2 to 4 of
  `docs/superpowers/specs/2026-09-29-web-creative-layer.md` are not approved.
- Fix the film wording in web intake and concepts: yes (done). Review: main's shared review names
  the checked page for web since `expose-workflow-recovery-context`, so the port keeps it.
- The `ui` deliverable's intake still asks "How long?": left as a known residual.

## Visual Acceptance: PENDING

W1 to W7 are guidance only. No reviewer has judged a page built from a treatment, and thresholds are
uncalibrated. Agents never record Visual Acceptance.

## Not verified

No page was built or captured with the new treatment; no `verify composition` run; no evidence that
treatments make pages more distinct. On the original branch `verify interaction` and the web review
stage were not run through the CLI; on the port both were, with a synthetic click probe on a
one-button page, not a designed page.
