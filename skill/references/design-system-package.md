# Design-System Package

A project's reusable design lives in two places that cannot drift apart:

- `DESIGN.md` — the Google-format foundation the pipeline and other tools read;
- `design-system/` — the package agents build from and owners review by looking at it.

`design-system/tokens.json` is the single source of values. The `DESIGN.md` front-matter token groups
are generated from it, and the foundation check reports any difference.

The package layout is compatible with Claude's Design System artifact type: a host that offers it can
publish the folder's files as that artifact's `project/` files without conversion. The pipeline does
not depend on that host.

## Layout

```text
design-system/
  README.md                       usage rules (no title: the system's name is in tokens.json)
  tokens.json                     every token, with a usage note; contrast pairs
  assets/logos/<file>             official brand logos, when real brands are declared
  components/bundle.css           the stylesheet the previews and the product share
  components/<Comp>/README.md     guidelines for one component
  components/<Comp>/preview.html  a live preview of that component
  components/Cover/preview.html   the cover (a bare folder: no README)
```

Write it during design synthesis (Stage 4 in `design-synthesis.md`), before `DESIGN.md`.

## Inventory first

Before writing any file, list what the source holds and track the package against that list:

- **From a real source** (code, a design file, a deck, brand guidelines): every token with the
  source's own name and exact value, in its order (5px stays 5px; nothing snaps to a 4/8 grid or a
  framework default); every component family the source defines; every logo, icon set and font
  file. Code is the truth; screenshots are lossy guidance. A component the source does not have goes
  in only under an `Intentional additions` line in `README.md` with its reason. If the work stops
  early, say exactly which listed items are not yet built; a package never ends silently partial.
- **From nothing**: a deliberately small first system, said as such: 6 to 10 colours in one theme,
  5 to 7 type styles, 4 spacing steps, 3 radii, a short README and no components beyond the ones the
  product's own pages need.
- When a read fails partway, report what was and was not read; never fill the gap from memory.

## README.md — usage rules

Write imperative rules for the next agent, naming tokens, styles and components: “Set evidence in
`body-md`, `ink-secondary` on `paper`.” Three sections are required (English or Chinese headings):

- **Content fundamentals** — voice and tone, form of address, casing, punctuation, fixed wording,
  numbers and units, quoted real copy.
- **Visual foundations** — colour, type, spacing, layout, borders and radii, depth, states (hover,
  focus, disabled), motion, responsive behaviour.
- **Iconography** — the icon set and format, or the glyphs used instead; logo handling: which file
  under `assets/logos/` the product uses, where, at what size and on which grounds, never redrawn.

Keep provenance, build notes and next steps out of it: they belong in the change and `DESIGN.md`
Source Decisions. Length follows the source; never pad.

## tokens.json

Every family except `type` is a list: `{"tokens": [{"name", "value", "usage"}]}`. A name-to-value map
(DTCG style) is refused. Token names match `[A-Za-z0-9][A-Za-z0-9_-]*` and are unique across
families; type style names start with a letter. Both become CSS names unescaped (`--<token>`,
`.<style>`), so no dots.

- `color`: `themes` (the first is the default) and one flat `tokens` list. A value is a string (the
  first theme) or an object per theme id; hex, a colour function without nesting, or an alias
  `"{other-token}"`. Every token resolves in every theme.
- `type`: `families` (CSS font stacks by key), `groups` of `styles` (`name`, `fontSize`,
  `lineHeight`, `fontWeight`, optional `letterSpacing` and `family`, a `usage` and a `sample`),
  `fonts` for any font files under `fonts/`.
- `spacing`, `radius` and further list families: lengths in px, rem or em (DESIGN.md cannot carry
  `%`; use `9999px` for pills and discs).
- `contrast`: the text and mark colours with the grounds they sit on:
  `{"text": "ink-muted", "on": ["paper", "paper-deep"], "min": 4.5}`. Text needs 4.5:1 (3:1 at 24px
  and up); focus rings, borders and marks that carry meaning need 3:1. Pairs are checked in every
  theme.
- A `usage` note on every token and style: where it is used, and for a text colour which grounds.
- Role colours are measured, not assumed. A fill whose text is not plain ink gets an `on-<fill>`
  token (a dark theme that lightens an accent usually wants dark text on it, not literal white), and
  `contrast` measures it on `<fill>`. A focus-ring token (a name containing `focus`) is solid and
  measured at 3:1 or more on every surface a focused control sits on. `check` reports
  `on-token-unmeasured`, `focus-ring-unmeasured` and `focus-ring-floor` with the entry to add.
- A real source's failing pair keeps its exact values: its usage note says it misses, and the fix is
  an added theme, not a re-tint of the brand.
