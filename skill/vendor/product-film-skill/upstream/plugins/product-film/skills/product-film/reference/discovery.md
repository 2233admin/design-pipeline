# Discovery: learn the product before drawing a frame

The film is judged against the product's own look. Collect it first, write it down, and treat it as law. Output: `videos/BRAND.md` (template: `templates/BRAND.md`), and `findings.md` if you use planning files.

## Where to look

Run 3 or 4 read-only sweeps in parallel (Explore subagents), one topic each, and ask each to return paths, values and quotes. Do not ask for opinions.

1. **Rules and voice.**
   - Files: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `CONTRIBUTING.md`, `docs/brand*`, `docs/design*`, style guides, `DOCUMENTATION.md`.
   - Memory notes, if the harness has them.
   - Extract, with the source of each rule:
     - hard rules (casing, dashes, reading level, banned words)
     - design rules (radius, borders, shadows, mono usage, letter spacing)
     - claims and legal limits, approved taglines
2. **Tokens.**
   - Files: the global CSS (`globals.css`, `@theme`, CSS variables), the Tailwind config, theme files.
   - Extract: background, foreground, muted, card, border and accent in dark and light, plus hover and pressed states.
   - Also: radius, fonts and where they load from, and the easing curves and springs the UI uses (grep `cubic-bezier`, `spring`, `transition`).
3. **Components and signature elements.**
   - Button variants, markers or status glyphs, stamps, badges, spinners and loaders (and how submit buttons show loading), avatars, toggles, cards.
   - Brand icons for partner names, and the logo (SVG, component or model).
   - Anything the landing page uses as a signature: dashed outlines, dithers, hatch bands, ornaments.
   - For each: path, props, and whether it runs its own clock (motion libraries, `requestAnimationFrame`, `setInterval`, CSS keyframes, shader libraries, async image state).
4. **Features on screen.**
   - For each feature the film will show: the real screen or component, its copy, and the states it moves through.
   - Also the demo data the landing already uses, and any fake-data preview routes.
5. **Old video work, if any:** what to keep, what was tried and dropped, licenses of music and SFX.

## Tour the live site

Open the landing page in a browser (the in-app browser tool) at desktop width.
- Scroll every section.
- Note in `findings.md` right after every two screenshots: layout (framed or full bleed?), colors on screen, type sizes, how CTAs look and press, animated demos, how the logo (or any character) moves, how partner logos are shown.
- Screenshots do not persist, so write findings down right away.

## The logo and any brand element

- Find the logo as SVG (paths you can draw on), plus any animated version: Lottie, Rive, or a component driven by code.
- Note whether the product has a mascot or character. Only then can one appear in the film, and only if the user picks it in the interview.
- If a mascot is chosen and has a model or animation code, find its pure functions and drive them from `t`. Never render a component that runs its own clock. If only an SVG exists, animate its transforms from `t`.
- If anything animates, render a pose sheet still before scene work.

## Feed the interview

Stop discovery once you can name the real options: the product's features and screens, its components worth showing, its logo, a mascot if one exists, partner or integration logos, any brand texture.
Then run the interview (interview.md) before the full brand kit. Finish discovery on what the user chose.

## Write BRAND.md

Fill `templates/BRAND.md`.
- Every rule cites its source (file path or product owner quote).
- Keep a "Components" table: import as is, frame-driven twin, or redraw, with the reason.
- Keep a "Claims" section: what the product does, what it never does, approved lines.
- Where the product says nothing, use the craft defaults in `SKILL.md` and mark them as defaults so the product owner can overrule them.

## Ask when it matters

Ask the user (AskUserQuestion) only for choices the code cannot answer:
- the audience and where it plays
- which features to show
- the music (and its license)
- anything the brand rules contradict each other on
