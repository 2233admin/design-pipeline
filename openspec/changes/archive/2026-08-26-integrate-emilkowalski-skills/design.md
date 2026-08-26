# Design: integrate emilkowalski/skills

## Source of truth

Upstream: https://github.com/emilkowalski/skills

| Skill | Primary pipeline surface |
| --- | --- |
| `emil-design-eng` | Primary Set (visual/interaction polish) + Motion / Animation Set |
| `animation-vocabulary` | Motion / Animation Set |
| `review-animations` | Motion / Animation Set |
| `apple-design` | Motion / Animation Set (Apple HIG-inspired / fluid system UI) |

## Mapping into design-pipeline

### Companion skills (`skill/references/companion-skills.md`)

- Source column uses `emilkowalski/skills` for all four Emil skills.
- Primary Set retains `emil-design-eng` as the motion/polish lens among core design skills.
- Motion / Animation Set lists all four Emil skills plus existing motion companions (`design-motion-principles`, `vercel-react-view-transitions`).
- Install priority keeps `emil-design-eng` and adds `apple-design` for Apple-like / fluid system UIs.
- Status for the four Emil skills is documented as Installed (installer agent places them in the skill root).

### Self-check (`skill/scripts/check-deps.cjs`)

- Visual taste group: keeps `emil-design-eng` (interaction polish sits with primary design lenses).
- Motion design group: `animation-vocabulary`, `review-animations`, `apple-design`, plus non-Emil motion skills.
- Install hint URL: `https://github.com/emilkowalski/skills`.

### Skill entrypoint (`skill/SKILL.md`)

- Motion companion bullet list includes `apple-design` after `review-animations`.
- Pipeline stages and artifact layout are unchanged.

### Motion spec (`skill/references/motion-spec.md`)

- Companion skills section points at the four Emil skills and the upstream repo.
- Easing section notes Emil-style ease-out custom curves as recommended defaults, not hard requirements.

## Team / orchestration note

When a team run needs motion language, review, or Apple-like fluid UI:

1. Use `emil-design-eng` during design + implementation polish.
2. Use `animation-vocabulary` when writing `motion.md` timelines and easing language.
3. Use `review-animations` in the motion/QA gate after implementation.
4. Use `apple-design` when the product direction is Apple HIG-inspired or fluid system UI on the web.

Missing Emil skills remain non-blocking: record in `qa.md` and fall back to `motion-spec.md` gates.

## Validation

```bash
node skill/scripts/check-deps.cjs --json
```

Confirm install hints reference `emilkowalski/skills` and Motion design includes `apple-design`.
