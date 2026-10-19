# Name real brands at intake

## Why

Closes #177. The brand-facts check (#156) runs only when DESIGN.md Product Context declares `Real brands:`. An agent that forgets the line skips the check, because nothing at intake asks about brands.

## What Changes

- The web intake and the ui playback instructions add one playback line for the real brands or products the conversation or brief names (`Real brands: Stripe, Meta (my guess)` or `none`), and tell the agent to record the confirmed line as `Real brands:` in DESIGN.md Product Context when it is written.
- Guides agree: `workflow-web.md`, `brand-facts.md`.
- The ui playback validator is unchanged: it still requires five lines and does not require the brands line, so recorded playbacks stay valid. The line is instruction, not a gate.

## Capabilities

- `design-pipeline`: ADDED the intake brands requirement.

## Boundaries

No new stage, gate, receipt, command or flag.
