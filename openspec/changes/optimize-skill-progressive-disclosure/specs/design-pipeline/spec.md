# design-pipeline Specification Delta

## Requirement: Progressive skill entry point

The packaged skill MUST expose a concise `skill/SKILL.md` front door that is no more than 500 lines and routes each supported intent to the references required for that intent.

### Scenario: Route-specific loading

- **WHEN** a user requests a supported design-pipeline route
- **THEN** the front door MUST identify the route and its required references
- **AND** it MUST NOT require reading unrelated module instructions

### Scenario: Packaged references

- **WHEN** the skill is packaged and installed
- **THEN** every reference named by the front door MUST be present in the installed archive
- **AND** existing public command and reference paths MUST remain usable

## Requirement: Skill evaluation manifest

The repository MUST provide a versioned, offline-validatable evaluation manifest for representative skill prompts.

### Scenario: Valid evaluation set

- **WHEN** `scripts/validate-evals.cjs` validates `evals/evals.json`
- **THEN** it MUST verify the schema, unique IDs, known workflow routes, canonical job IDs from the bundled job registry, expected downstream state, prompts, signals, and contained fixture paths
- **AND** it MUST return a deterministic passing result without network or model access

### Scenario: Invalid evaluation set

- **WHEN** an evaluation has a duplicate ID, unknown route, empty prompt, empty required signal, or escaping fixture path
- **THEN** validation MUST fail with a machine-readable reason

## Requirement: Subject-grounded design routing

The front door MUST route open-ended visual work through the existing subject-grounding, audience, single-job, product-specific-signature, and iterative-critique contracts.

### Scenario: Open visual direction

- **WHEN** a user requests a new visual direction or redesign
- **THEN** the route MUST point to the existing direction and synthesis contracts
- **AND** the route MUST require a product-specific signature decision before implementation
- **AND** it MUST preserve responsive, focus, and reduced-motion verification

## Requirement: Browser evidence routing

The front door MUST route dynamic web verification to the existing browser evidence adapter and its reconnaissance sequence.

### Scenario: Dynamic local web application

- **WHEN** a target is a dynamic local web application
- **THEN** the route MUST wait for runtime readiness and network idle before DOM inspection
- **AND** it MUST capture or verify the applicable DOM, screenshot, console, accessibility, network, and performance evidence
- **AND** it MUST not replace behavioral verification with a static screenshot alone
