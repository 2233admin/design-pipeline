# Design

## Invariant

Planning may begin while the foundation is missing, but implementation cannot. Every implementation
entry point must first receive a successful foundation check for project `DESIGN.md`.

## Validation boundary

The reusable validator checks:

- project containment and real-path containment;
- YAML frontmatter with a non-empty `name`;
- the required product design sections;
- explicit adopted and rejected source decisions;
- active synthesis attribution when validation belongs to a synthesis run.

Creative synthesis stays with the host design agent. Deterministic code only detects, validates, and
routes.

## States

- `synthesis-required`: the file is missing; initialize requirements-driven synthesis.
- `invalid`: the file exists but is incomplete or unsafe; repair or resynthesize it.
- `ready`: the file passes the reusable foundation contract.

## Structural plan

Extract the existing DESIGN.md text validation from the synthesis advancer into the shared core.
Keep the advancer's errors and active-change attribution behavior stable. Add a small standalone
command rather than coupling foundation validation to unrelated dependency checks.
