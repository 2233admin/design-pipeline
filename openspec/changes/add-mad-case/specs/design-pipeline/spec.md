# Design pipeline delta

## Requirement: generated art in golden cases
A golden case that uses art made by an image model SHALL declare its generation script, the tool
and the generated files. Generated files SHALL NOT be committed, and render verification SHALL NOT
run the generation script implicitly. Repository QA SHALL fail when any generated file is tracked.

## Requirement: mastering keeps section dynamics and codec headroom
`audio master` SHALL master under the target's true-peak ceiling by a codec headroom (1.5 dB by
default). When a linear gain to the target loudness would exceed that ceiling, it SHALL limit the
transients before the gain, by at most 10 dB, and report the limiting as `limiterDb`. It SHALL
measure the mastered output's true peak and increase the limiting while the peak is over the
ceiling.
