# Product film

## ADDED Requirements

### Requirement: Ordinary language activates film direction
When a user asks for a product promotional film or animation, the pipeline MUST apply the
product-film direction contract without asking the user to supply motion-design vocabulary.
An HTML delivery format MUST preserve film intent.

#### Scenario: Canvas promotion
- GIVEN "给我们的画布做一个宣传动画"
- WHEN Stage 0 and frontend routes resolve
- THEN the deliverable is product-launch-video and the HTML video route is available
- AND the skill requires product-film-direction.md before storyboard or template selection.

### Requirement: Moving evidence establishes creative acceptance
The agent MUST plan product actions and shot-to-shot handoffs, preview a representative moving
passage before extending it, and review uninterrupted playback. It MUST record creative findings
separately from technical checks. Runtime tests or attractive screenshots alone are insufficient.

#### Scenario: Technically valid but repetitive scene entrances
- GIVEN a film where successive sections repeatedly enter, hold, and fade without product action
- WHEN technical checks pass
- THEN creative review still requires revision or records the unresolved limitation.
