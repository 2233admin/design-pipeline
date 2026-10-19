# Web direction

Creative layer for the `web` deliverable at the `standard` and `full` tiers: a treatment for the whole
page, a brief per section, and seven review rules. It adds no artifact, gate, finding code, receipt
or schema; every field below lands in a file the web workflow already writes. The `quick` tier and
`replicate` mode skip it: neither has a concept card to extend, and a replica follows its reference.

## Concept pre-screen

Before the owner picks, `direction check` compares the three full versions, `a`, `b` and `c`, by
first-screen structure: layout skeleton, focal element, type position and image role. They must
genuinely diverge; different copy, colour or styling on the same spatial skeleton does not count.
The six cards, the thumbnail board and the readability of each capture are checked in the same
run, and every finding carries its fix ([workflow-web.md#concepts](workflow-web.md#concepts),
[direction-preview.md](direction-preview.md)). Do not ask the owner to screen failed versions. This
is preparation for the pick, not Visual Acceptance, a gate or an additional W rule; only the owner's
reply selects the direction.

## Treatment

The treatment is a `## Treatment` section in `concepts.md`, written from the chosen version's card; when the owner
combined variants, it goes under the first card named and says what it takes from the others. Write
it in the first build step, after the owner approves the description and before the first section
is built. It is the one place the page's intent is stated; sections, tokens and motion refer back
to it. Its section arc lists exactly the section ids of the approved description's `## Sections`
list, in that order. If the arc you would write differs, raise it with the owner as a description
correction before anything is built; do not build a different arc.

| Field | Content |
| --- | --- |
| Premise | One sentence about the page and the single thing it makes a visitor do or understand. |
| Section arc | One row per section of the approved description, in its order: section id, its job, its dominant element (the product or concept object it shows), ground, density (`sparse`, `medium`, `dense`), escalation role (`opens`, `builds`, `lands`, `rests`). |
| Style-bible seed | A ground per section, ink, accent and any extra colour; type voices (display, text, data); spacing unit, radius, stroke; when `reference.md` exists, one **must-not-copy** line taken from it. |
| Motion language | One row per driver (scroll progress, in-view, pointer, click, load): the response it produces, the primitive (for example `response.spring-settle`, or stepped), and the reduced-motion substitute. |
| Escalation and negative space | Where the page builds, the section that lands and holds still, and the section that is deliberately empty and why. |

The seed feeds project `DESIGN.md` Colors, Typography and Layout, and the premise feeds Overview.
The motion language feeds the `MOTION.md` vocabulary and the `motion.md` rows. `DESIGN.md` and
`MOTION.md` keep their fixed sections; the treatment fills them and adds none. Nothing checks the
treatment: a missing one shows up as unreadable evidence in the review.

## Section briefs

One brief per section of the arc, self-contained so sections can be built separately: the build
goes section by section, first screen first, each reviewed by the owner before the next
([workflow-web.md#build](workflow-web.md#build)). A brief names the section id and never restates
a value another artifact owns.

| Brief key | Lands in |
| --- | --- |
| Dominant element and its one job | `design.md` Component inventory row; use the component id from the component-first flow when the section uses a catalogued component |
| Supporting layers (at most three), one job each | Further Component inventory rows |
| Ground and density | `design.md` Layout grid row of the section, and Color tokens |
| How the element looks in each state the matrix requires (hover, focus, pressed, disabled, loading, empty, error) | `component-state-matrix.json` entries; `checkComponentMatrix` rejects an entry that lacks one of the seven |
| Driver and response, one verb per element | `motion.md` Interaction Inventory row: Trigger, Target, Primitive / effect, Purpose, Start state, End state, Repeat behavior |
| Proof of response | An `interaction.json` probe: `id`, `target`, `input.kind` (`pointer-sweep`, `wheel`, `click`), `expect.response` (`spring`, `linear`, `stepped`) |
| Signature, if this is the first viewport | The direction-preview candidate's product-specific signature |
| Escalation, negative-space or landing line | The section's `design.md` Layout grid row |

A section with no driver has no Interaction Inventory row and no probe, and its brief says so. That
is a valid brief (W3, W6). The page as a whole still needs at least one probe: the `probe` stage
needs a passed `verify interaction`, and an empty `probes` list is invalid.

Worked brief, section `plan-picker` (role `builds`, density `dense`, ground `ink-900`):

- Dominant element: `plan-dial`, one job: the visitor sets a team size and sees the price change.
  Supporting layers: `price-readout` (shows the number), `seat-ticks` (mark the steps).
- States: the seven matrix states of `plan-dial`.
- Driver and response: the pointer moves across the dial; the needle follows with a spring settle
  and stays at the chosen size.
- Motion row: Trigger pointer move over `#plan-dial`; Target `#plan-dial`; Primitive
  `response.spring-settle`; Purpose direct feedback; Start state rest; End state the chosen size;
  Repeat every move.
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
      "expect": { "responds": true, "settleWithinMs": 1200, "returnsToRest": false, "response": "spring" }
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
| W1 One dominant element per section; the first viewport carries a signal | Component inventory row per section; first-viewport screenshots at 1440x900 and 375x812; composition `no-focal-point`, `flat-hierarchy`; the direction-preview signature; chosen concept's `Skeleton:` line | One element is clearly the largest or highest-contrast in each section; the first viewport shows the named signature and chosen focal hierarchy at both sizes; the concept pre-screen does not establish acceptance of the built page |
| W2 Adjacent sections differ in density | Layout grid density column; the three screenshot sets side by side; composition `dead-band`, `clutter`; anti-slop item `template-pattern-density` | No two adjacent sections share a density; one section is visibly denser or sparser than both neighbours; a run of identical card grids is a revision finding |
| W3 One section is deliberately empty | The treatment's negative-space line; composition `dead-band` (allowed with `--allow dead-band` and a reason in `qa.md`); screenshots | The empty section is named in the treatment, does one job (a pause before the landing, or a statement) and is neither first nor last |
| W4 Each section changes ground or structure | The seed's ground per section; `design.md` Color tokens and Layout grid; 1440x900 screenshots; composition `weak-separation` | Every boundary changes the ground's luminance or hue, or the grid or alignment axis; changing copy alone does not count |
| W5 Scroll pacing builds, then lands | Escalation roles in order; screenshots in scroll order; `motion.md` rows with a scroll driver; the probe for the landing section (`returnsToRest`) | Density, scale or motion intensity rises toward one landing section (proof or call to action) that then holds still; the page does not end on its busiest section |
| W6 Motion answers a named driver; no opacity-only entrance | `motion.md` Trigger and Driver columns; `verify interaction` findings `dead-interaction`, `opacity-only`, `linear-response` | Every animated element has a trigger; entrances move (transform) rather than only fade; a fade-only interaction is stated as intended |
| W7 Type and colour stay inside the style seed | The seed against project `DESIGN.md`; composition `palette-sprawl`, `type-scale-sprawl`; `design.md` type scale | No third type voice and no accent outside the seed; a departure is recorded in `design.md` with its cause |

Whether a scroll-driven page builds and then lands is judged by scrolling it at full speed; the
screenshots show state, not pacing.

## Critique on request

Run this only when the owner asks for a critique, a score or "how good is this". It is not part of
delivery, `review` or any gate, and `next` never schedules it. It reads W1 to W7 as evidence and
changes none of them. It applies to any visual output (page, deck, infographic, app screen, cover).
W2 to W5 and the motion part of W6 describe a scrolling page; for a static or slide output mark them
n/a and score those dimensions from the screenshot alone. A dimension is never scored down for
behaviour the output cannot have.

### Dimensions

Score each dimension 0 to 10 with one sentence of evidence. Concept comes first because execution
only amplifies it: polishing an empty concept makes a brighter template. Score strictly: there is
no default 7, competent but generic work sits at 5 or 6, and an 8 needs evidence a peer would accept.

| Dimension | Reads | W rules it reads |
| --- | --- | --- |
| 0 Concept | The idea, in one sentence; the chosen direction card's hero and skeleton | none; asked of the whole piece |
| 1 Direction fidelity | Whether it embodies the chosen direction and project `DESIGN.md` without mixing in other looks | W7 |
| 2 Hierarchy and pacing | Reading order, density contrast, ground changes, the landing section | W1 W2 W3 W4 W5 |
| 3 Craft | Alignment, spacing system, colour and font count, edge precision | none; read from screenshots, with `UC-` ids as supporting evidence |
| 4 Function | Every element serves the goal; the key action or fact is where the eye lands; motion answers a driver | W6 |
| 5 Originality | Avoids the stock look (gradient orb for AI, neon on near-black, matrix rain, circuit boards); a reasoned surprise | none; the direction card's source and the ledger |

Levels, written for Concept; the other dimensions apply the same bands to the question in the table:

- 9 to 10: an idea grown from this user's content, a motif nothing else could replace.
- 7 to 8: a clear idea; the motif fits but a nearby topic would also work.
- 5 to 6: style without an idea; good looking, says nothing.
- 3 to 4: a template with a skin on it.
- 1 to 2: wrong style, or decoration piled up.

Concept questions: can the idea be said in one sentence; with all text and logos covered, is the
subject still recognisable (for type-led work, ask whether the typographic treatment survives a
change of subject); would it still hold with another client's name (if yes it is a template and
Concept is at most 5); does the form come from the content rather than from a style list.

Anchors for the others: Hierarchy, heading at least 2.5 times body size, three or four distinct
levels, and the squint test (blur the screenshot; the order must survive). Craft, one spacing scale,
at most four colours plus greys, at most two type families, one alignment axis.

Emphasis by output decides which Fix items rank first and where to look hardest; it does not weight
the mean. Concept is first for all of them and is never traded away:

| Output | Weigh most | Relax |
| --- | --- | --- |
| Cover or social image | Originality, hierarchy | Function |
| Infographic | Function, hierarchy | Originality (accuracy first) |
| Deck | Hierarchy, function | Originality (clarity first) |
| PDF or white paper | Craft, function | Originality (professional first) |
| Landing page or site | Function, hierarchy | none |
| App UI | Function, craft | Direction fidelity (usability first) |

### Overall score

The overall score is the mean of the six dimension scores, to one decimal. **Concept veto:** when
Concept is 5 or lower, the overall score is capped at 6.0 and the critique says to fix the concept
before the execution. Bands: 8 and above strong, 6 to 7.9 good, 4 to 5.9 needs work, below 4 fails.

### Output form

Every critique has these parts, in this order:

1. Scores: the six dimension scores with one sentence each, then the overall score and band (and the
   veto when it applied).
2. Keep: what works, in design terms the owner can protect during revisions.
3. Fix: problems ordered by severity, each tagged fatal (the piece fails its job or concept),
   important (visibly weakens it) or polish (small refinement). Each gives the current state, why it
   matters and a concrete fix with numbers (for example "heading 16px to 48px", "gaps only
   8/16/24/32/48"). A fix without a value is not a fix; project tokens win over these examples.
4. Quick Wins: the three changes that improve the piece most in five minutes, as a checkbox list.

### What a critique is not

- Not Visual Acceptance: the score is a reviewer's aid. Only the owner records acceptance, and the
  owner's choice outranks the score. If the owner chose a direction or declined a finding, say what
  the critique would change and do not override the choice.
- Not Component Conformance: gate findings and `UC-` ids stay there, separately, with their existing
  meaning. A critique line never turns a failing finding into a pass or the reverse.
- Not a gate or a receipt: nothing reads it. Keep the text under a `Critique` heading in `qa.md`
  beside, never inside, the Visual Acceptance block.

## What these rules are not

- Not a gate: they add no finding code, no status and no receipt, and block nothing. The scored
  critique above reads them only when the owner asks for one.
- Not Component Conformance: the gate findings named above keep their meaning and severity there.
- Not acceptance: an agent never records Visual Acceptance; `qa.md` leaves it pending until a
  reviewer records it.
- Not calibrated: W1 to W7 are heuristics, and where a page justifies a departure the reviewer
  decides.
- Not a schema: the probe, state matrix, direction-preview and motion contracts are used as they are.
