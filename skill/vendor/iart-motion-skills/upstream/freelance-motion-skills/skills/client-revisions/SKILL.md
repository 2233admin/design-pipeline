---
name: client-revisions
description: This skill should be used when the user asks to "stop scope creep", "limit revision rounds", "write SOW revision language", "the client keeps asking for changes", "how do I say this is out of scope", "translate vague feedback", "client said make it pop", or "write a change-order email". It provides revision-cap contract language, a consolidated-feedback request, a vague-feedback translator, and a polite out-of-scope email.
version: 0.1.0
---

# Client Revisions

Control revision rounds and scope creep on motion projects: define what a revision is, cap rounds in the SOW, collect feedback the right way, translate vague notes into actionable changes, and decline out-of-scope work politely as a change order.

## When to use

Use when feedback is mounting, when a client keeps adding "small tweaks," when the SOW needs revision language, when a vague note ("make it pop") needs decoding before touching the file, or when a request has clearly crossed into new work and needs a change-order reply.

## Decision tree — classify every note before touching the file

The whole skill is one judgment applied per note: *is this a revision, a new request, or just vague?* Run each note through this before opening the project.

```
A note arrives.
├─ Is it vague ("make it pop", "feels off")?
│   └─ YES → translate to a decidable choice + ask for a timestamp.
│            Do NOT act yet. Re-classify once it's concrete.
└─ Is it concrete?
    ├─ Does it change something ALREADY approved in brief/board?
    │   (timing, palette colour, approved-copy edit, a fix)
    │   └─ YES → REVISION. Counts against the round cap. Do it.
    └─ Is it anything NOT in the approved brief/board?
        (new scene, +runtime, new concept, new ratio, new asset,
         reversing an approved decision, "let's also try…")
        └─ YES → NEW REQUEST. Send the change-order email. Quote it.
                 Do NOT silently absorb it.

Is feedback scattered across people/messages?
└─ YES → STOP. Send the consolidated-feedback request first; one
         document, all stakeholders, conflicts resolved by the client.
```

Decision rule: when unsure whether a note is a revision or new request, ask "was this decided and approved already?" If yes → revision. If it adds, replaces, or reverses → new request.

## The core distinction: revision vs new request

This single line prevents most disputes — put it in the SOW and the feedback request:

- **A revision** = a change to something that was already in the approved brief/board (adjusting timing, colour from the palette, swapping an approved word, fixing a glitch).
- **A new request** = anything not in the approved brief/board (a new scene, added second of runtime, a different concept, a new aspect ratio, a logo not previously supplied, "let's also try…").

Revisions are included up to the cap. New requests are change orders, quoted and scheduled separately. State this before round 1, not after the dispute.

## SOW revision-cap language

Drop this into the contract/quote:

```
REVISIONS
This project includes [2] rounds of revisions. A "round" is one
consolidated set of feedback, collected from all stakeholders and
delivered in a single document, then addressed in full.

Included (a revision): changes to elements already approved in the
brief and storyboard — timing, pacing, colours from the agreed
palette, approved copy edits, and fixes.

Not included (a new request / change order): new scenes, added
runtime, new concepts or directions, additional formats or aspect
ratios, new assets not previously supplied, or feedback that
reverses a previously approved decision.

New requests are quoted as a change order before work proceeds and
may affect the timeline. Additional revision rounds beyond those
included are billed at [day rate]. Feedback split across multiple
messages may be treated as separate rounds.
```

## Workflow when feedback arrives

1. **Stop.** Do not open the project file yet.
2. **Consolidate.** If feedback is scattered or per-person, send the consolidated-feedback request (below). One document, all stakeholders, deduped and de-conflicted.
3. **Classify each note** as revision or new request using the distinction above.
4. **Translate vague notes** into targeted questions before executing (see translator).
5. **For new requests**, send the change-order email — do not silently absorb them.
6. **Log the round.** Record which round this is so the cap is visible to both sides.

## Consolidated-feedback request template

```
Subject: Feedback on [project] — Round [N]

Hi [name],

Ready for your notes on V[n]. To turn these around fast and cleanly,
could you send everything in one go:

• Gather feedback from everyone who needs to weigh in and merge it
  into a single list (if two notes conflict, tell me which wins).
• Use timestamps where you can — "at 0:08 the logo feels slow."
• Tell me the problem, not the fix — "the intro drags" is more useful
  than "make it faster," because it lets me solve it properly.
• Flag any must-have vs nice-to-have.

Send it all together and I'll address the full set in this round.
Notes that arrive after, or in separate messages, may roll into the
next round. Thanks!
```

## Vague-feedback translator

Never act on a vague note. Convert it to targeted questions first:

