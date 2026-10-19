# Brand facts come first: verified facts, a real logo and sourced colours before the build

## Why

Closes #156. When a page is designed for a real brand or product, the agent may state product facts,
brand colours and a logo from memory: a guessed colour, a redrawn mark, a spec that was never
checked. The vendored design direction library (#172) carries a protocol for this; the pipeline had
no step or gate that required it.

## What Changes

- New guide `skill/references/brand-facts.md` adopts the protocol: verify product facts into a facts
  file with a source on each, ask the owner for assets, then find the official page and download,
  take colour values from the downloaded assets, one official logo per product, stop and ask when no
  logo is found, and record the brand spec as Source Decisions in DESIGN.md.
- The existing design foundation check (`foundation check`, `checkDesignFoundation`) gains brand
  findings, and the web build step shows the same findings first. Trigger: DESIGN.md Product Context
  declares `Real brands: <names>`; `none` or no line means the gate does not apply.
- `design-direction-library.md` records the adoption of #156; SKILL.md, stages.md and
  design-synthesis.md point to the guide.

## Capabilities

- `design-pipeline`: ADDED the brand-facts requirement.

## Boundaries

No new gate, receipt schema, resolver, command or flag: the findings come from `checkDesignFoundation`
and use the `{code, severity, message, fix}` shape of the build findings. The check confirms that
evidence is written down and the cited files exist; it does not fetch URLs, judge whether a source is
official, or claim Visual Acceptance. The ui work stage has no build gate of its own and follows the
foundation check as stages.md already requires; the ui `next` does not run it.
