---
sourceMeta:
  id: web-interface-guidelines
  kind: github
  url: https://github.com/vercel-labs/web-interface-guidelines/tree/434b7f91364665f2f733b310ec54809bf8f37937
  reviewedRevision: 434b7f91364665f2f733b310ec54809bf8f37937
  reviewedContentHash: af6d9829e75ca2d5ed28cc2ded53b81a321bfc905f36302c795c0bbcbf509238
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: command.md, README.md
  reviewedAt: 2026-11-11T00:00:00.000Z
  freshnessDays: 365
  license: MIT
  useBoundary: reference-only; rules are held as this project's own audit codes, review rows and guides; do not install the upstream command or fetch its rules at run time
---

# Web Interface Guidelines (internalized)

Vercel's Web Interface Guidelines are a public list of interface rules: `command.md` is the short
form an agent reviews code against, and `README.md` is the long form. This project holds those
rules itself. A page built or reviewed with the pipeline gets them from the measured audit, the
review checklist and the project guides, with no installed skill and no network access.

- Source: [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines/tree/434b7f91364665f2f733b310ec54809bf8f37937), MIT, `Copyright (c) 2025 Vercel Labs`.
- Not bundled: no upstream file ships. The `web-design-guidelines` skill in
  `vercel-labs/agent-skills` is a thin command that downloads `command.md` when it runs; do not
  install it for this pipeline, and do not fetch the rules at run time.

## Where the rules are

Start at [ui-craft-sources.md](ui-craft-sources.md): the measured audit table, then the review
checklist (`UC-30` to `UC-41` were added from this list). A rule that is neither measured nor a
checklist row lives in a project guide ([interface-defaults.md](interface-defaults.md),
[mobile-web.md](mobile-web.md), [animation-opportunity-and-review.md](animation-opportunity-and-review.md),
[worst-case-content.md](worst-case-content.md)) or in the bundled interface-discipline text.

[`ui-rule-coverage.json`](ui-rule-coverage.json), source `web-interface-guidelines`, has one row
per `command.md` rule with its local target. The four `README.md` rows are the rules that file has
and `command.md` lacks which this project adopted; `README.md` is not mapped line by line.

## What is not adopted

- Title Case for headings and buttons. Sentence case is the default where a project has no policy
  (bundled `better-writing`).
- `<link rel="preconnect">` for asset hosts. A request to another host fails the audit's
  `external-request` finding; fonts, styles and scripts are self-hosted.
- The trailing `…` on placeholders. A placeholder shows a realistic example value.

## Keeping it current

`sources.lock.json` pins the revision (`web-interface-guidelines`). `npm run sources:update` moves
it to upstream HEAD and rewrites `reviewedContentHash` above when either rule file changed; the
coverage test then fails until the pinned rule list is regenerated and each changed rule has a row
(see [ui-craft-sources.md](ui-craft-sources.md#maintaining-the-snapshots)).
