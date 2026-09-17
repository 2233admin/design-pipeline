## ADDED Requirements

### Requirement: Product-animation integration proof
A product-animation integration SHALL preserve `product-launch-video` through Stage 0 and toolchain resolution, provide an autonomous finite timeline, and deliver an encoded video.

#### Scenario: No-input playback
- **WHEN** the product film is opened in a normal-motion preview and receives no input
- **THEN** its scenes and transitions SHALL progress to the final hold without scrolling or clicking
- **AND** the encoded video SHALL have the declared duration, dimensions, frame rate, and decodable changing frames.

#### Scenario: Human-gated product semantics
- **WHEN** the autonomous film reaches the execution scene
- **THEN** the illustrated trade SHALL remain awaiting human approval, without implying real execution.

#### Scenario: Dirty target worktree
- **WHEN** the integration lands in osprey
- **THEN** pre-existing modified and untracked files SHALL retain their bytes.

#### Scenario: Visual evidence precedes improvement
- **WHEN** pipeline improvement is proposed from this run
- **THEN** the actual encoded video SHALL already have been visually inspected, with limitations recorded independently of repository tests.
