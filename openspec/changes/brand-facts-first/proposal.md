# Brand facts come first: verified facts, sourced brand tokens and a real logo before the build

## Why

Closes #156. When a page is designed for a real brand or product, the agent may state product facts,
brand colours and a logo from memory: a guessed colour, a redrawn mark, a spec that was never
checked. The vendored design direction library (#172) carries a protocol for this; the pipeline had
no step or gate that required it. The project already has formats for exactly this evidence:
`DESIGN.md` (Google format, its colour group generated from the design-system package) and the
`design-system/` package, whose `tokens.json` is the single source of values and whose README has an
Iconography section covering logo handling.

## What Changes

- New guide `skill/references/brand-facts.md` adopts the protocol: verify product facts into a facts
  file with a source on each, ask the owner for assets, then find the official page and download,
  take colour values from the downloaded assets, one official logo per product, stop and ask when no
  logo is found.
- DESIGN.md Product Context declares `Real brands: <names>` and `Brand facts: <path>`; that is the
  only brand prose in DESIGN.md. `none` or no line means nothing is checked.
- Brand colours are not prose. In `design-system/tokens.json` a brand colour is a colour token that
  also carries `brand` and `source`; the generated DESIGN.md `colors` group carries it, and the
  existing drift check keeps the two equal. A brand whose colours the page does not use says
  `brands.<Brand>.colours: "none"`.
- Logos live in `design-system/assets/logos/` and are declared once per brand in
  `brands.<Brand>.logo = {path, source}`.
- The existing design-system package check (`design-system check`, `foundation check --kind
  system|all`) reports the brand findings; the web build step shows the same findings first. A
  project that declares real brands and has no package gets a finding with the fix.
- `design-direction-library.md` records the adoption of #156; SKILL.md, stages.md,
  design-synthesis.md and design-system-package.md point to the guide.

## Capabilities

- `design-pipeline`: ADDED the brand-facts requirements.

## Boundaries

No new gate, receipt schema, resolver, command or flag: the tokens.json validation of the package
check is extended, and findings use the `{code, severity, message, fix}` shape. Brand names are
compared exactly, never by substring. The check confirms that evidence is written down and the cited
files exist and hold the value; it does not fetch URLs, judge whether a source is official, or claim
Visual Acceptance. The ui work stage has no build gate of its own and follows the foundation check as
stages.md already requires.
