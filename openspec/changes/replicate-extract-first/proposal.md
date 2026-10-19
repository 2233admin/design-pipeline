# Replicate extracts DESIGN and MOTION first and stays bound to them

## Why

Closes #164. `next --mode replicate` for ui and web passed the reference stage once `reference.md` held
two lines. It never required `DESIGN.md` or `MOTION.md`, never ran `foundation check` or
`reference check`, and reused the film-flavoured reference text (timed frames, graybox,
`analyze-video`). The website-clone path has real gates and a fidelity evaluator but is not reachable
from `next`, and phrasings such as "copy this page" or "照着做" do not route to it. The web
description approval does not bind `reference.md` or `DESIGN.md`, so editing them after approval
changes nothing. `--mode freeform` has no behaviour, and web intake refuses the "default" that ui and
film accept.

## What Changes

- Replicate for ui and web gets a web-appropriate reference step, then an `extract` step. The step
  has the agent register the reference as `reference-evidence.json` (v2, role `primary-target`) and
  extract a draft `DESIGN.md` and `MOTION.md` (and, at standard and full, the design-system package).
  Source Decisions lists what is borrowed (adopted) and what is not (rejected: content, copy, brand
  marks, logos).
- `next` runs the existing `reference check`, `foundation check` and design-system package check
  itself. While any fails it returns a `run` with `findings`, each with its fix.
- When they pass, `next` asks the owner to confirm the extraction (token summary, borrowed list,
  compiled design-system previews). `decide --stage extract --by owner` stores the sha256 of
  `DESIGN.md`, `MOTION.md`, `reference.md` and `reference-evidence.json` in the decision history.
- The confirmation is recomputed by later stages: the web description approval inputs gain the
  extraction digest, the web interaction pass binds `reference.md` and `reference-evidence.json`
  (`DESIGN.md` and `MOTION.md` were already bound), and the ui delivery and review bind the digest.
  A changed file reopens the confirmation, and a re-confirmed one reopens what was bound to the old.
- A web replicate project with a `website-cloning.json` stays at probe and deliver until the
  evaluator's recorded verdict is `complete`; `next` returns the `evaluate-website-clone.cjs`
  command with the manifest's protected invariants and allowed differences.
- Route keywords: "copy this page", "make it like this", "like this site", "照着做", "照这个做",
  "像这个网站", "仿照", "参考这个页面" join `website-clone`; "screenshot to code" joins
  `reference-reconstruction`. `SKILL.md` gets a route row for a supplied reference.
- **BREAKING** `--mode freeform` is deleted. Web intake accepts `--answer default` (not at quick).

## Capabilities

- `design-pipeline`: ADDED replicate extraction, confirmation binding, clone verdict, routing and
  mode requirements.
- `web-workflow`: MODIFIED the stage contract (replicate gains `extract`); ADDED "default" intake.

## Boundaries

Reuses `reference check`, `foundation check`, the design-system package check, the decision history,
the interaction gate's input bindings and the evaluator's manifest verdict. No new gate, receipt
schema, resolver or digest. `init-website-clone.cjs` is named by the extract step and not run by
`next`. Component Conformance and Visual Acceptance stay separate: the confirmation records the
owner's words about what is borrowed, never visual acceptance.
