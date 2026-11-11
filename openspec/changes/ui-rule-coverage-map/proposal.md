# Proposal: pin the upstream UI rule lists and map them rule by rule

## Why

The owner's list of leading design skills includes `vercel-labs/web-design-guidelines` and
`ibelick/ui-skills`. The pipeline named `web-design-guidelines` only as an optional companion
(`companion-skills.md`, `feature-routes.md`, `pipeline-reference.md`, `stages.md`,
`companion-capabilities.json`): the rules were not in the package, `sources.lock.json` did not
record them, and an upstream change was invisible. The comparison with the local rules was done by
hand once (#346) and would have to be redone at every upstream change. Some source-level rules had
no local text at all. Closes #356.

## What changes

- `sources.lock.json` gains two `adapted-reference` entries: `web-interface-guidelines`
  (vercel-labs/web-interface-guidelines, MIT) and `ibelick-ui-skills-rules` (ibelick/ui-skills,
  MIT, the commit already locked for the `fixing-accessibility` bundle). Each has a record document
  with the existing `sourceMeta` frontmatter: `skill/references/web-interface-guidelines.md` and
  `skill/references/ibelick-ui-skills.md`.
- New data file `skill/references/ui-rule-coverage.json`: one row per upstream rule line of
  `command.md` (Vercel) and of `baseline-ui`, `fixing-metadata` and `fixing-motion-performance`
  (ibelick), each mapped to an `audit.*` code, a `UC-` id, a packaged Markdown path, `pending` with
  its issue, or `not-adopted` with the reason.
- `skill/references/ui-craft-sources.md`: review rows `UC-30` to `UC-41` for source-level rules,
  two source keys (`WIG`, `BU`), and a Rule coverage section.
- `web-design-guidelines` stops being a companion: the companion documents point to the local
  record, and `companion-capabilities.json` drops it from Visual taste.
- New test `tests/ui-rule-coverage.test.cjs` with the pinned rule list
  `tests/fixtures/ui-rule-coverage/upstream-rules.json`, and the maintenance script
  `scripts/refresh-ui-rule-fixture.cjs` that regenerates that list from a clean checkout.

## What is reused

- The lock, `sources:update` and `sources:check` are unchanged. `adapted-reference` already keeps a
  record document's `reviewedRevision` and `reviewedContentHash` current; the new test compares
  that hash with the one the pinned rule list was read at.
- The measured audit, the review checklist and the Component Conformance record are unchanged. No
  gate, receipt field, schema id, CLI command or flag is added, and `scripts/import-ui-craft-sources.cjs`
  is not touched.

## Not in scope

- Turning mapped rules into measured audit codes: #353 (page metadata), #354 (accessible names,
  form fields, image dimensions, typographic characters, viewport meta), #355 (motion properties).
  Their rows carry the issue number so a later change replaces `pending` with the new code.
- raphaelsalaja/userinterface-wiki (#359) joins the same map as a third source.
- Bundling the `web-design-guidelines` skill from `vercel-labs/agent-skills`: it downloads the rule
  list when it runs and its repository has no license file.

## Not adopted

Title Case for headings and buttons (sentence case is the local default); `<link rel="preconnect">`
(a request to another host fails the audit); `baseline-ui`'s stack prescriptions (Tailwind
defaults, `motion/react`, `tw-animate-css`, `cn`, Base UI, the Tailwind shadow scale, `size-*`) and
its ban on changing letter-spacing. Each row records the governing local rule.
