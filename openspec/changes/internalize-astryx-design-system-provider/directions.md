# Directions

## Selected: Inert Catalog Core With Explicit Local Acquisition

The stable core accepts strict JSON snapshots, normalizes them without side effects, and exposes
search, token projection, decision, and benchmark contracts. A provider may be acquired only
through a caller-selected local adapter, or through the bundled read-only Astryx translator over a
caller-supplied local Astryx CLI path. Astryx is the first bundled profile because it has an
Agent-oriented CLI and attributable public artifacts; the same contracts remain provider-neutral.

This direction keeps three authorities separate:

- project `DESIGN.md` and `MOTION.md` own product design and motion;
- provider artifacts supply attributed candidate evidence;
- the Design Pipeline CLI owns validation, decisions, receipts, and gates.

## Trade-offs

| Dimension | Selected direction | Cost accepted |
| --- | --- | --- |
| Offline use | Supplied snapshots work without a provider | Users prepare or receive a snapshot |
| Safety | Local adapters are explicit and command-limited | Acquisition is not one-click installation |
| Fidelity | Projection reports loss instead of inventing semantics | Some results require review |
| Replaceability | Astryx is one profile behind generic contracts | Provider-specific richness is normalized |
| Benchmarking | Candidates share the same v2 fairness conditions | Existing ad hoc comparisons are invalid |

## Rejected

### Bundle or auto-install Astryx

Rejected because it turns a candidate into a dependency, grants package-manager authority, and makes
offline validation depend on a moving beta toolchain.

### Import Astryx documentation modules directly

Rejected because `.doc.mjs` and integration files are executable modules. The kernel accepts JSON
data from a reviewed adapter but does not evaluate provider documentation code.

### Copy Astryx into the UI pattern catalog

Rejected because the UI pattern catalog is a separate, curated interoperability surface. Provider
components, docs, templates, and hooks remain in their attributed catalog namespace.

### Inject provider prompts into Agent instructions

Rejected because mutable external guidance must not gain global instruction authority. Agents
discover the bounded CLI through help and `design-system profiles`.

### Let aggregate benchmark scores choose adoption

Rejected because an aggregate can hide required failures, unavailable evidence, runtime
incompatibility, or unfair evaluation conditions.
