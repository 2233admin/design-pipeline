# Design

This change adds a creative layer to the web workflow, not a gate. It gives an agent building a page
three things it does not have today: web-specific `next` prompts, a treatment and section-brief
template that fits the artifacts a web change already writes, and seven review rules for judging a
built page. It mirrors `add-music-driven-plate-kit` (film treatment, plate brief, R1 to R7), minus
the code kit, which is a later change.

Facts below were read from the repository at HEAD `bbf7fa4` (2026-09-29); each names its file.

## 1. The defect: web inherits film prompts

| Where | What |
| --- | --- |
| `skill/scripts/workflows/shared.cjs` `INTAKE` | Four questions: `product`, `audience` ("Who watches it and where (site hero, social, launch event)?", recommended "Product website hero, general audience."), `duration` ("How long?", recommended "15-30 s for a promo, 30-60 s for an edit."), `assets` (footage, screenshots, models, logos or music). |
| `shared.cjs` `CONCEPTS` | Ask step: "Which concept should we make?", recommended "the concept whose carrier best demonstrates the product action". Run step (no `concepts.md`): cards start with "one sentence about the picture", then "what carries attention between beats", look, tools, license; "Render one key frame per card." |
| `workflows/web.cjs` | Imports `INTAKE`, `CONCEPTS` and `REVIEW` unchanged and uses them in `stages()` for standard and full. Quick skips all three. |
| Shared `REVIEW` | Ask: "Accept this draft, or reject it with one sentence on what is wrong?", `show`: "the draft video", `evidence/contact-sheet.png`, "the gate summary"; recommended "Accept if nothing reads wrong at full speed." Web shows a page, not a video. |
| Other users of the shared prompts | `film.cjs`, `edit.cjs`, and `workflow-core.cjs` `codeStages` (the `ui` deliverable's intake). |

`references/workflow-web.md` already says something different for concepts ("the central idea as one
sentence about the page", "not the same layout restyled"), so the guide and the `next` text disagree.

## 2. Decisions taken

Reversible, low blast radius. Anything that changes scope is in section 6.

1. Web gets its own `INTAKE` and `CONCEPTS` objects, defined in `workflows/web.cjs`. They keep the
   stage ids `intake` and `concepts`, the `finished` predicates, the `record` command strings and the
   action `type` of the shared ones, so `decide` and the guide anchors (`workflow-web.md#intake`,
   `#concepts`) do not change. `shared.cjs` is not edited: film, edit and `ui` output is unchanged by
   construction, and a test compares them with the shared exports.
2. The intake question ids become `product`, `audience`, `scope`, `assets`. `scope` replaces
   `duration`. The answer is free text recorded verbatim into `brief.md` by `decide --stage intake`,
   so no consumer of the ids exists (checked: `decide` only writes `--answer`).
3. Web intake wording: `product` asks what the product is and the one thing a visitor should do or
   understand; `audience` asks who visits and from where, on which devices; `scope` asks which pages
   or sections the page needs and what the visitor should be able to do first; `assets` asks for
   copy, screenshots, product UI, logos, fonts and brand rules, and licensing. No duration, film,
   promo, footage, music or "launch event" wording.
4. Web concepts wording, run step: three cards whose central ideas differ, not the same layout
   restyled; each card starts with the central idea as one sentence about the page, then the section
   arc in one line per section (what each section is for and its dominant element), what carries the
   eye down the page, the look, tools in one line, and any missing license; render the first
   viewport of each card. It also says that after the pick the chosen card is extended with a
   `## Treatment` (`references/web-direction.md`). Ask step: "Which concept should we make?" stays;
   the recommendation names the concept whose section arc best serves what the visitor should do first.
5. The treatment is written after the pick, so it cannot be a `next` stage without adding one, and
   adding a stage would change stage counts (`remaining`, the `line` "n/m") for every web project.
   It is therefore an instruction in the web `build` action (standard and full tiers: "extend the
   chosen card with `## Treatment` before writing `index.html`") and in the `build` section of the
   guide, which is where `next` sends the agent. `finished` predicates are not changed: no content
   check on `concepts.md`, so nothing new can block `next`. The quick tier has no concepts stage and
   its build text is unchanged.
6. All guidance lives in one new file `references/web-direction.md` (as film's is
   `product-film-direction.md`); `workflow-web.md` and the other references point to it. It is a
   load-bearing file, so it goes in `package-resources.json` `required`.
7. No new test file: the behavioural tests go into `tests/workflow-next.test.cjs`, which already
   covers `next` for web, film and edit and is already in `scripts/test-manifest.json`.
8. Web also gets its own `REVIEW` stage object in `workflows/web.cjs` (scope amendment approved after
   the first draft: the shared review is the same defect class). It keeps the stage id `review`, the
   `finished` predicate (a draft with `verdict: "accept"`), the `record` string and the `why`
   bookkeeping of earlier rejected drafts. Its `ask` says "this page", shows the page at its 375x812,
   768x1024 and 1440x900 screenshots, the page's motion at full speed, and the gate summary, and
   points the reviewer to W1 to W7 in `references/web-direction.md` for Visual Acceptance; it never
   mentions video, contact sheet, footage or beat. The recommendation stays "accept if nothing reads
   wrong at full speed". `decide --stage review` and the rejection flow (`interaction` gate cleared,
   project rule) are unchanged, because they live in `workflow-core.cjs`. Film and edit keep the
   shared `REVIEW` (the `ui` deliverable has no review stage), and a test compares them with the
   shared export.

## 3. Treatment

A `## Treatment` section under the chosen card of `concepts.md`. No new artifact.

| Field | Content | Feeds |
| --- | --- | --- |
| Premise | One sentence about the page and the single thing it makes a visitor do or understand | project `DESIGN.md` Overview |
| Section arc | Table: section id, its job, its dominant element (the product or concept object it shows), ground, density (sparse, medium, dense), and the escalation role (opens, builds, lands, rests) | `design.md` Layout grid and Component inventory |
| Style-bible seed | A ground per section, ink, accent and any extra colour; type voices (display, text, data); spacing unit, radius, stroke; and a **must-not-copy** line taken from `reference.md` | project `DESIGN.md` Colors, Typography, Layout |
| Motion language | Table: driver (scroll progress, in-view, pointer, click, load), the response it produces, the primitive (for example `response.spring-settle`, stepped), and the reduced-motion substitute | project `MOTION.md` vocabulary; `motion.md` |
| Escalation and negative space | Where the page builds, where it lands (the section that holds still), and which section is deliberately empty and why | W3, W5 |

Project `DESIGN.md` has fixed level-two sections (`design-synthesis.md`: Product Context, Overview,
Colors, Typography, Layout, Components, Do's and Don'ts, Source Decisions) and `MOTION.md` follows
`motion-foundation.md`; the seed fills them, it does not add sections.

## 4. Section briefs

One block per section of the arc. Each key lands in a field that already exists; a brief never
restates a value another artifact owns, it names the section id. Briefs are self-contained, so
sections can be built independently.

| Brief key | Lands in |
| --- | --- |
| Dominant element and its one job | `design.md` Component inventory row; the component id comes from the component-first flow (`component-first components`) when the section uses a catalogued component |
| Supporting layers (at most three), one job each | Further Component inventory rows |
| Ground and density | `design.md` Layout grid (the section's row) and Color tokens |
| States the element must have (empty, loading, error, hover, focus, active) | `component-state-matrix.json` entries (`design-pipeline.component-state-matrix.v1`) |
| Driver and response, one verb per element | `motion.md` Interaction Inventory row: Trigger, Target, Primitive / effect, Purpose, Start state, End state, Repeat behavior |
| Proof of response | An `interaction.json` probe (`design-pipeline.interaction-probe.v1`): `id`, `target`, `input.kind` (`pointer-sweep`, `wheel` or `click`), `expect.response` (`spring`, `linear` or `stepped`) |
| Signature the section carries, if it is the first viewport | The direction-preview candidate's product-specific signature (`direction-preview.md`) |
| Escalation, negative-space or landing line | The section's row in the `design.md` Layout grid |

A section with no driver has no Interaction Inventory row and no probe, and says so in its brief; that
is a valid brief (W3, W6). The probe schema, state matrix schema and `motion.md` template are
unchanged; the guidance uses only their existing fields.

## 5. Review rules W1 to W7

Reported only under Visual Acceptance in `qa.md` (a new checklist section in `qa-checklist.md`). They
add no finding code, change no gate status and do not change `component-first` `visualAcceptance`.
Each names the existing evidence it reads. Where a rule overlaps an existing gate finding, the gate
finding stays a Conformance finding with its existing meaning; the rule only says where a reviewer
looks beyond it. Thresholds are review heuristics, uncalibrated: no page has been built with these
rules and judged.

Evidence available today: `verify composition` findings from `elements.json` (`composition-gate.md`),
screenshots at 375x812, 768x1024 and 1440x900 (`qa-checklist.md` Browser / Visual Checks), the
`verify interaction` result, `motion.md` rows, and the treatment and section briefs.

| Rule | Read | Looks right |
| --- | --- | --- |
| W1 One dominant element per section, and the first viewport carries a signal | Component inventory row per section; 1440x900 and 375x812 first-viewport screenshots; composition `no-focal-point` and `flat-hierarchy`; the direction-preview signature | One element is clearly the largest or highest-contrast in each section, and the first viewport shows the signature the preview named, at both sizes |
| W2 Adjacent sections differ in density | The Layout grid density column; the three screenshot sets side by side; composition `dead-band`, `clutter`; anti-slop rubric `template-pattern-density` | No two adjacent sections share density; at least one section is visibly denser or sparser than both neighbours; a run of identical card grids is a revision finding |
| W3 One section is deliberately empty | The treatment's negative-space line; composition `dead-band` (allowed with `--allow dead-band` and a reason in `qa.md`, as `composition-gate.md` requires); screenshots | The empty section is named in the treatment, does one job (a pause before the landing, or a statement), and is not the first or the last section |
| W4 Each section changes ground or structure | The seed's ground per section; `design.md` Color tokens and Layout grid; screenshots at 1440x900; composition `weak-separation` | Every section boundary changes luminance or hue of the ground, or the grid or alignment axis; copy changing alone does not count |
| W5 Scroll pacing builds, then lands | The arc's escalation roles in order; screenshots in scroll order; `motion.md` rows with a scroll driver; the probe for the landing section (`returnsToRest`) | Density, scale or motion intensity rises toward one landing section (proof or call to action), which then holds still; the page does not end on its busiest section |
| W6 Motion answers a named driver | `motion.md` Interaction Inventory Trigger column and Tracks Driver column; `verify interaction` findings `dead-interaction`, `opacity-only`, `linear-response` | Every animated element has a trigger; entrances move (transform) and do not only fade; a fade-only interaction is stated as intended. `opacity-only` is also a Conformance finding when a probe reports it |
| W7 Type and colour voices stay inside the style seed | Seed vs project `DESIGN.md`; composition `palette-sprawl` and `type-scale-sprawl`; `design.md` type scale | No third type voice, no accent outside the seed; a departure is recorded in `design.md` with its cause |

Audio and time-based checks from film do not apply. Whether a scroll-driven page reads as building
then landing is judged by scrolling it at full speed; the screenshots show state, not pacing.

## 6. Risks, residuals and open questions

Decided by the approved spec defaults: fix the film wording in this change (yes); no new gate,
receipt, analyzer or schema; agents never record Visual Acceptance.

Known residual, not changed here and reported for the user to decide:

- The `ui` deliverable's intake is the shared one and still asks "How long?". Default: leave it.

Risks:

- Adding the treatment to the `build` action lengthens web `build` text at standard and full.
  Mitigation: one sentence and a pointer, not the template.
- W1 to W7 are uncalibrated. Mitigation: they are guidance, they add no finding, and `qa.md` says so.
- The treatment can be skipped: nothing checks `concepts.md` for it (decision 5). That is the price of
  adding no gate; the review rules read it, so a missing treatment shows as unreadable evidence.

## 7. Not verified here

- No page has been built with the treatment and judged, so W1 to W7 have no calibration and Visual
  Acceptance is pending.
- `puppeteer-core` is not resolvable from the repository, so `verify interaction` and
  `composition capture` were not run for this change (the change touches neither). The probe example
  in the docs is validated against the schema loader, not in a browser.
