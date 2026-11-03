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

Make the list before the files, then build against it.

| Starting point | What the list holds | Rules |
| --- | --- | --- |
| A real source: code, a design file, a deck, brand guidelines | Each token under the source's name and value, in source order; each component family the source has; each logo, icon set and font file | Values are copied as found (5px is not rounded to a grid or a framework default). Code outranks screenshots. A component absent from the source is listed under `Intentional additions` in `README.md` with the reason |
| No source | A starter set, labelled as one: 6–10 colours in one theme, 5–7 type styles, a 4-step spacing scale, 3 radius values and a short README | Components only where the product's own pages need them |

When work stops before the list is done, name the unbuilt entries. When reading the source fails
partway, say what was read and what was not; never fill gaps from memory.

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
- Role colours follow two names and both are measured:
  - `on-<fill>`: the text and icon colour drawn on the fill `<fill>`, used whenever that colour is not
    plain ink. Pick it per theme (a lighter accent in a dark theme often needs dark text rather than
    white). `contrast` measures it on `<fill>`: 4.5:1 for body-size text, never below 3:1 (marks and
    text 24px and up).
  - `focus-ring` or `focus-outline`, optionally with a kebab-case suffix for a theme or state
    (`focus-ring-inverse`): a solid colour measured at 3:1 or more on every surface a focused control
    sits on. Other names (`focus-bg`, a fill for a focused row) are ordinary colours.

  `check` reports `on-token-unmeasured`, `on-token-floor`, `focus-ring-unmeasured` and
  `focus-ring-floor`, each with the `contrast` entry to add or fix.
- When a source's own colour pair misses its ratio, keep the source's values and say so in the
  token's usage note; a compliant variant is an extra theme, never a quiet recolouring.
- Two owner requests have fixed definitions (they are not checked on every package):

  | Request | Meaning |
  | --- | --- |
  | High contrast | An extra theme next to the brand's: 7:1 for text on its grounds (4.5:1 from 24px); surfaces and controls separated by 3:1 borders |
  | Colour-blind-safe status | Each status also shows a word or an icon; success and danger are 3:1 apart in lightness, or success shifts toward blue instead of green |

  If the source's own pair misses, it stays in the brand theme and the safe pair goes in the extra
  theme.

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

Further cover rules:

| Topic | Rule | Checked |
| --- | --- | --- |
| Layout | One fixed layout at 960px wide, scaled by the host: no size media queries, no container queries, no viewport units (a `prefers-color-scheme` query is fine) | `cover-responsive` |
| Stillness | No `animation` or `animation-*` properties, `@keyframes`, or SVG `<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>`; a `transition` alone is allowed | `cover-motion` |
| Fills | Solid tokens only: no CSS gradient function, no SVG gradient | `cover-gradient` |
| Shapes | No `<img>`, `<picture>`, `<video>`, `<canvas>` or SVG `<image>` | `cover-picture` |
| Zones | Name and tagline bottom-left in a text block of 440px at most; blocks and pattern right of x = 480, or in a single top band when the name is too wide | owner |
| Weight | Big blocks go to the colours people recognise the brand by; a state-only colour (error red) stays small; at most five colours and two patterns; never a row of equal squares | owner |
| Derivation | A comment above the SVG lists the token-sized blocks, the arrangement, the chosen pattern with its reason, and the steps and radii used; a line naming no token means the cover was not derived | owner |
| Reading order | Squinting, the name comes first, colour second, pattern third (halve a pattern that wins); hiding the name, the shapes alone still identify the system | owner |

The checks read the cover preview and every `components/bundle.css` rule whose selector names a
class or id the cover uses, since the bundle loads into every preview. HTML and CSS comments are
skipped, so the derivation comment may mention anything.

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
