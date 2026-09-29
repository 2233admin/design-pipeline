# QA record: add-web-treatment-and-section-briefs

## Conformance (verified)

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
- Fix the film wording in web intake, concepts and review: yes (done).
- The `ui` deliverable's intake still asks "How long?": left as a known residual.

## Visual Acceptance: PENDING

W1 to W7 are guidance only. No reviewer has judged a page built from a treatment, and thresholds are
uncalibrated. Agents never record Visual Acceptance.

## Not verified

No page was built or captured with the new treatment; no `verify composition` or
`verify interaction` run (puppeteer-core is not resolvable from the repo); no evidence that
treatments make pages more distinct; the web review stage through the CLI.
