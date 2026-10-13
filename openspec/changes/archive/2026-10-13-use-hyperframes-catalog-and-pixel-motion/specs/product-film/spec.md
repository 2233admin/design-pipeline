# Product film delta

## ADDED Requirements

### Requirement: catalog reuse
The pipeline SHALL search the HyperFrames block catalog for a beat's action, SHALL let a
storyboard beat name a block, and SHALL report a named block that the project's catalog does not
contain.

#### Scenario: Beat action is routed through catalog
- **WHEN** the pipeline routes a beat's action
- **THEN** it SHALL search the HyperFrames block catalog and allow the storyboard beat to name a block

#### Scenario: Named block is absent
- **WHEN** a storyboard names a block not present in the project's catalog
- **THEN** the pipeline SHALL report the missing named block

### Requirement: runtime-faithful capture
The pipeline SHALL capture HyperFrames project timelines under the HyperFrames runtime and SHALL
fail, rather than return an empty timeline, when nested compositions cannot load.

#### Scenario: Nested composition cannot load
- **WHEN** a nested composition cannot load during timeline capture
- **THEN** the pipeline SHALL fail rather than return an empty timeline

#### Scenario: Project timeline is captured
- **WHEN** a HyperFrames project timeline is captured
- **THEN** capture SHALL run under the HyperFrames runtime

### Requirement: procedural motion
Tweens that animate only non-DOM driver objects SHALL NOT count as subject motion in the timeline
gate. The render gate SHALL measure per-beat pixel motion and SHALL fail an action beat that is
frozen in the rendered film.

#### Scenario: Tween animates only driver objects
- **WHEN** a tween animates only non-DOM driver objects
- **THEN** it SHALL NOT count as subject motion in the timeline gate

#### Scenario: Action beat is frozen in render
- **WHEN** per-beat pixel measurement finds an action beat frozen in the rendered film
- **THEN** the render gate SHALL fail the beat
