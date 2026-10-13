# Split the film and edit sub-workflows

## Why

Step 1 of `redesign-user-workflow` put every deliverable's stages inline in `workflow-core.cjs`
and sent agents to long references for film and edit detail. Decisions Q5/Q7 and Q12 call for
sub-workflows per deliverable that name only the commands the current stage needs, with
replicate as a mode of each. Two gaps also surfaced while splitting:

- a passed gate stays passed after its inputs change (an edited storyboard or a re-rendered draft
  is treated as checked), which breaks Q6 (state is validated by the files on disk);
- replicate mode has no effect: a film can waive its reference even when the user asked to
  reproduce one, and an edit never studies the reference edit.

## What changes

- `film` and `edit` stages move into their own modules under `skill/scripts/workflows/`, sharing
  the intake, reference, concept and review stages. `workflow-core.cjs` keeps state, `next`,
  `decide` and gate recording.
- Each sub-workflow has a short guide (`references/workflow-film.md`, `references/workflow-edit.md`)
  with one section per stage listing only that stage's commands. Every `next` action for film and
  edit carries `guide` pointing at its section.
- A gate result counts only if it is newer than the files it checked; editing a storyboard or
  re-rendering a draft reopens the stage.
- Replicate mode: a film's reference stage cannot be waived; an edit gains a reference stage
  (`reference.md` with the reference edit's cut rhythm) before cutting.
- The front door links to the two guides.

Every existing CLI command stays. No new commands or flags.
