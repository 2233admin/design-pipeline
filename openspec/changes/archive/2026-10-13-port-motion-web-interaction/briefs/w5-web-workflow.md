# w5: web sub-workflow

Read `_common.md` first. The contract is `design.md`, section "Web sub-workflow".

## Build

1. `skill/scripts/workflows/web.cjs`, same shape as `workflows/film.cjs` and `workflows/edit.cjs`
   (read both first). Stages per `design.md`. Reuse `INTAKE`, `reference(...)`, `CONCEPTS`,
   `REVIEW`, `exists` and `gatePassed` from `workflows/shared.cjs`.
   - `build`: finished when `index.html` exists. Action: build the page from the chosen concept;
     motion follows `references/web-motion.md` (another worker writes it) and
     `references/pipeline-reference.md` for design tokens and components; for `full` tier, open an
     OpenSpec change first (keep the step 1 wording).
   - `probe`: finished when `gatePassed(state, root, "interaction", ["interaction.json",
     "index.html"])`. Action: if `interaction.json` is missing, write one probe per key
     interaction (schema in `references/workflow-web.md`); otherwise run
     `designer-pipeline verify interaction --probe interaction.json` and apply each finding's fix.
     Another worker adds that command; do not implement it here.
   - `deliver`: `decide --stage deliver --answer <url or path>`.
2. In `skill/scripts/workflow-core.cjs`, register `web` in `SUB_WORKFLOWS`. `ui` stays on
   `codeStages`. `next` actions for web then carry `guide: references/workflow-web.md#<stage>`.
3. In `decide` (same file), a rejected draft must also clear the `interaction` gate, like it
   clears `film` and `edit`.
4. `skill/references/workflow-web.md`: one section per stage id (a test checks this for film and
   edit; extend it to web). Include the `interaction.json` example from `design.md`.
5. `skill/SKILL.md`: in "Where the details are", add `references/workflow-web.md` next to the film
   and edit guides. Stay under 5 KB.
6. Add the new files to `skill/references/package-resources.json`.

## Tests

In `tests/workflow-next.test.cjs`: web quick and standard stage order; `probe` asks to write
`interaction.json` when missing, then routes to `verify interaction`; a passed `interaction` gate
goes stale when `index.html` changes; a rejection reopens `probe`; the guide-section test covers
web.

## Files

`workflows/web.cjs`, `workflow-core.cjs`, `workflow-web.md`, `SKILL.md`, `package-resources.json`,
tests, CHANGELOG. Branch: `motion-web-w5-web-workflow`.
