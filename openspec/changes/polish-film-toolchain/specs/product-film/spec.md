# Product film delta

## Requirement: film project workflow
The pipeline SHALL scaffold a film project whose storyboard passes the storyboard gate and whose
composition script names each beat, SHALL refuse to overwrite existing files without an explicit
replace flag, and SHALL run all applicable film gates in one check that reports skipped gates
with the command that unblocks them.

## Requirement: actionable findings
Every film gate finding SHALL carry a concrete fix. Contract errors for enumerated values and
unsupported properties SHALL list the allowed values.

## Requirement: timeline capture
The pipeline SHALL capture a composition's registered GSAP timeline in headless Chrome without
adding a package dependency, and SHALL name the install command when the browser stack is absent.
