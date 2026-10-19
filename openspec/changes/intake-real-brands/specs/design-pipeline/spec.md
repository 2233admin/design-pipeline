## ADDED Requirements

### Requirement: Intake names real brands

The ui and web playback instructions SHALL tell the agent to add one playback line listing the real brands or products the conversation or brief names (or `none`), and to record the confirmed line as `Real brands:` in DESIGN.md Product Context when DESIGN.md is written. The ui playback validator SHALL NOT require this line.

#### Scenario: The playback instruction asks for the brands line

- **WHEN** `next` returns the ui or web playback ask
- **THEN** its instruction SHALL mention `Real brands:`
- **AND** a ui playback card without that line SHALL still be accepted.
