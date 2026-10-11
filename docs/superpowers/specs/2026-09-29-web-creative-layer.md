# Web creative layer (spec, approved for change 1 only)

Status: approved 2026-09-29 for change 1 (`add-web-treatment-and-section-briefs`) only. Changes 2 to 4
are not approved; each needs its own approval. Behaviour changes ship as OpenSpec changes; this
document is the design summary.

## Problem

The web/UI side of design-pipeline is strong on gates, contracts and receipts and has almost no
creative layer (gap map, read-only, 2026-09-29): no treatment-to-section-brief template, no shared
token/primitive kit as code, no escalation/density/negative-space rules, no visual-quality golden
case. Also a real defect: the web workflow's `next` intake and concepts prompts are the shared film
ones (`scripts/workflows/shared.cjs:28-42,64`, imported unchanged by `workflows/web.cjs:8,42`), so a
web page is asked "How long?" (15-30 s promo).

## Approach (mirror the film change `add-music-driven-plate-kit`)

Creative layer, not gates. Extend existing artifacts; no new gate, receipt, analyzer or schema.
Component Conformance and Visual Acceptance stay separate; agents never record acceptance.

Proposed changes, in order:

1. `add-web-treatment-and-section-briefs` (+ escalation/density rules W1-W7 as Visual Acceptance
   guidance, as film R1-R7). `## Treatment` under the chosen card of `concepts.md`; section briefs map
   onto existing fields (design.md component inventory, component-state-matrix, motion.md Interaction
   Inventory, `interaction.json` probe, direction-preview signature). Give web its own intake and
   concepts prompts (fixes the film wording defect).
2. `add-web-section-kit`: neutral section chrome (`--wk-*` overridable token slots, greys only) plus a
   small deterministic JS vocabulary (spring driver, scroll-progress binder, in-view reveal that
   moves rather than fades, reduced-motion safe). Must not become a generic template look.
3. `add-web-golden-case-and-eval`: a non-canvas, non-film page (density contrast exercised),
   treatment, briefs, built page, probe file, README with blind pairwise protocol; optional
   `required:false` benchmark scenario. Conformance only; Visual Acceptance pending a named reviewer.
4. `extend-composition-capture-for-page-review`: multi-viewport / full-page / contact sheet on the
   existing `composition capture`; new flags registered in `KNOWN_OPTIONS`.

## Constraints found

- Chrome 154 and ffmpeg are installed; puppeteer-core is not resolvable from the repo. Both
  `verify interaction` and `composition capture` need it (`--puppeteer-module` can point at a copy).
- Whether the kit can be registered as a project-owned provider in `component-capabilities.json`
  (governed by component-first) is unverified.
- Heuristics W1-W7 will be uncalibrated, as film R1-R7 were.

## Open questions (defaults in bold)

1. Bundling: **1 as the first change; 2 and 3 as later changes; 4 independent** vs one umbrella.
2. Fix the film-flavoured web intake/concepts text in change 1: **yes** (changes user-visible `next`).
3. Kit registration (change 2, not approved): **deferred** until the component-first
   capability/provider schemas are read; standalone registry is only the fallback.
4. Golden case product: **data-heavy tool with a scroll page** (needs density contrast).
5. Kit look: **strictly neutral**, as film.
6. Reviewer: **the user**; benchmark scenario optional.
7. Web scoring: **by hand from existing gate outputs**; no new scorer.
8. Local tooling for a Conformance run: **use the sibling puppeteer-core via `--puppeteer-module`**.
