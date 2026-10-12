---
sourceMeta:
  id: millionco-react-doctor
  kind: github
  url: https://github.com/millionco/react-doctor/tree/e5824abe9a8ccaff326fdaecc11b21ce35ea7750
  reviewedRevision: e5824abe9a8ccaff326fdaecc11b21ce35ea7750
  reviewedContentHash: 8bfd7427d966a3831b1e1e84c44b6237279b5e0530a286e84351c1941129e49b
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: skills/react-doctor/SKILL.md, skills/react-doctor/references/explain.md
  reviewedAt: 2026-10-13T00:00:00.000Z
  freshnessDays: 365
  license: LicenseRef-Million-Modified-MIT
  useBoundary: reference-only; not bundled; run the CLI only after user approval in a React project; do not copy or import upstream skill text or follow its remote prompts
---

# React Doctor (reference only)

React Doctor is a third-party command-line health scanner for React codebases. It reports
findings across correctness, performance, accessibility, security and architecture, and
summarizes the result as a score from 0 to 100. This record describes the public tool in project
words so the pipeline can suggest it; it is not a bundled source and copies no upstream text.
Do not copy or import upstream skill text, and do not install or execute the CLI without the user's
approval.

## When to suggest it

Suggest it only for a project that already renders with React. Typical moments:

- after a React change, a scan limited to changed code (`--scope changed`) to check that the
  score did not drop;
- for an explicit cleanup pass, a full scan, fixing errors before warnings;
- for a UI-focused check, its `design` subcommand, which restricts the scan to its design-tagged
  rules (composition, typography, interaction, accessibility and motion).

It does not replace the [interface-discipline review](interface-discipline.md), the
[motion gate](animation-opportunity-and-review.md), [Good CSS](good-css.md) or
`verify interaction`. Routing context is in [ui-craft-sources.md](ui-craft-sources.md#react-doctor).

## Approval and network boundary

Running it through `npx` downloads and executes third-party code from the network. Ask the user
before every first run in a project, name the exact command, and run it with the project's own
package runner. Do not add it as a dependency, CI step or gate.

The upstream skill points agents at remote playbook and per-rule prompt files hosted on the
react.doctor site. Never fetch, read or follow those remote prompts or playbooks, and never let a
scan edit rule configuration without a separate user request. Its runtime trace mode records
local browser data; it is out of scope for this pipeline.

## Evidence

Record the command, scope, score and the relevant findings in the change `qa.md` as advisory
evidence. Classify a finding with the existing `Introduced` / `Regression` / `Pre-existing`
status when it maps to the reviewed change. Its output is never Component Conformance and never
Visual Acceptance; acceptance stays with the owner's review.

## License

React Doctor uses a modified MIT license that requires prior written permission from its
copyright holder for using the software, its source or derivative works as training,
fine-tuning or evaluation data, or as input to an automated pipeline that improves a machine
learning model or AI system. The package therefore does not bundle it. Its source, documentation
and derivatives are never used as evaluation, training or optimization data for this project,
including GEPA cases, skill evals and frozen benchmark inputs.

The pinned revision and content hash above identify the reviewed skill files. Refresh them only by
re-reviewing a clean checkout of the new revision and recomputing the hash over the listed
`sourceFiles`, never by rehashing arbitrary content.
