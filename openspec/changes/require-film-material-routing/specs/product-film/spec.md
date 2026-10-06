## ADDED Requirements

### Requirement: Material requirements determine the film rendering route

Reference-led replication SHALL record observed material and geometry requirements in `storyboard.json.rendering` before build. The existing storyboard gate SHALL reject a declared route that cannot implement the declared requirements. A missing installation SHALL NOT justify silently removing the reference's defining effects.

#### Scenario: Enamel reference with flat rendering

- GIVEN solid depth, bevel, clearcoat or view-dependent color is required
- WHEN the plan selects DOM, Canvas 2D or CSS 3D
- THEN the storyboard gate fails with an actionable route repair

#### Scenario: View-dependent appearance

- GIVEN view-dependent color is required
- WHEN fewer than two distinct in-range material inspection times are planned
- THEN the storyboard gate fails with an angle-sampling repair

#### Scenario: Replicate plan lacks material routing

- GIVEN replicate mode and a passed legacy storyboard without rendering
- WHEN `next` is called
- THEN plan remains open and asks the author to record material requirements and route

#### Scenario: Honest acceptance

- GIVEN routing, runtime and film gates pass
- THEN the result still reports creativeAcceptance as not-assessed
- AND actual material matching is reviewed against rendered reference angles
