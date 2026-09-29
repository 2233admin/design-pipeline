# Tasks

Order: wave 1 (T1, T2, T3 in parallel), then closure (T4). Each worker edits only the files it owns;
no file appears under two owners. The executable plan with steps and acceptance is
`docs/superpowers/plans/2026-09-29-web-treatment-and-section-briefs.md`. Interfaces are fixed in
`design.md`: the stage ids, question ids, the `## Treatment` field names, the brief key mapping,
the W1 to W7 names, and the heading names of `references/web-direction.md` (the plan's "Fixed
interfaces" section).

## Verification protocol

The only sanctioned harness is `node scripts/qa.cjs`, run directly with no pipe or redirect into the
repository (`AGENTS.md`: never bare `node --test`). It has no scoped mode. It compares
`scripts/test-manifest.json` with `tests/*.test.cjs`, packages `skill/` twice, and fails unless
`git status` is byte-identical to its start. Workers therefore do not run it; T4 runs it once on a
quiet tree after T1 to T3 land, hands failures back to the owner, and reruns.

A worker may check its own change with a throwaway script outside the repository; that is smoke
evidence, not the gate.

No new test file is added, so `scripts/test-manifest.json` does not change. The one new load-bearing
file goes in `skill/references/package-resources.json` `required` (owner T4).

## Done in this slice

- [x] Read the web workflow, the shared prompts, the film change and its docs.
- [x] Write the proposal, design, tasks, spec delta and implementation plan;
  `openspec validate add-web-treatment-and-section-briefs --strict` passes.

## Wave 1

### T1 Web prompts and tests (size M)

Owns `skill/scripts/workflows/web.cjs` and `tests/workflow-next.test.cjs`.

- [x] Define web `INTAKE` (ids `product`, `audience`, `scope`, `assets`) and web `CONCEPTS` in
  `web.cjs`; keep stage ids, `finished` predicates, `record` strings and action types of the shared
  ones; import `CLI`, `exists`, `gatePassed`, `reference` from `shared.cjs`, and the shared `REVIEW`
  under an alias, read-only, to reuse its `finished` and `record`.
- [x] Add one sentence to the `build` action at standard and full: extend the chosen card in
  `concepts.md` with `## Treatment` (`references/web-direction.md`) before writing `index.html`.
  The quick-tier text is unchanged.
- [x] Define a web `REVIEW` in `web.cjs` (same stage id `review`, `finished` predicate and `record`
  string as the shared one; its `ask` speaks of the page and its screenshots at 375x812, 768x1024
  and 1440x900, points to W1 to W7 in `references/web-direction.md` for Visual Acceptance, and has no
  video, contact-sheet, footage or beat wording). The shared `REVIEW` is imported read-only under an
  alias; its `finished` and `record` are reused and it is not edited.
- [x] Tests in `tests/workflow-next.test.cjs`: web intake ids and no film or duration wording; web
  concepts run action names the section arc and `## Treatment`; web review ask has no
  video, contact-sheet, footage or beat wording, names the three viewports and `web-direction.md`,
  and keeps the shared `record` and `finished` behaviour (a draft accepted finishes the stage; a
  rejection still reopens `probe`); film, edit and ui intake, film concepts and film and edit review
  actions deep-equal the shared exports (edit and ui have no concepts stage, ui has no review stage)
  and film and edit intake still carry the `duration` question; web stage ids and
  order unchanged per tier; standard web build action asks for the treatment, quick does not.
- Proves: the `next` output, at the gate. Does not prove the wording is good.

### T2 Web direction reference and workflow guide (size L)

Owns the new `skill/references/web-direction.md` and `skill/references/workflow-web.md`.

- [x] `web-direction.md` with the headings fixed in `design.md`: treatment template (section 3), section
  brief mapping (section 4), review rules W1 to W7 with the evidence each reads (section 5), the
  statement that they are Visual Acceptance guidance and add no finding, and one worked example of a
  brief that includes a probe valid under `design-pipeline.interaction-probe.v1`.
- [x] `workflow-web.md`: `intake` and `concepts` describe the web prompts; `build` starts with the
  treatment step and points to `web-direction.md`; `review` points to the W rules; keep exactly one
  `##` section per stage id and the existing probe example.
- Proves: nothing by test; read-through against `design.md`, then the gate.

### T3 Pointers in existing references (size S)

Owns `skill/references/pipeline-reference.md`, `design-spec.md`, `motion-spec.md`,
`anti-slop-review.md`, `qa-checklist.md` and `skill/SKILL.md`.

- [x] `pipeline-reference.md`: two or three lines in the web/design stage text pointing to
  `web-direction.md` (treatment feeds `design.md` and `DESIGN.md`; briefs feed the component
  inventory). No new stage or gate.
- [x] `design-spec.md`: a short pointer under Owns that a section arc row belongs in the Layout grid
  and Component inventory. `motion-spec.md`: a pointer that a section brief's driver and response are
  an Interaction Inventory row.
- [x] `anti-slop-review.md`: W2 and W4 complement `template-pattern-density`; one pointer.
- [x] `qa-checklist.md`: a section "Web Treatment And Section Review (Visual Acceptance)" with rows
  W1 to W7, a result field each, a reviewer field, and the line that agents never record acceptance.
- [x] `SKILL.md`: one pointer line for `references/web-direction.md`; file stays under 5 KB.
- Proves: nothing by test; the gate checks packaging and the size limit.

## Closure (T4, integrator)

- [x] Add `references/web-direction.md` to `required` in `skill/references/package-resources.json`.
- [x] Add the `CHANGELOG.md` entry under Unreleased (Changed: web `next` intake and concepts; Added:
  treatment, section briefs, W1 to W7).
- [x] Run `node scripts/qa.cjs` directly (no pipe) and
  `openspec validate add-web-treatment-and-section-briefs --strict`.
- [x] Smoke: `designer-pipeline next` on a temporary web project (start with `--deliverable web --tier
  standard`) shows the web intake and concepts text; a film project's text is unchanged.
- [x] Write `qa.md`: Component Conformance results, and Visual Acceptance as pending with no reviewer.
- [x] Tick these boxes.

## Pending (not done by any task above)

- [ ] Build a page with the treatment and judge it; a named reviewer records the result under Visual
  Acceptance in `qa.md`.
- [ ] Recalibrate W1 to W7 against the first real page.
- [ ] Later changes of the approved spec: section kit, golden case, multi-viewport capture.
