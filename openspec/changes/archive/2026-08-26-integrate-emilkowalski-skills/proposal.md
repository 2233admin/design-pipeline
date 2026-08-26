# Proposal: integrate emilkowalski/skills

## Why

The design-pipeline companion docs and self-check pointed at the wrong upstream path (`emilkowalski/skill` singular). The correct source is [emilkowalski/skills](https://github.com/emilkowalski/skills), which ships four design/motion skills. `apple-design` was missing from the motion companion set and from `check-deps`, so Apple-like / fluid system UI work could not be routed or detected consistently.

## What

- Correct all source refs from `emilkowalski/skill` to `emilkowalski/skills`.
- Document the full Emil set: `emil-design-eng`, `animation-vocabulary`, `review-animations`, `apple-design`.
- Add `apple-design` to Motion / Animation Set, SKILL.md motion companions, and Motion design group in `check-deps.cjs`.
- Keep `emil-design-eng` in Visual taste (primary polish lens) and motion companions.
- Point motion-spec at the Emil companion skills and note recommended ease-out defaults.
- Align install priority so `apple-design` is recommended for Apple-like / fluid system UIs.

## Non-Goals

- Do not install skills into user home skill directories (handled by a separate installer agent).
- Do not require Emil skills for core pipeline success; they remain enhancement-level.
- Do not change GSAP, Anime.js, Vercel, or other companion sets.

## Impact

Companion documentation, self-check install hints, and the motion companion contract correctly describe the Emil skill pack. Agents can detect and recommend `apple-design` for Apple-inspired web UI motion.
