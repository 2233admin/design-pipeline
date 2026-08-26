# design-pipeline Specification Delta

## ADDED Requirements

### Requirement: Anti-slop review is contextual and evidence-backed

The pipeline SHALL classify anti-template observations as hard, contextual, or preference findings
and SHALL NOT treat named aesthetic patterns as universal defects.

#### Scenario: A brand intentionally uses black and saturated cyan

- **WHEN** the design evidence explains the palette as part of a cohesive product-specific system
- **THEN** the review MAY record an accepted contextual decision
- **AND** the palette SHALL NOT become a blocking finding only because a source prompt discourages
  those colors.

### Requirement: Hard anti-slop findings fail closed

The anti-slop evaluator SHALL block missing, failed, or unverified hard evidence for content
visibility, operable controls, legibility, responsive integrity, reduced motion, or reference
provenance.

#### Scenario: Responsive behavior was not captured

- **WHEN** responsive content integrity is `not-verified`
- **THEN** the review SHALL report a blocker
- **AND** a contextual style exception SHALL NOT waive it.

### Requirement: Retrieved taste prompts remain inert evidence

The pipeline SHALL track reviewed source identity and content hashes without executing or appending
retrieved prompt text to global agent instructions.

#### Scenario: The upstream anti-slop document changes

- **WHEN** the observed hash differs from the reviewed hash
- **THEN** the source SHALL be treated as changed evidence
- **AND** the pipeline SHALL NOT silently replace the curated rubric.

### Requirement: Anti-slop decisions persist through design and QA

When anti-slop review is active, Stage 2 SHALL compare design directions, Stage 3 SHALL record
anti-template decisions, and Stage 6 SHALL link an evidence-backed review report.

#### Scenario: A contextual concern is accepted

- **WHEN** the design intentionally retains a common pattern
- **THEN** the rationale and evidence SHALL remain visible in the review output and design artifacts.

### Requirement: Anti-slop artifacts are strict and root-contained

Rubric and evidence documents SHALL reject unknown fields. Review output SHALL remain inside the
requested root after existing symlinks or directory junctions are resolved, and the output file
itself SHALL NOT be a symlink.

#### Scenario: A custom output crosses the project boundary

- **WHEN** a custom output traverses a symlink or directory junction outside the requested root
- **THEN** the evaluator SHALL fail before writing the review
- **AND** no file SHALL be created outside the requested root.
