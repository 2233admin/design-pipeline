# DESIGN.md — The Directory

A curated collection of DESIGN.md files, templates, and resources for AI coding agents.

**DESIGN.md** is a plain-text design system file that tells AI coding agents (Cursor, Claude Code, Codex, Windsurf, Bolt, v0, Lovable, Kiro) how to generate UI with consistent visual direction instead of generic defaults.

Browse the full directory → [designmd.directory](https://designmd.directory)

Maintained by [Dima Braven](https://dimabraven.com), creator of [DesignMD Directory](https://designmd.directory).

---

## Install any DESIGN.md in one command

```bash
npx designmd-cli install stripe
npx designmd-cli install linear
npx designmd-cli install vercel
```

Or install globally:

```bash
npm install -g designmd-cli
designmd-cli install <slug>
```

### CLI commands

| Command | Description |
|---|---|
| `designmd-cli install <slug>` | Download a DESIGN.md into your project |
| `designmd-cli list` | Browse all available files |
| `designmd-cli search <query>` | Search by brand, style, or category |
| `designmd-cli install <slug> --path ./my-design.md` | Custom output path |

After installing, tell your agent: **"Follow the design system in DESIGN.md"**

→ [designmd-cli on npm](https://www.npmjs.com/package/designmd-cli)

---

## Example files in this repo

Ready-to-use DESIGN.md files you can copy directly into your project:

- [`examples/stripe.md`](examples/stripe.md) — Clean, high-density fintech UI
- [`examples/linear.md`](examples/linear.md) — Dark, minimal keyboard-first productivity tool
- [`examples/vercel.md`](examples/vercel.md) — Monochrome, developer-native, Geist-based dark UI
- [`examples/minimal-saas.md`](examples/minimal-saas.md) — Neutral SaaS starter for any product

---

## Brand-inspired references

Hand-authored DESIGN.md references based on publicly observable design signals from popular products.

- [Stripe design reference](https://designmd.directory/p/stripe-design-md) — fintech, data-dense, indigo on white
- [Linear design reference](https://designmd.directory/p/linear-design-md) — dark, compact, keyboard-first
- [Vercel design reference](https://designmd.directory/p/vercel-design-md) — monochrome, Geist, developer-native
- [shadcn/ui design reference](https://designmd.directory/p/shadcnui-design-md-reference) — Tailwind tokens, Radix primitives, composable components
- [Notion design reference](https://designmd.directory/p/notion-design-md) — document-native, warm, editable
- [GitHub design reference](https://designmd.directory/p/github-design-md) — utility-first, Primer system
- [Figma design reference](https://designmd.directory/p/figma-design-md) — canvas-first, creative tools
- [Supabase design reference](https://designmd.directory/p/supabase-design-md) — open-source, dark green
- [Resend design reference](https://designmd.directory/p/resend-design-md) — minimal, developer email
- [Cal.com design reference](https://designmd.directory/p/calcom-design-md) — scheduling, clean, open-source

→ [Browse all 200+ brand references](https://designmd.directory)

## Templates

- [Minimal SaaS dashboard](https://designmd.directory/t/minimal-saas-dashboard-designmd) — compact dashboard for any B2B product
- [AI app starter](https://designmd.directory/t/ai-app-starter-designmd) — starter visual system for AI products
- [Landing page](https://designmd.directory/t/landing-page-designmd) — marketing page reference
- [Admin panel](https://designmd.directory/t/admin-panel-designmd) — internal admin interface
- [Analytics dashboard](https://designmd.directory/t/analytics-dashboard-designmd) — data-heavy product UI
- [Dark terminal app](https://designmd.directory/t/dark-terminal-app-designmd) — devtool with terminal aesthetics
- [Command center](https://designmd.directory/t/command-center-designmd) — Raycast/Linear-style command palette UI
- [AI chat app](https://designmd.directory/t/ai-chat-app-designmd) — conversational AI interface
- [Developer docs](https://designmd.directory/t/developer-docs-designmd) — documentation site reference
- [Tailwind DESIGN.md template](https://designmd.directory/templates?type=tailwind) — all Tailwind-based templates
- [shadcn/ui DESIGN.md template](https://designmd.directory/templates?type=shadcn) — all shadcn/ui-based templates

## Tool guides

- [DESIGN.md for Cursor](https://designmd.directory/for/cursor) — using DESIGN.md as persistent design context in Cursor
- [DESIGN.md for Claude Code](https://designmd.directory/for/claude-code) — using DESIGN.md with Claude Code for frontend work
- [DESIGN.md for Codex](https://designmd.directory/for/codex) — using DESIGN.md with OpenAI Codex
- [DESIGN.md for Windsurf](https://designmd.directory/for/windsurf) — using DESIGN.md in Windsurf (Codeium)
- [DESIGN.md for Bolt](https://designmd.directory/for/bolt) — using DESIGN.md in Bolt.new
- [DESIGN.md for v0](https://designmd.directory/for/v0) — using DESIGN.md with Vercel v0
- [DESIGN.md for Lovable](https://designmd.directory/for/lovable) — using DESIGN.md in Lovable
- [DESIGN.md for Kiro](https://designmd.directory/for/kiro) — using DESIGN.md in Amazon Kiro

---

## What makes a good DESIGN.md?

A useful DESIGN.md should include:

- **Color tokens** with clear roles (primary, surface, border, muted) and exact hex values.
- **Typography scale** with font families, weights, sizes, and usage context.
- **Spacing and radius rules** that map to real UI decisions.
- **Component guidance** for buttons, cards, forms, navigation, and empty states.
- **Layout principles** covering density, rhythm, responsive behavior, and hierarchy.
- **Do / don't rules** that prevent common AI-generated UI mistakes.
- **Agent instructions** that tell the model exactly how to apply the file.

## Example structure

```md
---
name: Product Design System
colors:
  primary: "#635BFF"
  background: "#FFFFFF"
  surface: "#F6F9FC"
  border: "#E3E8EE"
  text-primary: "#0A2540"
  text-secondary: "#425466"
typography:
  heading: "system-ui, sans-serif"
  body: "system-ui, sans-serif"
  mono: "SFMono-Regular, monospace"
spacing:
  base: "8px"
radius:
  card: "12px"
  button: "8px"
  input: "8px"
---

# Product Design System

## Visual Direction

Describe the visual personality, density, and hierarchy in 2–3 sentences.

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| --primary | #635BFF | CTAs, links, focus rings |
| --bg | #FFFFFF | Page background |
| --surface | #F6F9FC | Cards, panels |
| --border | #E3E8EE | Borders, dividers |

## Components

Define buttons, cards, forms, navigation, and common states with inline Tailwind or CSS.

## Agent Instructions

Tell the model exactly how to apply this design system. Be specific about typography, spacing, and color usage.

## Don't

List the top 4–6 anti-patterns to avoid for this specific visual style.
```

---

## Learn more

- [What is DESIGN.md?](https://designmd.directory/guides/what-is-design-md)
- [DESIGN.md examples](https://designmd.directory/guides/design-md-examples)
- [DESIGN.md vs design tokens](https://designmd.directory/guides/design-md-vs-design-tokens)
- [DESIGN.md vs Claude.md](https://designmd.directory/guides/design-md-vs-claude-md)
- [DESIGN.md vs Figma design systems](https://designmd.directory/guides/design-md-vs-figma-design-systems)
- [Why AI agents make generic UI](https://designmd.directory/guides/why-ai-agents-make-ugly-ui)
- [How to make Claude Code generate better UI](https://designmd.directory/guides/how-to-make-claude-code-design-better-ui)
- [How to create a DESIGN.md from a website](https://designmd.directory/guides/how-to-create-design-md-from-website)
- [Browse all examples](https://designmd.directory/examples)
- [DesignMD Blog](https://designmd.directory/blog) — articles on writing, structuring, and using DESIGN.md files with AI coding agents

---

## Contributing

Suggestions are welcome. Open an issue with a link to a useful DESIGN.md resource, example, or template.

Include:
- URL
- Short description
- Why it is useful for people writing DESIGN.md files

## License

MIT
