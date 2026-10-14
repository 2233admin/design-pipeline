# Design

Decisions from the 2026-09-28 grilling session (Q1-Q33). Each line is a settled decision.

## Users and interaction

- Q1 People talk to an agent in natural language; the CLI is the agent's hands. "Simple" means
  few questions, clear steps and visible progress in the conversation.
- Q2 One front door skill. `designer-pipeline next` reads the project state and returns the only
  next step (what, which command, why). The front door recognizes intent and keeps calling `next`.
- Q3 Standard work has exactly two human decisions: pick a concept (one of three) and accept or
  reject the draft. Everything else runs automatically behind gates.
- Q4 Missing information is gathered in one round of numbered questions, each with a recommended
  answer; "default" accepts all. Only product facts, audience, duration, assets and licensing are
  asked; style comes from references and the agent's judgment.
- Q8 Concepts are cards (central idea, carrier between beats, look, tools in one line) plus one
  rendered key frame each; no animatics.
- Q9 A draft is shown only after all error gates pass: draft video, per-beat contact sheet and a
  one-paragraph gate summary. The user accepts, or rejects with one sentence.
- Q10 Tool choices appear as one line on the concept card; missing asset licenses are raised
  there, never at delivery.

## Structure

- Q5, Q7 Sub-workflows by deliverable, not by tool: `film` (generated promo, explainer, logo
  sting, including Blender shots and scores), `edit` (PV, MAD, beat montage), `web` (motion
  websites), `ui` (product UI and design systems). Replicate is a mode of each. First: film, edit.
- Q6 `.design-pipeline/state.json` records deliverable, tier, mode, stage and human decisions;
  file presence validates it (a recorded artifact that disappeared makes the state stale).
- Q14, Q15 Tiers: `quick` (one motion, component or shot: route, build, gates, evidence),
  `standard` (one deliverable: state, stage artifacts, two decisions), `full` (large or shared
  work: OpenSpec and full lineage). OpenSpec is required only in `full` and for this repository.
  DESIGN.md and MOTION.md are created lazily at standard and above; quick uses existing tokens or
  declared defaults.
- Q12 Every existing CLI command stays; the front door and sub-workflows mention only the
  commands the current stage needs.
- Q16 `next` returns one action: `run` (command, reason), `ask` (question with a recommended
  answer), or `done` (evidence), with one plain-language line and full JSON. Completed steps are
  not repeated.
- Q17 `skill/SKILL.md` becomes a front door under 5 KB; the previous content moves unchanged to
  `skill/references/pipeline-reference.md` and is reached through routing. Version 0.12.0-beta.

## Quality and learning

- Q13 A rejection becomes a project rule at once; promotion to package gates and cases goes
  through reviewed pull requests (the existing feedback loop).
- Q29 Weaker-model failures are fixed in code first (gates, templates, `next` hints, fixes);
  skill prose grows only when code cannot fix it.
- Q33 Evaluation failures are classified: did not follow the workflow; misused tools; generic
  concepts; rough execution; taste gap. Each class maps to its fix (next/fix hints; concept
  constraints; templates and gates; rules distilled from golden cases). A failure-class by model
  table is reported per release.

## Evaluation

- Q18, Q19 Compare the new entry with the old one and with the reference skills onetake and
  motion-web run on the same briefs (research use; their outputs stay in private benchmark
  directories and never enter this MIT repository). Their published measurements are cited as
  external observations and recalibrated on our own cases.
- Q23, Q24 Success is a blind pairwise preference judged by the user (a multimodal model
  pre-screens; the user decides): win or tie on most briefs and at least one win per deliverable
  type, plus fewer user turns and a higher first-draft gate pass rate. First round: product PV,
  MAD, UI promo, logo sting, explainer.
- Q22, Q26-Q28, Q30 Every pull request runs a quick case on Sonnet 5; releases run the full matrix
  (Opus 5.5 ceiling; Sonnet 5 and Codex main targets; Haiku 4.5 and an OMP model as floor) through
  one local harness with fresh contexts and scripted decisions. A floor model passes a brief when
  it reaches done through `next`, passes all error gates, stays within two decisions plus one
  clarification round, and the user rates the draft acceptable.

## Opus 5.5

- Q31 Opus 5.5 distills taste into templates, thresholds and golden cases during development and
  pre-screens evaluations. An optional `director` setting lets `next` route the concept and review
  steps to it at runtime; it is never required.
- Q32 Golden cases per deliverable type are made by Opus 5.5 and approved by the user, with the
  reasoning behind each choice broken down into rules and fixes.

## Order (Q20, Q25)

1. Front door, `next`, `state.json`, tiers (this change).
2. `film` and `edit` sub-workflows.
3. Concept and review stages, then a small two-brief comparison round.
4. `film reference analyze` (measured reference study).
5. Port motion-web and onetake ideas; provenance alignment first (motion-web record expires
   2026-10-18).
6. Case library with Opus-made, user-approved golden cases.
7. Full comparison evaluation.

## Step 1 implementation

`workflow-core.cjs` defines stages per deliverable and tier, validates and updates
`state.json`, and computes the next action from state plus artifact presence. `decide` records
the two human decisions. The front door SKILL.md routes to `next`; the previous SKILL.md content
is preserved in `references/pipeline-reference.md`, and tests that required text in SKILL.md now
require it to be reachable from the front door.
