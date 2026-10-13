# Fix the top three film workflow usability defects

Two films built with the film workflow at f41da71 (`experiments/project-motion/onboarding-30s`
and `clone-fidelity-15s`, logged in each `USABILITY.md`) exposed three defects that let an agent
ship a visibly broken draft or a draft built on a different runtime than the reviewed one.

1. `film check` passed both first drafts. Its composition gate measures one 480 px frame at each
   beat midpoint, so text-on-text overlap (a receded terminal still legible under the stage bar,
   flying labels crossing a table row), a closing line ~35 px from the frame edge and small labels
   passed. Only the per-second frame review found them.
2. The quick film tier ended with `"type": "done"` and `"delivered": null` right after
   `film check`. Nothing pointed the agent at a frame review or the owner, and `done` read as
   accepted.
3. `film scaffold` wrote no `package.json` and loaded GSAP from jsDelivr. `npx hyperframes` then
   resolved whatever release was latest (0.8.145 instead of the reviewed 0.8.137), and render and
   capture needed network access. `hyperframesPreview` likewise called an unpinned `hyperframes`.

## Change

- Extend the existing composition gate in `film check` with a layout probe: the captured
  composition's visible text is sampled five times a second plus both sides of every beat
  boundary. Held overlap of legible text fails; a passing overlap, a steady faint copy under
  legible text, resting text near the frame edge and small resting text are review prompts.
  `film check --allow <code>` accepts named warnings. No new gate, step or acceptance state.
- Quick film becomes plan, build, check, review. The existing review ask (`decide --stage review`)
  carries a `first` instruction to review the checked draft one frame per second and record it
  in `qa.md` before asking the owner; `done` follows only an accepted draft. Edit, web and UI
  quick tiers are unchanged.
- `film scaffold` writes a `package.json` pinning `hyperframes` 0.8.137 and `gsap` 3.15.0 and loads
  GSAP from `node_modules`; guides use `npx --no-install hyperframes`. HyperFrames preview and
  catalog calls default to the same pin.
- Separate commit: repository QA reads `git status` with a larger buffer and reports spawn errors.

## Reuse

The existing composition gate, finding/`fix` shape, film check step list, timeline capture kernel
and browser stack, the shared `REVIEW` stage with `decide`, and `recordGate` input hashing.
No package dependency is added; GSAP is not vendored (its standard license is not an OSS license).

## Affected

`skill/scripts/{composition-core,film-project-core,film-capture-core,film-blocks-core,cli-core,
capture-film-timeline,workflow-core}.cjs`, `skill/scripts/workflows/film.cjs`,
`skill/references/film-choreography/{layout-probe.js,motion-study.html}`, film/HyperFrames/
composition guides, README, CHANGELOG, tests.
