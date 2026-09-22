# QA

Base: origin/release-tool-0.11.0-beta.1 at f563eda.
Local branch: improve-beta-motion. Remote publication: not performed.

- DESIGN.md and MOTION.md foundation checkers: ready (static repository interface).
- Motion verification, foundation, and animation reference tests: 29 passed.
- Updated standalone and public CLI lifecycle tests: passed.
- Final `node scripts/qa.cjs`: exit 0. All 674 tests across 82 files passed, followed by
  packaging checks, isolated installation journeys, and 11 installed-package CLI tests.
  The final workspace-status invariant also passed. Log: `.scratch/motion-beta-qa-final.log`.
- The first QA run passed tests and install checks but failed the workspace-status invariant
  because implementation/documentation edits continued during that run. The final run above
  was performed with source edits stopped and supersedes that result.
- JSON Schema field completeness is regression-tested. No general Draft 2020-12 validator is
  installed in this environment; independent schema-engine validation is not claimed.
- Browser QA is not applicable to this static CLI change. Downstream animation captures remain
  required; the evaluator validates declarations, not their authenticity or visual quality.
- Feedback: dpf-af9b2320b764f7ae, local draft at
  `.design-pipeline/feedback/drafts/dpf-af9b2320b764f7ae-issue.md` (ignored, not published).
