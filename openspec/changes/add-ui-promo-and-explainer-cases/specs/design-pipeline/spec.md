# Design pipeline delta

## Requirement: real interface captures in golden cases
A golden case that shows another product's interface SHALL declare its capture script, its pinned
source (repository, full commit and license) and its captured files. Captured files SHALL be
regenerated locally and SHALL NOT be committed. Repository QA SHALL fail when any captured file
is tracked.

## Requirement: cuts between still frames
The render gate SHALL treat a one-step change as an instant replacement when both of its
neighbouring steps are under a tenth of it. This applies in addition to steps that stand out from
their 2 s window.
