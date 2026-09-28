# Port motion-web interaction ideas

## Why

Step 5 of `redesign-user-workflow` ports ideas from the reference skill motion-web
(`skill/references/reference-skill-motion-web.md`, CC BY-NC 4.0, ideas only). Its central ideas:

- motion is the material of the interface, not decoration: no opacity-only entrances, no linear
  easing, responses have mass, damping and overshoot;
- every interactive page is checked by a headless probe that drives real input (pointer sweeps,
  wheel, clicks) and asserts measured behavior: the page responds, settles, returns to its rest
  anchor, and does not drift;
- pages are self-contained (no CDN or remote fonts at runtime).

Our web motion evidence is receipt-based: `verify motion` checks values an agent reports, not
behavior a browser measured. A dead or linear interaction passes if the receipt says so. The
`web` deliverable also has no sub-workflow of its own; `next` sends it to the long pipeline
reference.

## What changes

- `verify interaction`: a measured interaction probe. A small `interaction.json` declares the
  target element, the input to drive and the expectations; a headless browser (the puppeteer-core
  and chrome stack film capture already uses) drives the input and samples the target every
  frame. Findings: `dead-interaction`, `no-settle`, `rest-drift`, `linear-response`,
  `opacity-only`, `external-request`.
- A `spring-settle` motion primitive and a short web-motion guide (spring-damper parameters,
  overshoot and settle, stepped motion), in our own words.
- `web` sub-workflow: stage module and `references/workflow-web.md`, with `next` routing to
  `verify interaction` before a draft is shown.

No upstream code, text, data or assets are used. Workers implement from `briefs/` only and do not
open the motion-web repository.
