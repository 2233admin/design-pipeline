# Product film delta

## Requirement: one time source per property
The timeline gate SHALL fail two tweens that drive the same property of the same element at
overlapping times, and SHALL warn on linear easing for travelling elements.

## Requirement: declared endings and action arcs
When a storyboard declares `endState: rest`, the render SHALL end on its opening frame within
codec tolerance; when it declares `loop`, the last-to-first step SHALL NOT jump. Beats with
`arc: anticipate-act-settle` SHALL be warned when they start at full speed or stop without
settling.

## Requirement: capture integrity
A film check SHALL NOT pass on a timeline captured before the current run when capture fails.
