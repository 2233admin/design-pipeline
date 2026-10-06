# Design pipeline delta

## ADDED Requirements

### Requirement: generated art in golden cases
A golden case that uses art made by an image model SHALL declare its generation script, the tool
and the generated files. Generated files SHALL NOT be committed, and render verification SHALL NOT
run the generation script implicitly. Repository QA SHALL fail when any generated file is tracked.

#### Scenario: Golden uses generated art
- **WHEN** a golden case uses art made by an image model
- **THEN** it SHALL declare its generation script, tool, and generated files
- **AND** generated files SHALL NOT be committed
- **AND** render verification SHALL NOT run the generation script implicitly

#### Scenario: Generated file is tracked
- **WHEN** any generated file is tracked
- **THEN** repository QA SHALL fail

### Requirement: mastering keeps section dynamics and codec headroom
`audio master` SHALL master under the target's true-peak ceiling by a codec headroom (1.5 dB by
default). When a linear gain to the target loudness would exceed that ceiling, it SHALL limit the
transients before the gain, by at most 10 dB, and report the limiting as `limiterDb`. It SHALL
measure the mastered output's true peak and increase the limiting while the peak is over the
ceiling.

#### Scenario: Linear gain would exceed the ceiling
- **WHEN** linear gain to target loudness would exceed the target's true-peak ceiling after the caller-selected codec headroom (1.5 dB by default)
- **THEN** `audio master` SHALL limit transients before the gain by at most 10 dB and report the limiting as `limiterDb`

#### Scenario: Mastered output is measured
- **WHEN** `audio master` finishes applying gain and limiting
- **THEN** it SHALL measure the mastered output's true peak
- **AND** it SHALL increase limiting while the measured peak is over the target's true-peak ceiling after codec headroom
