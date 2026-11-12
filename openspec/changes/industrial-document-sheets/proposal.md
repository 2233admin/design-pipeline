# Proposal: industrial document sheets, a method guide from arknights-printer

## Why

The owner asked to take `AspldeZ/arknights-printer` (MIT, an unofficial agent skill for industrial
sci-fi posters and information sheets) in and use it to improve this tool.

The template bank already has an `arknights-endfield` style pack: nine layouts measured from
promotional art. It has no method for the other kind of piece the grammar serves, a poster or sheet
about a real subject. The upstream skill is that method: the sheet is a document an institution
issued, one dialect per image, a colour budget by role, a density budget, a size floor by medium,
a self-check. Today a brief such as "an Arknights-style poster about the Tay Bridge collapse"
falls through `route` to the default job at score 0 and reaches only the pack's nine layouts.

## What changes

- New guide `references/industrial-document-sheets.md`, written for this project: the document test,
  the eight-line grammar, four dialects, colour roles with area limits, density levels, size floors
  by medium with the Chinese +2 px rule and Chinese label rules, output types, the not-this list,
  the originality test, the workflow with this project's tools, a checklist, and what was not adopted.
- `sources.lock.json` pins the upstream (`arknights-printer`, kind `adapted-reference`) at
  `20336d598f48`; `THIRD_PARTY_NOTICES.md` names it; `tests/source-governance.test.cjs` pins the
  guide's evidence (revision, content hash, source files).
- `references/job-registry.json` gains the scored job `industrial-document-sheets` (priority 50)
  with English and Chinese keywords; no dispatcher source changes.
- `SKILL.md` and `capability-routing.md` gain one routing row each; `package-resources.json`
  requires the guide.

## Reused, not added

- Routing: `route`, `job-registry.v1`, `job-route.v1`, `job-plan.v1`; the primary step is the
  kernel's `toolchain resolve`, so the route adds no step.
- Source governance: `adapted-reference` lock entries, `sourceMeta` frontmatter, the content hash
  scope `ordered UTF-8 sourceFiles with path-and-newline separators`.
- The check: the colour-role limits of the guide are measured by the rule `hue-budget` of the
  existing `template check --browser` (change `template-check-hue-budget`).

## Boundaries

- No upstream script, stylesheet, template or image ships. The upstream Python tools do not run here.
- No gate, receipt schema, finding code, CLI command or flag in this change.
- Guidance and routing only: a routed job grants no visual or creative acceptance.
- The `arknights-endfield` pack, its provenance and its templates do not change.

## Capabilities

- `design-pipeline`: ADDED two requirements (industrial sheet briefs route to their guide; the guide's
  source is locked, hashed and unbundled).
