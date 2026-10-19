# Design

## File ownership

- `skill/scripts/design-synthesis-core.cjs` owns `brandFactFindings(text, projectRoot)`.
  `checkDesignFoundation` throws when it returns findings, with every finding's message and fix in the
  error, as its other DESIGN.md checks throw. `foundation check` and replicate's `next` already call it.
- `skill/scripts/workflows/web.cjs` `buildStatus` returns the same findings when the components stage
  is finished, so the build action shows them ahead of its instruction and the stage does not finish.
- `skill/references/brand-facts.md` is the guide; it is listed in `package-resources.json`.

## Trigger

Product Context holds a line `Real brands: A, B` (also `真实品牌：`). `none`, `n/a`, `无` or a missing
line means no check. A missing declaration cannot be detected from a brief; the guide has the agent
declare brands while taking the brief. A project with its own invented brand writes `none`.

## Checks

Facts file named by `Brand facts: <path>` (inside the project, existing): each list item carries an
`https://` URL or the word owner; each brand is named by at least one item. Source Decisions, per brand
(lines are matched by a leading `Logo` or `Brand colour` and the brand name): exactly one Logo line that
cites an existing svg, png, webp or jpg inside the project and a source; at least one Brand colour line,
which holds hex values with a source or says none. A colour whose only source is a project file must
appear in that file when it is text (svg, css, html, json); a binary image is accepted unread. Codes:
`brand-facts-missing`, `brand-fact-unsourced`, `brand-facts-uncovered`, `brand-logo-missing`,
`brand-logo-multiple`, `brand-logo-file-missing`, `brand-logo-unsourced`, `brand-colour-missing`,
`brand-colour-unsourced`, `brand-colour-not-in-source`.

## Compatibility

DESIGN.md files without the declaration behave as before. No path, artifact shape or command changes.
