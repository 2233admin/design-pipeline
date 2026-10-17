## Why

The design foundation is one Google-format `DESIGN.md`: tokens in front matter plus prose.
Dogfooding it on the Shinka Research UI (2233admin/ShinkaEvolve, branch `research/ui`) showed
what it lacks next to a browsable design system such as Claude's Design System artifact type
(Relates to #147):

- tokens carry values but no usage — where each one is used, which grounds a text colour sits on,
  at what contrast;
- the prose mixes rationale and rules, where the next agent needs imperative usage rules that name
  tokens, plus content fundamentals and iconography;
- components exist only as text: no per-component guidelines and no live preview, so the owner
  cannot review the system by looking at it;
- there is no cover;
- `DESIGN.md` tokens and any `tokens.json` can drift — there is no single source.

## What Changes

- A project **design-system package** `design-system/` beside `DESIGN.md`: a usage-rule README
  (content fundamentals, visual foundations, iconography), a list-shaped `tokens.json` with a usage
  note on every token and declared contrast pairs, `components/bundle.css`, guidelines and a
  marked live preview per component, and a cover. The layout is compatible with Claude's Design
  System artifact type; the pipeline does not depend on that host.
- `tokens.json` is the single source: `design-system design-md-tokens` prints the `DESIGN.md`
  front-matter token groups, and the check reports drift.
- `foundation check` gains `--kind system`; `--kind all` includes the package when it exists.
- `design-system check | compile | design-md-tokens` actions. `compile` writes `tokens.css` and one
  standalone HTML per preview, rendered with the existing `composition capture`.
- Design synthesis writes the package for `ui` and `web` products before `DESIGN.md`; the
  standard-tier work instruction says so.

## Capabilities

- `design-pipeline`: ADDED `Interface products keep a design-system package`, `Design-system
  tokens are the single source of DESIGN.md tokens`, `Design-system previews render through
  composition capture`.

## Reuse

- `foundation check` and its ready / synthesis-required / invalid statuses (no parallel gate).
- The existing `design-system` CLI command (new actions), `composition capture` and its browser
  resolution, `resolveProjectRoot` / `pathIsInside` containment.
- Google DESIGN.md format and its lint stay authoritative for `DESIGN.md`.

## Impact

- New: `skill/scripts/design-system-package-core.cjs`, `skill/references/design-system-package.md`,
  `tests/design-system-package.test.cjs`.
- Changed: `cli-core.cjs` (foundation kinds, design-system actions, `--system-dir`),
  `design-synthesis.md` Stage 4, the ui/web standard work instruction.
- Projects without a package are unaffected by `--kind all`; `--kind system` reports
  `synthesis-required` for them.
