# Proposal: Audit Rendered UI Craft

## Problem

The six UI craft skills bundled by `internalize-ui-craft-sources` are read on demand; nothing checks
a built page against them. An agent can still ship undersized or off-scale text, low contrast, a
page that scrolls sideways, clipped labels, cramped or tiny controls and misaligned groups, and
still pass the web workflow. lintapple (`gholtzap/lintapple`, MIT) measures these failures on the
rendered page, but adopting it as-is would add a second policy file, a second browser stack, an
MPL-licensed axe-core dependency and a 15 px control default below the WCAG 2.2 target floor.

## Scope

- Add an `audit` probe kind to `design-pipeline.interaction-probe.v1`. `verify interaction` runs an
  adapted port of lintapple's in-page page-design rules: font family and loading, a font-size floor
  and declared type scale, measured tabular digits, numeric alignment, solid-background text
  contrast, page background, horizontal overflow, viewport bounds, text clipping, declared content
  boxes, a 24 px target floor, control gaps, declared control insets, stacks, alignment groups and
  concentric radius pairs.
- Thresholds and selectors are probe inputs with documented defaults that the agent copies from
  `DESIGN.md`; the font families are required. Contrast that cannot be resolved over a solid
  background reports `indeterminate` and fails the audit with a fix to add a measurable surface or
  scrim. Optional selector checks without declarations report `not-declared`, never passed. No probe
  field can waive a result.
- Require a passing page audit in the web workflow's `probe` stage at every tier.
- Bind the page's rendered local dependencies and the project's `DESIGN.md` and `MOTION.md` into the
  existing `interaction` gate. A record without that lineage is stale. An audited page may load only
  assets inside the project; CDN, dev-server or outside-project assets fail the verifier's existing
  `external-request` finding with a fix to copy them in, because the gate cannot hash them.
- Make `ui-craft-sources.md` the project-owned rule index: the audit codes with their sources, one
  deduplicated review checklist for rules the audit does not measure (motion feel, focus,
  semantics, copy, states), and the conflict resolutions. The vendored originals stay as provenance
  and detail.
- Out of scope: new CLI commands or flags, a new gate, receipt schema, policy file or digest,
  axe-core or any new runtime dependency, lintapple's CLI, `init`, Playwright helper, keyboard and
  widget engine, axe-backed accessibility rules and banned-copy list, measured focus, motion or
  semantics checks (checklist only here), React Doctor, static source lint, auto-fix and any change
  to Visual Acceptance.

## Reuse

- `verify interaction`, the `interaction-probe.v1` contract, the `interaction` gate and its input
  hashes, the shared puppeteer and Chrome resolver, and the existing finding fields (`code`,
  `severity`, `message`, `fix`, `selector`, `expected`, `actual`).
- The journey-probe precedent (`verify-menu-business-state`) for adding a probe kind.
- lintapple's visibility, geometry and rule logic at
  `90ddc736af6f2712903d53dd9a463445e109f586`, adapted with its MIT notice.

## Affected Capabilities

`design-pipeline`: interaction verification, the web workflow `probe` stage, gate lineage and UI
craft guidance.

## Success Criteria

- A violating fixture page triggers every audit code, a clean fixture passes, and a fixture without
  optional declarations reports them as `not-declared` rather than passed.
- The web workflow cannot finish `probe` without a passing page audit, and `next` says how to add one.
- Editing a stylesheet, script or `DESIGN.md` used by the page reopens `probe`, `review` and `deliver`.
- Pages that passed before may now fail `probe`; each failure names the measured value, the
  threshold and a fix.
