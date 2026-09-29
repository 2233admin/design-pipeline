# Add a web treatment and section briefs

## Why

The web side of the pipeline is strong on gates, contracts and receipts (`verify interaction`, the
composition gate, component-first, the direction preview) and thin on the creative layer that comes
before them. A gap map of the repository (2026-09-29) found no template that turns a chosen concept
into per-section briefs, no escalation, density or negative-space rules for a page, and no place
where a page's ground, type and motion voices are fixed once so that sections read as one page. The
film side got exactly this layer in `add-music-driven-plate-kit`; the web side did not.

There is also a defect. The `web` workflow's `next` intake, concepts and review steps are the shared
film prompts. `skill/scripts/workflows/web.cjs` imports `INTAKE`, `CONCEPTS` and `REVIEW` from
`shared.cjs` unchanged, so a web project is asked "How long?" (recommended "15-30 s for a promo,
30-60 s for an edit"), "Who watches it and where (site hero, social, launch event)?", to write
concept cards about "the picture", "between beats" and "one key frame", and at review is shown "the
draft video" and `evidence/contact-sheet.png`.

## What changes

1. Web-specific intake, concepts and review prompts, defined in `workflows/web.cjs`. The intake
   replaces the duration question with a scope question (which pages or sections, and what the
   visitor does first) and drops promo, social and launch wording. The concepts step asks for three
   cards whose central ideas differ, each stating the page's section arc, and says the chosen card
   is extended with a treatment. The review stage names the page and its screenshots at 375x812,
   768x1024 and 1440x900 instead of "the draft video" and `evidence/contact-sheet.png`, and points
   the reviewer to W1 to W7 for Visual Acceptance. `shared.cjs` is not edited, so the film, edit and
   `ui` prompts are unchanged.
2. A treatment template for the `## Treatment` section under the chosen card of `concepts.md`:
   premise, section arc, style-bible seed with a must-not-copy line, motion language, escalation and
   negative space. No new artifact.
3. A section brief template whose keys map onto fields that already exist: `design.md` component
   inventory and layout grid, `component-state-matrix.json` entries, `motion.md` Interaction
   Inventory rows, the `interaction.json` probe, and the direction-preview signature. The treatment's
   style-bible seed feeds the project `DESIGN.md` and its motion language feeds `MOTION.md`.
4. Seven review rules, W1 to W7 (dominant element and first-viewport signal, density contrast,
   a purposeful empty section, a changed ground or structure per section, scroll pacing that builds
   then lands, motion that answers a named driver, type and colour inside the style seed), each
   naming the existing evidence a reviewer reads. They are Visual Acceptance guidance, reported in
   `qa.md`, never as Component Conformance.

The guidance lives in one new reference, `references/web-direction.md`, with short pointers from
`workflow-web.md`, `pipeline-reference.md`, `design-spec.md`, `motion-spec.md`,
`anti-slop-review.md`, `qa-checklist.md` and `SKILL.md`.

## Decisions taken

The user approved change 1 only, with the defaults of the approved spec
(`docs/superpowers/specs/2026-09-29-web-creative-layer.md`, open questions): fix the film-flavoured
web intake and concepts text in this change (it alters the user-visible `next` output); no new gate,
receipt, analyzer or schema; agents never record Visual Acceptance. Changes 2 to 4 of that spec
(section kit, golden case, multi-viewport capture) are separate changes and are not started here.

## What this change does not claim

It claims no visual improvement. W1 to W7 are uncalibrated heuristics, as film R1 to R7 were: no page
has been built with them and judged. Visual Acceptance for this change stays pending until a named
reviewer records a result in `qa.md`. Agents never record it.

## Not in scope

- A new gate, finding code, receipt, analysis schema, or any field on `interaction.json`,
  `component-state-matrix.json`, `direction-preview.json` or the workflow state.
- A shared token or primitive kit as code, a golden page, a benchmark scenario, and multi-viewport
  or full-page capture (later changes of the approved spec).
- The shared intake the `ui` deliverable uses, which still asks "How long?". It is film-flavoured
  the same way; it is recorded in `design.md` section 6 as a known residual for the user to decide.
- Any edit to `skill/scripts/film-core.cjs`.

## Builds on

`add-music-driven-plate-kit` (the film treatment, plate brief and R1 to R7 pattern this mirrors),
`port-motion-web-interaction` (web sub-workflow, `verify interaction`, `web-motion.md`),
`split-film-edit-workflows` (the sub-workflow guide contract), `add-composition-gate` (the findings
W1 to W7 cite), `design-component-first-artifact-v2` (Component Conformance and Visual Acceptance
kept separate) and `redesign-user-workflow` (`next`, state, tiers).