| Client says | Ask back |
|---|---|
| "Make it pop" | "More saturated colour, faster pacing, bigger scale moves, or stronger sound? Point to a second that already pops." |
| "It feels off" | "Off in pacing, colour, type, or message? Which 2 seconds feel most wrong?" |
| "Make it more premium" | "Slower easing, more space, restrained palette, or refined type — which one?" |
| "Can it be more dynamic?" | "More camera movement, faster cuts, or more elements in motion?" |
| "I don't love it" | "What specifically — and what would 'loving it' look like? A reference helps." |
| "Make it bigger / stronger" | "Larger scale, bolder type, higher contrast, or more screen time?" |
| "Something's missing" | "A scene, a message, a brand element, or energy? Where in the timeline?" |
| "Can we punch it up?" | "Pacing, colour, or sound? Show me a moment that already has the energy you want." |

Rule: turn every feeling into a choice between concrete, decidable options, and ask for a timestamp.

## Out-of-scope / change-order email template

```
Subject: [project] — quick note on the new request

Hi [name],

Happy to help with [the new request] — flagging that it sits outside
the approved brief/storyboard, so it's a change rather than a revision
under our current scope.

Here's what it takes:
  • Work: [what's involved]
  • Cost: [amount / day estimate]
  • Timeline impact: [+X days / new delivery date]

If you'd like to go ahead, reply "approved" and I'll add it and update
the schedule. If you'd rather keep to the original scope and budget,
no problem — we'll proceed as planned and can revisit this later.

Either way works for me; just let me know which you prefer.
```

Tone notes: collaborative, never accusatory. Offer the choice (proceed or park), give a number, and state the timeline impact. The goal is to make the trade-off visible, not to say "no."

## Worked examples

**GOOD — vague note decoded, then executed cleanly:**
> Client: "The intro feels off." → You: "Off in pacing, colour, or message — and which 2 seconds feel worst?" → Client: "The first 3 seconds drag before the logo." → You re-time the entrance (a revision, within scope), log it as Round 1. One question turned a feeling into a precise, in-scope fix.

**ANTI-PATTERN — silently absorbing scope:**
> Client: "Love it! Can we also do a square version and add a quick outro scene?" → You quietly build both, eat 2 extra days, and the project runs late and unprofitable.

Why it fails: a new aspect ratio and a new scene are both *new requests*, not revisions — but absorbing them without a change order trains the client that scope is free, sets a precedent, and erases your margin. The fix: reply with the change-order email, give a number and a timeline impact, and let the client choose. Saying "happy to — here's what it takes" is not saying no.

## Common mistakes

| Symptom | Why it happens | Fix |
|---|---|---|
| Endless rounds, never "final" | No cap defined, or cap not cited | State the cap in the SOW *before* round 1; cite it at round N+1 |
| Conflicting notes, redo loops | Acted on per-person feedback | Require one consolidated doc; client resolves conflicts |
| Margin gone on "tiny tweaks" | New requests absorbed as revisions | Classify every note; new work → change order with a price |
| Acted on "make it pop," still wrong | Executed a vague note literally | Translate to a decidable choice + timestamp before touching the file |
| Reworking an approved scene | Approval gate not locked | Lock each stage in writing; reopening a locked stage = new request |
| Feedback dribbles in for days | No single submission deadline | One round = one document; later notes roll to the next round |
| Client feels nickel-and-dimed | Change orders framed as "no" | Frame as a visible trade-off (proceed or park), never as refusal |

## Deliverable spec — what good revision handling produces

The outputs are emails and contract language, not files. Good handling means:
- The SOW defines a "round," caps rounds, and distinguishes revision vs new request *before* work starts.
- Each feedback round is one consolidated document, logged by round number.
- Vague notes are converted to decidable questions with timestamps before execution.
- New requests get a change-order email with work, cost, and timeline impact — never silent absorption.
- Tone stays collaborative: every email offers a choice and states the trade-off.

### Before you finish — checklist
- [ ] SOW states the round count, the "round" definition, and revision-vs-new-request.
- [ ] Feedback is consolidated (one doc, all stakeholders, conflicts resolved).
- [ ] Every note classified: revision / new request / vague-needs-translation.
- [ ] Vague notes translated to bounded choices + a requested timestamp.
- [ ] New requests sent as change orders with cost + timeline impact.
- [ ] The current round number is logged and visible to both sides.
- [ ] Approval gates locked in writing; reopening flagged as new work.
- [ ] Every client email offers a choice and avoids accusatory tone.

## Quick reference

| Situation | Move |
|---|---|
| Feedback dribbling in per-person | Send consolidated-feedback request; restart the round |
| "Make it pop" | Translate to concrete options + ask for a timestamp |
| Client requests a 4th round | Cite SOW cap; quote extra round at day rate |
| "Just one tiny new scene" | Change-order email; it's new work |
| Reversing an approved decision | New request, not a revision |
| New aspect ratio added late | Change order — separate format = separate deliverable |
| Two stakeholders conflict | Require client to pick the winning note before work |

## Reference files

- `references/sow-clauses.md` — full SOW revision section, approval-gate language, and "round" definition variants.
- `references/email-templates.md` — consolidated-feedback, change-order, extra-round, and stalled-approval email templates.
- `references/feedback-translator.md` — expanded vague-to-targeted feedback lookup and the "problem not fix" coaching note for clients.
