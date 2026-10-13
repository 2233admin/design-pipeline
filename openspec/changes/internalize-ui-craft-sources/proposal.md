# Proposal: Internalize UI Craft Sources

## Problem

Agent-built frontends from this pipeline still look generic and skip the polish, accessibility and
component practices the team relies on. Seven widely used UI skills cover that craft: interaction
polish, interface details, accessibility fixes, animation principles, the shadcn/ui component
workflow, browser driving and React health checks. The package reaches them only through whatever
is installed globally (`emil-design-eng` is an optional companion; the others are absent), so an
install is non-hermetic and no stage says when to use which source or how it ranks against the
existing interface-discipline, Good CSS, motion and component-source contracts.

## Scope

- Bundle six upstream skills as pinned, scoped, byte-preserved, license-attributed snapshots under
  `skill/vendor/<skill>/`: `emil-design-eng`, `make-interfaces-feel-better`,
  `fixing-accessibility`, `12-principles-of-animation`, `shadcn` and `playwright-cli`.
- Reference `react-doctor` without bundling it. Its Modified MIT license requires prior written
  permission to use its source or derivatives as input to automated pipelines that improve AI
  systems, which a packaged agent skill cannot safely assume.
- Add one maintained guide, `skill/references/ui-craft-sources.md`, that routes each source by
  stage and states precedence and execution boundaries. The web workflow's `build` and `review`
  sections, the skill index and the existing routing references point at it.
- Out of scope: new CLI commands or flags, gates, receipt fields, a second component catalog,
  automatic installation or execution of upstream tools, and page redesign.

## Reuse

- `scripts/git-tree-snapshot.cjs` with the scoped-snapshot pattern of `scripts/import-gepa.cjs`
  and the multi-source pattern of `scripts/import-film-sources.cjs`.
- The package-resource contract, `THIRD_PARTY_NOTICES.md` and the `vendor/README.md` index.
- The `sourceMeta` frontmatter and `tests/source-governance.test.cjs` pin for link-only references.
- Existing protocols keep authority: `interface-discipline.md`, `animation-opportunity-and-review.md`,
  `good-css.md`, `component-source-catalog.json` with `design-system route`, and `verify interaction`.

## Affected Capabilities

`design-pipeline`: bundled source library, web workflow guidance, routing references and the
Visual taste companion fallback text.

## Success Criteria

- A fresh package contains all six snapshots with manifests, license evidence and notices; reading
  them needs no global skill install or network.
- `designer-pipeline next` at the web `build` stage returns a guide section that routes to
  `ui-craft-sources.md`, and every local link in that guide resolves inside the packaged archive.
- Partial, byte-drifted, unreviewed or out-of-scope snapshots fail a deterministic test; the
  importer refuses an unreviewed revision or a dirty checkout without replacing the prior snapshot.
- No source installs, executes or fetches anything unless the project already uses that tool or the
  user approves it.
