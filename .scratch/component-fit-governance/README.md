# Component Fit Governance Ticket Set

Source spec: `docs/superpowers/specs/2026-09-02-component-fit-governance.md`

## Dependency graph

```text
S01 direction-lock + fit matrix ─┐
                                 ├─> S03 docs + regression integration
S02 prototype preview gate ──────┘
```

S01 and S02 are independent vertical slices. S03 is the integration and release gate because it packages both paths and runs the full repository suite.

## Tickets

| ID | Title | Risk | Depends | Demo line |
|---|---|---|---|---|
| S01 | Land direction-lock and component-fit matrix | high | none | An agent runs `component lock`, `component fit`, and `component validate-fit` and receives deterministic decisions or explicit blockers. |
| S02 | Bind Design Skill prototypes to verified previews | medium | none | A prototype request without valid preview evidence is blocked; a valid request returns isolated, hash-bound directions. |
| S03 | Publish and regression-test the component-fit contract | medium | S01, S02 | A clean checkout discovers the commands and passes focused plus full regression verification. |
