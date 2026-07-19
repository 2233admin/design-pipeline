# Proposal: fill remaining design-pipeline companions

## Why

After Emil integration, `check-deps` still reported missing enhancement/optional companions (visual taste, motion principles, GSAP/Anime, Vercel/Next, Matt Pocock). Agents could not exercise the full design-pipeline gate set.

## What

- Vendor and install all companions required by `skill/scripts/check-deps.cjs`.
- Vendor taste-skill and UI/UX Pro Max extension sets used by companion docs.
- Expand `team-skills` `profiles/design.yaml` and regenerate `skills.lock.yaml`.
- Correct upstream URL for motion principles (`kylezantos/design-motion-principles`).
- Rename local frontmatter for `ui-ux-design`, `matt-tdd`, `matt-code-review` to avoid name collisions.

## Non-Goals

- Do not install Cloudflare vibesdk / impeccable optional-later skills unless requested.
- Do not change quant profile behavior.

## Impact

`check-deps` reports all required + enhancement + optional skill groups installed. `skillgate apply --profile design` distributes the pack to Claude Code, Codex, Cursor, and Grok.
