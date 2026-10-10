# Web direction

Creative layer for the `web` deliverable at the `standard` and `full` tiers: a treatment for the whole
page, a brief per section, and seven review rules. It adds no artifact, gate, finding code, receipt
or schema; every field below lands in a file the web workflow already writes. The `quick` tier and
`replicate` mode skip it: neither has a concept card to extend, and a replica follows its reference.

## Treatment

The treatment is a `## Treatment` section under the chosen card of `concepts.md`. Write it after the
pick and before `index.html`. It is the one place the page's intent is stated; sections, tokens and
motion refer back to it.

| Field | Content |
| --- | --- |
| Premise | One sentence about the page and the single thing it makes a visitor do or understand. |
| Section arc | One row per section: section id, its job, its dominant element (the product or concept object it shows), ground, density (`sparse`, `medium`, `dense`), escalation role (`opens`, `builds`, `lands`, `rests`). |
| Style-bible seed | A ground per section, ink, accent and any extra colour; type voices (display, text, data); spacing unit, radius, stroke; one **must-not-copy** line taken from `reference.md`. |
| Motion language | One row per driver (scroll progress, in-view, pointer, click, load): the response it produces, the primitive (for example `response.spring-settle`, or stepped), and the reduced-motion substitute. |
| Escalation and negative space | Where the page builds, the section that lands and holds still, and the section that is deliberately empty and why. |

The seed feeds project `DESIGN.md` Colors, Typography and Layout, and the premise feeds Overview.
The motion language feeds the `MOTION.md` vocabulary and the `motion.md` rows. `DESIGN.md` and
`MOTION.md` keep their fixed sections; the treatment fills them and adds none. Nothing checks the
treatment: a missing one shows up as unreadable evidence in the review.

## Section briefs

One brief per section of the arc, self-contained so sections can be built separately. A brief names
the section id and never restates a value another artifact owns.

| Brief key | Lands in |
| --- | --- |
| Dominant element and its one job | `design.md` Component inventory row; use the component id from the component-first flow when the section uses a catalogued component |
| Supporting layers (at most three), one job each | Further Component inventory rows |
| Ground and density | `design.md` Layout grid row of the section, and Color tokens |
| States the element needs (empty, loading, error, hover, focus, active) | `component-state-matrix.json` entries |
| Driver and response, one verb per element | `motion.md` Interaction Inventory row: Trigger, Target, Primitive / effect, Purpose, Start state, End state, Repeat behavior |
| Proof of response | An `interaction.json` probe: `id`, `target`, `input.kind` (`pointer-sweep`, `wheel`, `click`), `expect.response` (`spring`, `linear`, `stepped`) |
| Signature, if this is the first viewport | The direction-preview candidate's product-specific signature |
| Escalation, negative-space or landing line | The section's `design.md` Layout grid row |

A section with no driver has no Interaction Inventory row and no probe, and its brief says so. That
is a valid brief (W3, W6).

Worked brief, section `plan-picker` (role `builds`, density `dense`, ground `ink-900`):

- Dominant element: `plan-dial`, one job: the visitor sets a team size and sees the price change.
  Supporting layers: `price-readout` (shows the number), `seat-ticks` (mark the steps).
- States: hover, focus, active on `plan-dial`.
- Driver and response: pointer drags the dial; the needle follows with a spring settle.
- Motion row: Trigger pointer move over `#plan-dial`; Target `#plan-dial`; Primitive
  `response.spring-settle`; Purpose direct feedback; Start state rest; End state rest; Repeat every move.
- Landing line: this section builds toward `close` and does not land.

Its proof, `interaction.json`:

```json
{
  "schema": "design-pipeline.interaction-probe.v1",
  "id": "plan-picker",
  "url": "index.html",
  "viewport": { "width": 1440, "height": 900 },
  "probes": [
    {
      "id": "dial-follows-pointer",
      "target": "#plan-dial",
      "input": { "kind": "pointer-sweep", "from": [400, 520], "to": [900, 520], "durationMs": 500 },
      "expect": { "responds": true, "settleWithinMs": 1200, "returnsToRest": true, "response": "spring" }
    }
  ]
}
```

## Review rules W1 to W7

Visual Acceptance guidance for a reviewer of a built page. They add no finding code and change no
gate. Report them only under Visual Acceptance in `qa.md`, as a pending checklist for the reviewer
(`qa-checklist.md`); an agent never records acceptance. Where a rule overlaps a gate finding, that
finding stays a Conformance finding with its existing meaning and severity; the rule says where to
look beyond it. The thresholds are uncalibrated heuristics: no page has been judged with them yet.
Screenshots are the 375x812, 768x1024 and 1440x900 sets from Browser / Visual Checks.

| Rule | Evidence read | Looks right |
| --- | --- | --- |
| W1 One dominant element per section; the first viewport carries a signal | Component inventory row per section; first-viewport screenshots at 1440x900 and 375x812; composition `no-focal-point`, `flat-hierarchy`; the direction-preview signature | One element is clearly the largest or highest-contrast in each section; the first viewport shows the named signature at both sizes |
| W2 Adjacent sections differ in density | Layout grid density column; the three screenshot sets side by side; composition `dead-band`, `clutter`; anti-slop item `template-pattern-density` | No two adjacent sections share a density; one section is visibly denser or sparser than both neighbours; a run of identical card grids is a revision finding |
| W3 One section is deliberately empty | The treatment's negative-space line; composition `dead-band` (allowed with `--allow dead-band` and a reason in `qa.md`); screenshots | The empty section is named in the treatment, does one job (a pause before the landing, or a statement) and is neither first nor last |
| W4 Each section changes ground or structure | The seed's ground per section; `design.md` Color tokens and Layout grid; 1440x900 screenshots; composition `weak-separation` | Every boundary changes the ground's luminance or hue, or the grid or alignment axis; changing copy alone does not count |
| W5 Scroll pacing builds, then lands | Escalation roles in order; screenshots in scroll order; `motion.md` rows with a scroll driver; the probe for the landing section (`returnsToRest`) | Density, scale or motion intensity rises toward one landing section (proof or call to action) that then holds still; the page does not end on its busiest section |
| W6 Motion answers a named driver; no opacity-only entrance | `motion.md` Trigger and Driver columns; `verify interaction` findings `dead-interaction`, `opacity-only`, `linear-response` | Every animated element has a trigger; entrances move (transform) rather than only fade; a fade-only interaction is stated as intended |
| W7 Type and colour stay inside the style seed | The seed against project `DESIGN.md`; composition `palette-sprawl`, `type-scale-sprawl`; `design.md` type scale | No third type voice and no accent outside the seed; a departure is recorded in `design.md` with its cause |

Whether a scroll-driven page builds and then lands is judged by scrolling it at full speed; the
screenshots show state, not pacing.

## What these rules are not

- Not a gate: they add no finding code, no status and no receipt, and block nothing.
- Not Component Conformance: the gate findings named above keep their meaning and severity there.
- Not acceptance: an agent never records Visual Acceptance; `qa.md` leaves it pending until a
  reviewer records it.
- Not calibrated: W1 to W7 are heuristics, and where a page justifies a departure the reviewer
  decides.
- Not a schema: the probe, state matrix, direction-preview and motion contracts are used as they are.
