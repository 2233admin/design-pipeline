# Impeccable Design Contract

This is the design-pipeline adaptation of the upstream Impeccable skill. It is a curated contract,
not a vendored copy of the upstream prompt. The upstream visual skin is not a default theme.

- Source: `https://github.com/pbakaus/impeccable`
- Reviewed revision: `b4bff1626c344067788c2679f048a20057c7cc5a`
- Reviewed: `2026-11-12`

## Authority and intent

1. The user's brief, product truth, accessibility needs, and confirmed project `DESIGN.md` win over
   generic taste rules.
2. Classify the surface by visitor success: `Persuade` (decide and act), `Operate` (complete a
   task), `Read` (understand), or `Experience` (explore the work). Optimize the surface for that
   mode, not for the product category.
3. Read the existing visual authority before editing: `DESIGN.md`, tokens, components, neighboring
   flows, assets, and the real target. Missing `DESIGN.md` does not prove the project is greenfield.
4. Refinement preserves the incumbent identity, copy, behavior, and out-of-scope work. Redesign
   keeps product truth and constraints but replaces the visual world deliberately. Never smuggle a
   redesign into a polish pass.
5. For genuinely open new work, derive one committed direction from the audience and product
   mechanism. Do not ship a compromise made from several unrelated visual worlds.
6. Propose no visual direction while intake is open: `shape` and Stage 1 settle job, audience,
   states and boundaries only. Direction comes from Stage 2, or from a direction the owner pinned.
7. A pin names the look itself, in the owner's words or as a brand commitment they made binding. A
   product the brief cites as a reference sets the craft bar, not the world; an answer that
   restates the brief pins nothing. Honor pinned fonts, palettes, eras and materials even over an
   anti-default signal below.

## Mode rules

The surface mode decides how much of a chosen visual world the page may carry:

| Mode | The world may own | The world must not |
| --- | --- | --- |
| `Operate` | type, palette, density and one named signature move | supply the layout, navigation or controls; use a costume of a tool's own interface; read as a poster or newspaper |
| `Read` | the frame (masthead, rail, ground, openers, how code and tables are set) | enter the reading column (60-75 characters, about 16px, a reading face, real contrast), supply the reading order, or make the page read as a poster or book |
| `Persuade` | ground, major surfaces, headline type and structure | hide the offer or the working action, become a painted picture with no working parts, or reduce to an accent on the category template |
| `Experience` | the same as `Persuade`; the work itself leads from the first viewport | bury the work under the interface |

Variants of one direction vary composition (navigation model, how areas divide, density, where the
signature sits), never the world's coverage. Self-check each render with the name covered: does it
read as a working product or document of its category first, and is it still specific to this one?

## Craft floor

Treat these as built-result checks, not intentions:

- Body and placeholder text meet `4.5:1` contrast; large text meets `3:1`. On a colored surface
  tint secondary text from that hue or the foreground, never gray.
- Shadows carry an offset and a soft blur; a zero-offset colored halo is decoration. Spacing is
  tight inside a group and generous between groups, with more space above a heading than below it.
- Body measure is 65-75ch, display type stays under 6rem, tracking does not go below -0.04em, and
  headings balance. Motion is one authored moment, not the same entrance on every section.
- Every visible control has semantic structure, a label, keyboard focus, and the states it can
  actually enter: hover, active, disabled, loading, error, empty, success, and permission where
  applicable.
- Body copy has a readable measure, headings have a clear type scale, and real copy is checked at
  every supported breakpoint and localization length.
- Motion communicates a state or hierarchy change, remains interruptible and performant, and has a
  reduced-motion path. Content must not depend on an entrance animation to become usable.
- Browser-owned surfaces are part of the product: focus rings, selection, caret, link underlines,
  scrollbars, and tabular numerals need deliberate treatment when the system calls for it.
- Use real imagery or no imagery. Use one coherent icon family; do not use emoji or arbitrary
  Unicode glyphs as an icon system.
- Prefer semantic DOM and CSS for simple feedback. A runtime, effect, or asset must earn its
  complexity through a real product capability.

## Defaults to challenge

These are anti-default signals, not unconditional bans, with one exception: an eyebrow or kicker
above a heading is a ban that no brief earns back. For the others a confirmed brief can earn an
exception, but the active `design.md` must explain it:

- identical icon-heading-copy card grids, nested cards, and the hero-metric template;
- an eyebrow or section number above every block without information value;
- gradient text, decorative glass/blur, neon glow, and hard offset shadows;
- colored side stripes used as a generic component shortcut;
- monospace used only to signal “technical”;
- system display fonts used as the visual identity of an own-world surface;
- sketchy SVG scenes, fake grain, or decorative grids without a subject-specific reason;
- a colored `border-left` or `border-right` above 1px on cards, list items, callouts or alerts;
- a geometric mask (circle, polygon, radial cutout) standing in for an organic contour: derive a
  matte from the real image or omit the effect;
- light or dark chosen by category instead of by use scene (who, where, under what light);
- a modal for a task that needs neither interruption nor protected focus.

## Command vocabulary

Use the upstream command intent as a routing vocabulary, whether the external skill is installed or
not:

| Intent | Pipeline route |
| --- | --- |
| `init` / `document` | establish or extract reusable product and visual authority |
| `shape` | resolve job, audience, outcome, states, boundaries, and direction before code |
| `critique` | judge specificity, hierarchy, cognitive load, emotional journey, and heuristics |
| `audit` | check measurable accessibility, performance, theming, responsive behavior, and integrity |
| `polish` | fix root causes while preserving the incumbent visual world |
| `harden` | close errors, empty/loading/success, overflow, i18n, permission, and recovery gaps |
| `typeset` / `layout` / `colorize` | make a focused system-level refinement |
| `animate` / `adapt` / `optimize` | change motion, viewport behavior, or performance with evidence |
| `distill` / `quieter` / `bolder` | simplify or change intensity only when the direction is still correct |
| `live` | use browser-based variants and acceptance evidence, not screenshot-only guessing |

`critique`, `polish`, `distill` and `quieter` have step guides in
[refine-intents.md](refine-intents.md); `impeccable-product-design.json` names the guide for every
command.

## Verification loop

Build the whole requested path first. Inspect one batched render set covering desktop and mobile,
run the deterministic detector and the relevant manual checks together, fix the findings in one
batch, then allow at most one confirmation pass. A clean detector is not a design verdict, and an
attractive screenshot is not functional evidence.

A review the owner must decide (a plate, a comp, an assembled first viewport) is theirs to answer.
Apply their decisions as given, never a favorable verdict of your own. A review still waiting is
pending work, not a finished build: report it as pending and do not build past it.

Separate the questions:

- `critique`: is this specific, clear, emotionally appropriate, and easy to understand?
- `audit`: is the implementation measurable, accessible, responsive, performant, themed, and
  internally coherent?
- `polish`: are the verified defects fixed without changing the concept by stealth?

The pipeline's `DESIGN.md`, `MOTION.md`, change `design.md`, `motion.md`, and `qa.md` remain the
durable source of truth. The Impeccable contract supplies judgment and routing; it does not replace
those artifacts.
