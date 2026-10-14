# Redesign the user workflow

## Why

The pipeline grew into a strong set of gates, templates and runtimes (film, edit, score, Blender,
composition, audio), but using it is hard. The entry skill is 92 KB, the CLI has dozens of
commands, every change demands OpenSpec artifacts, and a user has to know which tool fits which
film. Weaker models get lost; strong models spend effort on ceremony instead of the work.

The project goal is agent art literacy carried in code: results that surprise users, beat the
reference skills we study (onetake, motion-web), and stay simple to use. The mid-to-long-term goal
is that open-source users without the strongest model reach similar results.

The workflow was designed in a grilling session on 2026-09-28 that drew on three process
references: BMAD (a guided "what next" and phased artifacts), superpowers (brainstorm and approve
before creative work, verify before claiming done) and Matt Pocock's skills (small composable
skills, grilling in rounds with recommended answers, prototypes).

## What changes

- One front door skill. A `next` command reads project state and returns exactly one next action
  (`run`, `ask`, or `done`). Project state lives in `.design-pipeline/state.json`.
- Ceremony tiers `quick`, `standard`, `full`, chosen by the agent from task size. OpenSpec is
  required only in `full` and when developing this repository.
- Sub-workflows by deliverable: `film`, `edit`, `web`, `ui`; replicate is a mode of each.
- Two human decisions in standard work: pick one of three concepts, accept or reject the draft.
- Rejections become project rules immediately and package rules and cases only through review.
- Evaluation against the old entry and the reference skills, blind-judged by the user.
- Opus 5.5 distills taste into templates, gates and golden cases during development, pre-screens
  evaluations, and is an optional runtime art director. It is never required.

This change records the agreed design and delivers step 1 (front door, `next`, state, tiers).
Later steps are tracked in tasks.md and land as their own changes.
