# Spec delta: companion completeness

## ADDED Requirements

### Requirement: Companion self-check covers the design profile

The design-pipeline self-check MUST detect the full companion set when installed via the team `design` profile:

**Visual taste**

- `frontend-design`
- `design-taste-frontend`
- `ui-ux-pro-max`
- `web-design-guidelines`
- `emil-design-eng`

**Motion design**

- `design-motion-principles` (source: `kylezantos/design-motion-principles`)
- `animation-vocabulary`
- `review-animations`
- `apple-design`
- `vercel-react-view-transitions`

**Animation implementation**

- All `gsap-*` skills from `greensock/gsap-skills`
- `animejs` from `BowTiedSwan/animejs-skills`

**React / Next.js**

- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `next-dev-loop`
- `next-cache-components-adoption`
- `next-cache-components-optimizer`

**Matt Pocock**

- `codebase-design`
- `grill-with-docs`
- `implement`
- `matt-tdd` (local rename of `tdd`)
- `matt-code-review` (local rename of `code-review`)

Missing optional companions remain fallback-safe; missing required `design-pipeline` skill still fails the check.

#### Scenario: The full design profile is installed

- **WHEN** self-check runs with every companion listed above installed
- **THEN** it SHALL detect every companion in its corresponding capability group
- **AND** the required core pipeline check SHALL pass.

#### Scenario: An optional companion is missing

- **WHEN** one or more optional companions are unavailable
- **THEN** self-check SHALL report the missing capability with a fallback and SHALL remain usable
- **AND** a missing required `design-pipeline` skill SHALL still fail the check.
