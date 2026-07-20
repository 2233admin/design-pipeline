# Design: contextual anti-slop review

## Foundation

This change extends the validated project `DESIGN.md`. It preserves the product's calm, exact, and
inspectable character by converting taste observations into explicit data and evidence.

## Contracts

### Rubric

`skill/references/anti-slop-rubric.json` contains:

- reviewed source metadata;
- severity policy;
- stable rule identifiers;
- applicability by surface;
- evidence expectations;
- exception policy.

The full upstream prompt is not bundled.

### Evidence

`skill/references/anti-slop-evidence.schema.json` defines one target and one observation per reviewed
rule. Outcomes are:

- `pass`
- `fail`
- `not-applicable`
- `not-verified`
- `accepted-context`

`accepted-context` is invalid for hard rules. `not-applicable` requires a target-specific reason.

### Review output

`skill/scripts/evaluate-anti-slop.cjs` emits a local report:

- hard `fail`, `not-verified`, or missing evidence -> blocker;
- contextual `fail`, `not-verified`, or missing evidence -> warning;
- preference findings -> information only;
- accepted contextual decisions -> recorded, not silently discarded.

## Pipeline Integration

### Stage 2

Use the rubric to compare direction-level template density, cohesion, specificity, and signature
artifacts. It must not eliminate a direction only because it uses a named color, font, shape, or
common layout family.

### Stage 3

When the review is active, add `Anti-template Decisions` to change `design.md` or the relevant
project `DESIGN.md`. Record deliberate adoptions, rejections, and contextual exceptions.

### Stage 6

Run the evaluator from explicit visual, code, browser, or test evidence. Link its report from
`qa.md`. Only hard findings block completion.

## Dual-site Trial

The Arknights signal-dark profile and Endfield ink-light profile intentionally use strong,
recognizable visual decisions that generic anti-slop prompts may dislike. The fixtures must accept
those contextual choices while still blocking unverified responsive, interaction, or reduced-motion
evidence.

## Non-goals

- Automatic screenshot classification.
- A universal numerical taste score.
- Auto-fixing visual code.
- Installing a component or motion dependency.
- Publishing feedback remotely.
