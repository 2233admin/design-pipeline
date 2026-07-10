# Spec delta: companion completeness

## Requirement

The design-pipeline self-check MUST detect the full companion set when installed via the team `design` profile:

### Visual taste

- `frontend-design`
- `design-taste-frontend`
- `ui-ux-pro-max`
- `web-design-guidelines`
- `emil-design-eng`

### Motion design

- `design-motion-principles` (source: `kylezantos/design-motion-principles`)
- `animation-vocabulary`
- `review-animations`
- `apple-design`
- `vercel-react-view-transitions`

### Animation implementation

- All `gsap-*` skills from `greensock/gsap-skills`
- `animejs` from `BowTiedSwan/animejs-skills`

### React / Next.js

- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `next-dev-loop`
- `next-cache-components-adoption`
- `next-cache-components-optimizer`

### Matt Pocock

- `codebase-design`
- `grill-with-docs`
- `implement`
- `matt-tdd` (local rename of `tdd`)
- `matt-code-review` (local rename of `code-review`)

Missing optional companions remain fallback-safe; missing required `design-pipeline` skill still fails the check.
