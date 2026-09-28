# Design pipeline delta

## Requirement: deliverable sub-workflows
Film and edit work SHALL each follow a sub-workflow whose guide lists, per stage, only the
commands that stage needs, and every `next` action for these deliverables SHALL name its guide
section.

## Requirement: fresh gate results
A recorded gate result SHALL count toward finishing a stage only when it is not older than the
files it checked.

## Requirement: replicate mode
In replicate mode a film SHALL NOT waive its reference study, and an edit SHALL study the
reference edit before cutting.
