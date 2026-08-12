# Direct, Plain-Language Contract

Read this reference when writing interface copy, product notices, errors, recovery guidance, or
pipeline artifacts that ask a person to decide or act. It adapts the conversational rewrite and
second-pass completeness ideas reviewed from
[`joeseesun/qiaomu-content-interpreter`](https://github.com/joeseesun/qiaomu-content-interpreter)
revision `68adb343a0d61d344699f3c350a5920da85d4ddc`. It does not import the upstream personal voice,
filesystem workflow, fixed article shape, image generation, or Obsidian integration.

## Put the Useful Part First

- Start with the consequence the reader will see or the action they can take.
- For a dated change, lead with the date and concrete effect. For an error, name the exact failed
  scope. For recovery guidance, state the next safe action before internal implementation detail.
- Explain an internal cause only when it changes the reader's decision or helps them recover.
- Prefer a named subject and a direct verb. Use ordinary words when they preserve the same meaning.
- Keep paragraphs short enough to scan, but do not turn related conditions into a row of abrupt
  fragments.

Containers already labelled as an announcement, warning, or error do not need openings such as
"Announcement", "Friendly reminder", or "We are excited to share". Do not manufacture empathy,
questions, urgency, or praise.

## Directness Cannot Enlarge the Claim

Before rewriting, keep an internal fact ledger:

- actor or affected group;
- event, state, or failed operation;
- exact scope, count, and exclusions;
- uncertainty such as `may`, `can`, or `will`;
- time, limit, and reset boundary;
- what remains unchanged;
- available next action.

The rewrite must preserve every fact that affects a decision. In particular:

- three unrecognized fields do not become an invalid file;
- a possible delay does not become a guaranteed delay;
- "up to ten minutes" does not become "ten minutes";
- one plan, role, viewport, or state does not become every user or surface;
- an unavailable action must not appear as a button or recovery path.

A shorter sentence that changes scope is worse, even when it sounds clearer.

## Interface Copy

- Titles name the smallest accurate problem or outcome.
- Bodies say what happened, what did not happen when that matters, and what the reader can do next.
- Button labels describe the action that the current interface really performs.
- Keep counts, dates, time zones, limits, data-loss posture, and affected plans or roles visible.
- Replace reporting jargon with the observable action or consequence. Do not add slogans or a
  second explanation of the same point.

## Two-Pass Review

1. Rewrite for first-sentence usefulness, ordinary verbs, and scanability.
2. Compare the rewrite with the fact ledger. Restore missing limits or exclusions, repair widened
   claims, remove repetition, and stop.

For high-impact errors, destructive actions, pricing/plan limits, data handling, or migration
notices, compare the old and proposed copy in change `qa.md`. Prefer the version that reaches a
useful fact sooner only when both versions preserve the same scope and available actions. Routine
low-risk copy needs the two passes, not a separate benchmark ceremony.