- Accessibility asks have fixed meanings when the owner makes them. *High contrast* is an added
  theme, never a re-tint of the brand's own: text at 7:1 on its grounds (4.5:1 from 24px), surfaces
  and controls set apart by borders at 3:1. *Colour-blind-safe status* means every status also
  carries a word or an icon, and success and danger either differ in lightness by 3:1 between
  themselves or success moves off the red–green axis toward blue. A source's own pair that misses
  stays as it is beside the added theme. These are definitions of an ask, not checks on every
  package.

- Brand colours (only when `DESIGN.md` Product Context declares `Real brands:`): a brand colour is a
  normal colour token that also carries `brand` (the brand's name, as declared) and `source` (an
  `https://` URL, `owner`, or a project-relative file such as the downloaded logo). When the source
  is a project text asset (svg, css, html, json, txt, md) the token's hex must appear in it.
  Because brand colours are colour tokens, the generated `DESIGN.md` `colors` group carries them.
- `brands`: an object keyed by brand name. `{"<Brand>": {"colours": "none"}}` states that the page
  uses none of the brand's colours (the alternative to brand colour tokens);
  `{"<Brand>": {"logo": {"path": "design-system/assets/logos/<file>", "source": "<https url or owner>"}}}`
  declares the brand's one logo, a svg, png, webp or jpg that exists under `assets/logos/` inside the
  project. Every declared real brand needs a logo and either brand colour tokens or `colours: none`;
  [brand-facts.md](brand-facts.md) lists the findings.

When a project needs a `primary` colour for tools that require one, add it as an alias token with a
usage note; otherwise the generator writes the first colour as `primary`.

## Components

One folder per component the product actually has — the inventory comes from the product's pages,
not from a standard kit.

- `README.md`: `# <Comp>`, then a first sentence that summarises it; then what the consumer
  provides (data, children, container), when to use it, every state, and the don'ts.
- `preview.html`: line 1 is the marker `<!-- @dsCard group="<Group>" height=<px> -->`, then a small
  HTML document rendering the component in its main states with real content. The preview frame
  supplies `tokens.css` (compiled from tokens.json) and `components/bundle.css`; use their custom
  properties and type-style classes, never raw values. No `iframe`, `frame`, `object`, `embed`,
  `portal` or `noscript`. Remote scripts only from pinned CDN versions.
- `bundle.css` holds the component styles once; the product loads the same file.

## Cover

`components/Cover/preview.html` is the system's face: the name in the display face on the ground,
one tagline line, and on the right three to five colour blocks taken from the palette at full value
with one pattern drawn from the system's own scales (hairline rules for an editorial system, dots
for a gridded one, pills for a rounded one). Every fill and size comes from tokens. No icons,
pictures, gradients or motion.

- Lay it out once, at 960px wide: no media or container queries and no viewport units; the host
  scales the picture. The name and its tagline sit bottom-left in a text block at most 440px wide;
  the blocks and pattern stay right of x = 480 or in one band across the top when the name is too
  wide for its zone.
- Weight the blocks by identity, not by how often the UI spends a colour: a colour that only means a
  state (error red) stays small. Never a row of equal squares (a swatch table), never more than five
  colours or two patterns.
- Keep a four-line derivation comment above the SVG: the blocks (tokens and sizes), the
  arrangement, the pattern and the sentence that chose it, the steps and radii used. A line with no
  token in it means the cover is not derived from the system.
- Squint test: the name reads first, then colour, then pattern; if the pattern wins, halve it. With a
  thumb over the name, the blocks and pattern alone should say whose system this is.

`check` measures the fixed part: `cover-picture`, `cover-gradient`, `cover-motion` and
`cover-responsive` (comments are ignored, so the derivation may name anything). The squint and thumb
tests are the owner's.

## Commands

```bash
designer-pipeline design-system check            --project-root .   # the package alone
designer-pipeline foundation check --kind system --project-root .   # the same, as a foundation
designer-pipeline foundation check --kind all    --project-root .   # DESIGN.md, MOTION.md and, when present, the package
designer-pipeline design-system design-md-tokens --project-root .   # DESIGN.md front-matter token groups
designer-pipeline design-system compile          --project-root . [--output .design-pipeline/design-system]
```

`compile` writes `tokens.css` and one standalone HTML per preview under the output folder. Render
each with `composition capture --composition <output>/previews/<Comp>.html` for evidence; a blank
capture or a page error is a defect in that preview.

`check` reports `ready`, `synthesis-required` (no `tokens.json`) or `invalid` with every finding.
It covers structure and conformance only: a ready package is not visual acceptance, which stays
with the owner.

## Regenerating DESIGN.md tokens

After any change to `tokens.json`, replace the `colors`, `typography`, `rounded` and `spacing`
groups of the `DESIGN.md` front matter with the `design-md-tokens` output. Keep `DESIGN.md` prose
short and pointing at the package: the rules live in `design-system/README.md`, not twice.
