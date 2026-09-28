## ADDED Requirements

### Requirement: Motion-web provenance records the canonical repository owner

The pipeline SHALL record the inspected `motion-web` reference under its canonical GitHub repository
identity, not a fork or alias, while keeping the pinned revision, content hash, license, and
`codeCopied: false` boundary unchanged.

#### Scenario: A motion primitive cites motion-web as its reference

- **WHEN** a `skill/references/motion-primitives.json` primitive's `provenance.source` cites the
  motion-web reference
- **THEN** the value SHALL be the repository root `https://github.com/feitangyuan/motion-web`
- **AND** it SHALL NOT be `https://github.com/2233admin/motion-web` or any other fork/alias identity.

#### Scenario: A capability reference cites a specific reviewed tree

- **WHEN** `skill/references/motion-first-capability.md` or
  `openspec/changes/extend-motion-first-capability/reference-boundary.md` cites the exact reviewed
  commit tree
- **THEN** the citation SHALL use `https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115`
- **AND** the pinned `reviewedRevision`, `reviewedContentHash`, `license`, and `codeCopied: false` SHALL
  remain unchanged by any owner correction.

#### Scenario: Governed test assertions must match the canonical owner

- **WHEN** `tests/animation-opportunity-reference.test.cjs` or `tests/source-governance.test.cjs` assert
  a motion-web `provenance.source` or `sourceMeta.url`
- **THEN** the asserted value SHALL be the canonical `feitangyuan` identity
- **AND** the test SHALL fail if the registry or reference file reverts to a fork/alias owner.

#### Scenario: A historical QA record predates the corrected provenance

- **WHEN** a QA document (such as `openspec/changes/integrate-product-animation/qa.md`) contains
  sections written before the motion-web rework or before this provenance correction
- **THEN** those sections SHALL be labeled historical/superseded in their heading or lead-in
- **AND** no historical evidence value (hash, warning count, screenshot reference) SHALL be deleted or
  altered to perform that labeling.
