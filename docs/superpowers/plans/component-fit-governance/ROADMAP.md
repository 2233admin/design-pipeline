# Component Fit Governance Roadmap

Source: `docs/superpowers/specs/2026-09-02-component-fit-governance.md`

## Goal

Land component-fit as an explicit, hash-bound stage between direction selection and implementation, while keeping prototype generation preview-bound and fail-closed.

## Slices

- [ ] **S01: Land direction-lock and component-fit matrix** `risk:high` `depends:[]`
  > After this: an agent can run the three public component commands and receive deterministic per-capability decisions or explicit blockers.
- [ ] **S02: Bind Design Skill prototypes to verified previews** `risk:medium` `depends:[]`
  > After this: valid prototype requests return isolated preview-bound directions and missing or waived preview evidence blocks.
- [ ] **S03: Publish and regression-test the component-fit contract** `risk:medium` `depends:[S01,S02]`
  > After this: a clean checkout discovers the component-fit workflow and passes focused and full regression verification.

## Boundary map

```text
S01 produces:
  direction-lock.v1
  component-fit-matrix.v1
  component lock|fit|validate-fit CLI commands

S02 produces:
  preview-bound prototype-set.v1
  blocked preview error states

S03 consumes both:
  package-resources registry
  agent-facing documentation
  test-manifest coverage
  full repository regression evidence
```

## Success criteria

1. Each requested capability has complete candidate dimensions and one valid decision.
2. Direction, catalog, provider, and project hashes are recomputed at validation time.
3. Reference-only and unverified sources cannot become direct dependencies.
4. Prototype output cannot bypass direction preview or target-write restrictions.
5. Focused and full tests pass with zero failures, skips, and todos.

## Key risks

- Hash bindings can validate stale artifacts if a body excludes a mutable field.
- Foundation candidates can silently diverge across capabilities if coherence is not checked.
- Packaging can omit a runtime kernel even while source tests pass.
- Existing dirty worktree changes can be accidentally committed with the slice.

## Verification classes

| Class | Command | Gate |
|---|---|---|
| Focused | `node --test tests/component-fit-matrix.test.cjs tests/design-skill-layer.test.cjs` | 15 pass, 0 fail, 0 skip, 0 todo |
| Full | `node --test tests/*.test.cjs` | Entire repository passes with 0 fail, 0 skip, 0 todo |
| Package | Resource registry/package export tests | Every declared component-fit resource loads |

## Definition of done

- [ ] S01, S02, and S03 acceptance criteria are checked.
- [ ] Focused and full verification output is attached to the implementation report.
- [ ] Independent review reports no Critical or Important findings.
- [ ] Only intentional component-fit files are committed; unrelated dirty work is preserved.
