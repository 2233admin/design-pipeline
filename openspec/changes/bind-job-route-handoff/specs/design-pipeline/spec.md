## ADDED Requirements

### Requirement: A ready job route persists as a hash-bound plan

A `ready` result from `designer-pipeline route` SHALL be writable as
`design-pipeline.job-plan.v1`. The plan SHALL bind the query, job id, registry hash, route hash,
primary knowledge, secondaries, admission, kernel steps, next steps, and `planSha256`.

#### Scenario: A ready route is written

- **WHEN** `designer-pipeline route --query "<brief>" --write --output job-plan.json` classifies a
  unique primary job
- **THEN** the file SHALL use schema `design-pipeline.job-plan.v1`
- **AND** it SHALL contain `jobId`, `registrySha256`, `routeSha256`, `planSha256`, and frozen
  `primaryKnowledge.admission`
- **AND** `planSha256` SHALL be the SHA-256 of the canonical plan without that field

#### Scenario: A clarification cannot become a plan

- **WHEN** the route status is `needs-clarification` or `blocked`
- **AND** `--write` is requested
- **THEN** the command SHALL fail closed
- **AND** it SHALL NOT write a job-plan file

### Requirement: Toolchain and execution consume the job plan fail-closed

When a toolchain request or execution request includes `jobPlanSha256`, the consumer SHALL load
the plan, verify the hash, and refuse drift. Job id and toolchain `primaryRouteId` SHALL remain
distinct identifiers.

#### Scenario: Toolchain resolve binds a matching plan

- **WHEN** `toolchain resolve` is given a contained job plan whose hash matches `jobPlanSha256`
- **THEN** the toolchain plan SHALL record `jobId` and `jobPlanSha256`
- **AND** it SHALL NOT copy the job id into `primaryRouteId`

#### Scenario: A drifted job plan is rejected

- **WHEN** `jobPlanSha256` does not match the file
- **OR** the plan `jobId` does not match a supplied `jobId`
- **OR** the plan schema is not `design-pipeline.job-plan.v1`
- **THEN** toolchain or execution SHALL fail closed
- **AND** it SHALL NOT produce a ready plan or execution target

#### Scenario: Execution must carry the same job plan as toolchain

- **WHEN** the toolchain plan records `jobPlanSha256`
- **AND** the execution request omits it or supplies a different hash
- **THEN** `execution route` SHALL fail closed

#### Scenario: Callers without a job plan keep current behavior

- **WHEN** toolchain resolve or execution route is invoked without `jobPlanSha256`
- **THEN** existing hash and owner checks SHALL still apply
- **AND** the command SHALL NOT require a job plan

### Requirement: Selecting a job does not upgrade catalog admission

A job plan SHALL freeze the primary knowledge admission from the registry. Plan presence SHALL
NOT make an `inert`, `reference-only`, or `review` catalog executable-ready.

#### Scenario: An inert primary stays inert on the plan

- **WHEN** the classified job's `primaryKnowledge.admission` is `inert` or `reference-only`
- **THEN** the written plan SHALL record that same admission
- **AND** toolchain and execution SHALL NOT treat the plan as authority to execute that catalog

#### Scenario: The dispatcher does not search catalogs

- **WHEN** a job plan is written or consumed
- **THEN** the pipeline SHALL NOT search MengTo, Prism, Astryx, shadcnio, DesignMD, or holosticker
  as a side effect of classify, write, or bind
