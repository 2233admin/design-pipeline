## Why

A role-played walkthrough of the merged decision-roles change, and an outside review of it, found
three places where the pipeline makes the owner work for the workflow instead of the other way
round:

- **Short feedback is refused.** A "no" needed three words, with two CJK characters counting as
  one, so 首屏太暗了 (2.5 words) or "too dark" was refused while "The hero is too dark" passed. The
  owner's feedback was complete; the rule asked them to pad it.
- **An unchanged page comes back for review.** After a standard web final review rejection, `next`
  went straight back to probe, so the same page could be re-checked and shown to the owner again
  without a repair. Quick web already returns to build (decision roles phase 1).
- **The owner's "no" is reduced to a number.** The diligence statement listed only "N rule(s)",
  although those rules are the owner's strongest aesthetic statements.

## What Changes

- A "no" (a correction, a rejection, a combine note, an anti-goal) needs at least two words, each
  CJK character counting as one. A bare "no" or "ok" is still refused. Stated decisions (the skip
  line, the confirmed playback) keep their six-word rule, two CJK characters counting as one. The
  guide tells agents to ask about real ambiguity, never for length.
- A web page the owner rejected at the final review returns to build at every tier, until
  `index.html` differs from the page that review judged.
- The diligence statement lists each rule in the owner's words with its origin.

## Capabilities

- `design-pipeline`: ADDED `Owner feedback is taken as given`, `A rejected page is repaired before
  it is shown again`, and `The diligence statement quotes the owner's no`.

## Reuse

- The existing `reason()`/`statement()` checks and `wordCount`, with a CJK weight option.
- The quick-web repair step from decision roles phase 1 (`rejectedUnchanged`), now at every tier.
- The existing statement renderer.

## Impact

- Owners can reply in short Chinese or English feedback.
- Standard web work adds a repair step after a rejection; nothing else in the flow changes.
- Film and edit rejections are unchanged.
