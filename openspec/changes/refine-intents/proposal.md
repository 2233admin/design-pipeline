# Proposal: refine intents are routable and have step guides

## Why

"Critique this page", "this is too loud", "tidy this screen up" and "polish it before we ship" are
the most common single requests about a surface that already exists. On 2026-11-11 all four fell
through `designer-pipeline route` to the default job:

```
route --query "critique this page"   -> product-design, score 0, confidence low
route --query "make this quieter"    -> product-design, score 0, confidence low
route --query "distill this screen"  -> product-design, score 0, confidence low
route --query "polish before ship"   -> product-design, score 0, confidence low
```

The four intents existed only as one row of the command table in `impeccable-contract.md` and a
`route` string in `impeccable-product-design.json`. `quieter` and `distill` had no steps anywhere,
so an agent did them from its default taste. Closes #347 (parent #346).

## What changes

- `references/job-registry.json` gains the scored job `refine-intents` (priority 45) with English
  and Chinese keywords for the four intents. No dispatcher source changes: the registry is the
  extension point, and the existing schema is used as it is.
- New guide `references/refine-intents.md`: one section per intent, each with what to check first,
  steps, what not to do, when it is done and the hand-off. Distill and quieter end in polish;
  quieter has two meanings by visitor mode.
- `references/impeccable-product-design.json`: every command names its `guide`
  (`<file>#<anchor>` under `references/`). The four refine intents point at the new sections, the
  other 19 at the guide the project already has.
- `SKILL.md` and `capability-routing.md` gain one routing row each; `impeccable-contract.md` and
  `impeccable-product-design.md` point at the guide; `package-resources.json` requires it.

## Reused, not added

- Routing: `route`, `job-registry.v1` and its schema, `job-route.v1`, `job-plan.v1`. The primary
  step of the job is `toolchain resolve`, which the kernel already runs, so the route adds no step.
- Review guides: the critique section opens `web-direction.md#critique-on-request` or
  `design-review-dimensions.md`, each by its own stated trigger. Polish uses the measured audit and
  review checklist of `ui-craft-sources.md`, `interface-defaults.md` and the craft floor.
- Record: results stay in the existing review record in `qa.md`.

## Boundaries

- No gate, receipt schema, finding code, CLI command or flag.
- No single critique scale is chosen and no usability scoring is added (#348). Recorded critique
  history, and the cause and order of polish fixes, are #349. The Impeccable detector is #239.
- The source lock is not moved. The four upstream files were read at `f2baa41`; the lock records
  `9fadc41` for the catalog, and the two rules that changed between them are followed.
- Guidance and routing only: a routed job grants no visual acceptance.

## Capabilities

- `design-pipeline`: ADDED two requirements (refine intents route to their guide; every Impeccable
  command names an existing guide heading).
