## Why

A web owner today gets a form: four numbered questions (product, audience, scope, assets) with
recommended answers, where one word, `default`, accepts all of them. Then they pick one of three
concept cards on a contact sheet, and the next thing they see is a whole built page. Three problems
follow:

- They are asked for facts the agent could look up, and a silent `default` stands in for decisions
  nobody stated.
- Nobody plays back what was understood, and no written description is approved before the build.
- The page arrives all at once, so a wrong first screen is found only after everything else was
  built on it.

Only a rejected final draft becomes a project rule. Every earlier "no" the owner gives in
conversation is lost.

The owner approved, in plain language, a conversational flow modelled on obra/superpowers
`brainstorming` and Matt Pocock's `grilling` and `prototype` (UI branch):

1. An opening with one skip line and one open question.
2. Facts gathered by the agent.
3. Intent and taste asked one open question at a time; concrete decisions asked as numbered rounds
   with recommended answers.
4. A skip path that states its decisions.
5. A playback that is corrected until the owner confirms it.
6. Three switchable first-screen variants on one page.
7. A one-page description approved before any build.
8. A section-by-section build with a review of each section.
9. Every rejection recorded as a project rule.
10. The final acceptance, kept as it is.

## What Changes

- **Intake.** Web intake opens with the skip line and one open question. It ends with a confirmed
  playback (`decide --stage intake --verdict accept`) or a stated skip (`--choice skip` with the
  one-line decision). Corrections (`--verdict reject`) become rules and reopen intake.
- **Quick tier.** Quick web work starts by telling the owner, in one line, what was decided for them,
  and records that line.
- **Variants.** `concepts` produces `concepts.html`: three structurally different first screens
  marked `data-variant` A/B/C, one shown at a time by `?variant=`, with a new packaged floating
  switcher in `skill/tools/variant-switcher/`. The owner picks one variant, combines several
  (`--choice B,C --answer`) or rejects them (a rule). The switcher may never ship in `index.html`.
- **Concrete-decision round.** The components ask becomes one grilling round of numbered questions
  with recommendations: the sections in build order at standard/full, and the component sources.
  The PR #100 source decision and its validation are unchanged.
- **Description gate.** New `description` stage at standard/full. `brief.md` becomes the one-page
  description. `decide --stage description --verdict accept --choice <section ids>` approves it and
  binds the brief bytes, the playback, the variant pick and the component decision. Nothing is
  built before the approval.
- **Section build.** Build at standard/full is a section loop. The first screen comes first, each
  section is marked `data-section`, and `next` asks the owner to review each built section
  (`decide --stage section`) before building the next one. A section verdict may cite
  runtime-review Feedback records with `--evidence`.
- **Rules.** Every rejection (playback, variants, description, section, draft) appends to the
  existing `state.rules`.
- **Unchanged.** Probe, the final review, delivery and their lineage stay as they are; the final
  review's reason now names final acceptance.
- **Docs.** `workflow-web.md`, `web-direction.md`, `stages.md`, `pipeline-reference.md`, the tools
  index, the CLI help and the CHANGELOG are updated.

## Capabilities

- `design-pipeline`: MODIFIED `single next step` (a web conversation may ask an open question
  without a recommendation), `two human decisions` (web standard/full asks at each conversational
  checkpoint; film/edit keep two decisions) and `Web build follows an explicit component source
  decision` (at standard/full, asked in the concrete-decision round before the description).
- `web-workflow`: MODIFIED intake, concepts, stage-order, treatment and build requirements, plus
  ADDED requirements for the playback, quick stated decision, variants page, decision round,
  description gate, section loop, runtime-review Feedback citation and rule recording.

## Reuse

The change adds no gate, receipt schema or feedback system. It reuses:

- `next`/`decide` and `.design-pipeline/state.json`;
- `state.rules`, the record a rejected draft already writes;
- the film sample's byte-bound verdict loop as the pattern for repeated asks;
- the components decision and manifest validator;
- the interaction gate, review binding and delivery binding;
- `brief.md` as the project brief;
- runtime-review Feedback records, cited rather than reimplemented.

## Impact

- **Users:** standard/full web projects ask more often but each ask is smaller, and nothing is built
  before the description is approved.
- **In-flight standard/full web projects:** they keep their intake, concept and components records,
  but must have the description approved and each section reviewed before probe.
- **In-flight quick web projects:** they record a stated decision first.
- **Unchanged:** film, edit and ui behaviour.
- **Known limit:** runtime-review needs a Playground selection and component-first lineage that
  ordinary web projects lack, so section comments are recorded through `decide`, and element-level
  Feedback is cited only when a project already has runtime-review inputs (see design.md, Decision 6).
