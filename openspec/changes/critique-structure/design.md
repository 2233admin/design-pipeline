# Design

## File ownership

- `skill/references/web-direction.md` owns the critique text, next to W1 to W7, because the rules it
  reads live there. It is written for any visual output, not only pages.
- `qa-checklist.md` names where the result is written; `workflow-web.md` states that it is on
  request; `design-direction-library.md` records the adoption of #157. The vendored guide is untouched.

## Dimensions and W1 to W7

| Dimension | Weight | W rules read |
| --- | --- | --- |
| Concept | veto | none (asked of the whole piece) |
| Direction fidelity | equal | W7 |
| Hierarchy and pacing | equal | W1 W2 W3 W4 W5 |
| Craft | equal | none (screenshots; `UC-` ids as supporting evidence) |
| Function | equal | W6 |
| Originality | equal | none (direction card source, ledger) |

The W rules are about composition structure, so they land on hierarchy and pacing, with the type and
colour seed rule on fidelity and the motion-driver rule on function. Concept, craft and originality
have no W rule; they are read from the playback, the chosen card and the screenshots.

## Score

Overall is the mean of six scores. Concept at 5 or lower caps it at 6.0, because execution amplifies
the concept and cannot replace it. Per-output emphasis tells the reviewer where to look hardest and
never removes the concept check.

## Compatibility

Nothing is migrated. W1 to W7 text and the Visual Acceptance block are unchanged in meaning. There is
no receipt, so the critique cannot be validated by code; the form is a convention for the reviewer.
If a critique ever needs to be machine-read, it should extend `qa.md` handling, not add a parallel
receipt.
