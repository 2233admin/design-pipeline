# Design: the owner's attention

## Context

Decision roles (#112) gave every checkpoint an owner or agent, made final acceptance the owner's at
every tier and rendered a diligence statement at done. A walkthrough of a two-section standard web
page found nine owner asks. Fix PR #114 removes three frictions: short feedback refused, an
unchanged page shown again, and rules counted instead of quoted.

An outside review named the larger problem: owners keep using the tool but stop engaging, approving
recommendations they never judged. The record looks complete while the judgement is missing.

Research from official documentation (summarised; sources at the end):

- **Figma Make:** clicking an element on the running app attaches a frozen screenshot of its
  state. Comments are grouped as "current version" and "other versions", and only the latest
  version takes new comments.
- **Vercel v0 Design Mode:** the owner selects an element on the live preview, edits its style or
  describes the change, toggles before/after of pending edits, then applies them as a new version.
  Restoring creates a new latest version.
- **Vercel preview comments:** each comment records the browser, viewport and deployment, and a
  popup prompts a refresh when a newer deployment exists. There is no per-comment "outdated" badge.
- **Linear Inbox and Triage:** the owner acts inline with single keys (accept, decline, duplicate,
  snooze). Snooze takes natural-language times and wakes early on new activity.
- **Cursor:** checkpoints are taken before significant changes and can be restored. The owner can
  queue guidance or steer at the agent's next safe boundary.
- **GitHub pull requests:** pending review comments are private until one submit. "Viewed" clears
  when the file changes. Approvals can be dismissed automatically when new commits land.
- **No product we checked ships a "while you were away" digest.** We design that ourselves.

## Goals and non-goals

**Goals:**

- Fewer owner asks, each with a new trade-off.
- Feedback on the real page, scoped to what it was about.
- Approval bound to a version, with clear staleness.
- Re-review in proportion to what changed.
- Delegation that can change over time.
- Work that continues while the owner is away.

**Non-goals:**

- Removing phase 1's responsibility boundaries: final acceptance stays locked to the owner.
- Building a project management tool.
- Proving human identity. Phase 1's "`--by` is a claim" stays true; G below narrows the gap.
- Weakening technical gates: evidence re-runs whenever its inputs change.

## A. The ask budget

- By default the owner meets standard work twice: **the direction** (variants) and **the result**
  (final acceptance).
- The playback becomes a short card the owner corrects, not a document to approve: three intent
  lines, open uncertainties, and the delegation line.
- The description and the section reviews become agent self-checks against the confirmed card and
  the chosen direction. The owner sees a section only when it carries a new trade-off: something
  the card and direction do not settle, or that changes cost, content or behaviour.
- Every owner ask has one shape:
  1. what needs the owner;
  2. the recommendation and its cost;
  3. the visible difference (a preview, or two states side by side);
  4. the actions: use the recommendation, keep it as it is, point at something else, decide later.
- An ask that cannot name what is new since the last ask is not sent.
- Component sources become a consequence ask, asked only when it matters: "this needs a new
  dependency under license X", not a source category.
- **Experiment target:** two or three meaningful owner interventions for the two-section sample.
  Also measure missed key questions and rework. Fewer asks with more rework is a regression.

## B. Review on the real page (lite)

- **Comment mode** on the built page (`index.html`, or the variants page):
  - the owner clicks an element; the pipeline records its selector, a cropped screenshot, the
    viewport and the page version (the digest of the page and the files it loads);
  - comments stay pending until one submit, like a GitHub review.
- **Result view:** before/after of the change the agent made for each comment, and the page
  version the owner is looking at.
- **Accept the current version:** a single action that records the page digest. A newer version
  marks the acceptance stale, with a visible "you approved an earlier version" notice. A
  comment on an older version is shown as outdated.
- **Lite means:** no UI IR, tokens or design-code map are required of the owner's project. It
  still writes ordinary v1 `runtime-review` Records, so `--evidence` accepts them: the v1 Feedback
  requires the bundle, design identity, source set, observation, target, snapshot and policy
  digests, and the Record requires `contextAtRecord`. Phase 3 extends the existing bundle capture
  (no parallel schema, no optional digests) so a lite capture fills every one: the design identity
  from the brief, the confirmed card and the chosen variant when there is no UI IR or tokens; the
  source set from the page and the files it loads; the observation from the overlay capture. A
  citation is accepted only when its Record validates.
- **Partial change:** a comment on one element is a change request, not a rejection of the
  section. Accepted parts stay accepted only while the pipeline can show nothing else changed:
  - the changed set comes from the pipeline comparing the two rendered versions at the reviewed
    viewports (pixel regions and computed styles per element), never from the agent's account of
    its edit;
  - every changed element is shown before/after, including ones nobody commented on (shared CSS
    that also moves the header puts the header in the review);
  - when the comparison cannot be made or cannot attribute a change to elements, the whole page
    returns to review and earlier acceptance is stale.

## C. Change tiers

| Tier | Example | Owner re-review | Evidence |
|---|---|---|---|
| Bytes | typo or formatting in `brief.md` | none | re-run if bound |
| Commitment | a goal, a section added or removed, a direction change | the affected decision only | re-run |
| Page | the rendered page changed | every element the comparison finds changed, before/after; the whole page when it cannot attribute the change (B) | re-run |

- The agent proposes a tier. The pipeline checks it against what changed (for example, the section
  list and confirmed card fields for a commitment; the page digest for a page change), and
  escalates when they disagree.
- A tier never skips evidence: gates still bind bytes.

## D. Feedback scope

- A "no" binds by default to its object (an element, a section or a variant) and to the round it
  was given in.
- It becomes a project rule only when the owner says so ("from now on", "everywhere"), or when the
  agent asks once at final acceptance: "Keep these for the rest of the project?"
- Rules keep an append-only history. The effective set is computed: a rule can be narrowed (scope),
  superseded (a newer rule replaces it) or retired, each recorded with who did it and when.
- A lasting preference across projects (for example "no gradients in KATANAview") goes through the
  existing adaptation ledger in shadow mode, never as an automatic rule.

## E. Delegation over time

- The owner can change delegation at any owner-recorded decision, not only at intake ("you decide
  the layout from now on; ask me about navigation").
- Each decision stores the delegation entry it was made under. History is never reinterpreted by
  today's map.
- A past agent decision can be reverted or superseded, with its own record. It is never rewritten
  to look authorised.

## F. Absence

- **Three states:** drafts (reversible work within delegation), pending decisions (waiting for the
  owner) and accepted results.
- While the owner is away, the agent keeps doing reversible work and self-checks inside its
  delegation. Work that depends on an open owner decision stays limited: the agent may prepare
  alternatives but not build on a guess.
- No answer is never consent, and nothing passes final acceptance without the owner.
- **Pending decisions are an inbox:** answer, decide later (snooze until a time, or until new
  activity), or ask the agent for more information.
- **"While you were away"** is one short summary built from the version timeline:
  - what changed;
  - which of those changes the agent decided;
  - which approvals went stale;
  - the one or two decisions still needed;
  - what a rejection would affect.

  Each item links to its before/after.

## G. Owner confirmation provenance

- An owner record binds the version the owner saw (page digest) and a source: the owner's words
  from the conversation, or the confirm action of the page review.
- A returned command no longer hands the agent a ready-made `--by owner` for final acceptance. The
  agent records it from the page review's confirm action or with the owner's quoted words.
- What this proves: a confirmation existed for this version. It does not prove who clicked.

## H. Creative intent and language

- Creative intent (expression, connection, distinctiveness) is drawn from the conversation into
  the playback card. Only the lines the agent is unsure of are asked, as part of the playback. No
  fifth question.
- Owner-facing asks, cards and summaries follow the project's language: the brief's language, else
  the conversation's.

## I. Where things live (principle 2)

| Information | Place |
|---|---|
| What the agent decided, and why | beside the change it made, in the page review and in the away summary |
| The diligence statement | a short block in the PR description and the `Assisted-by` trailer; the full text on request |
| Rules | only the ones that apply to the element being reviewed; the full list in history |
| Technical checks | failures located on the page; the full log for engineers |

## Phases

1. **Ask shape and budget (A), language (H), feedback scope (D).** This is mostly flow and text,
   and gives the largest drop in asks.
2. **Change tiers (C).**
3. **Page review lite (B) and confirmation provenance (G)**, in two steps:
   - **3a** (`owner-attention-page-refs`): numbered element references the owner cites in chat, `--ref` on a
     rejection, and the owner's own words on the final web acceptance. The owner chose numbers before the
     click-to-comment overlay. G is narrowed there: `--by` stays a claim that the owner's words make
     checkable, and the acceptance binds the probe lineage.
   - **3b**: the click-to-comment overlay, before/after, the per-element comparison and the page tier of C,
     a mobile capture, and confirmation through the page review's action.
4. **Absence (F) and delegation over time (E).** Also takes what phase 1 deferred: "decide later"
   on an ask, narrowing, superseding or retiring a rule by hand (phase 1 keeps rule history as
   `givenScope` and `promotedAt` only), changing delegation after intake, and routing lasting
   cross-project preferences to the adaptation ledger.

## Owner decisions

The owner delegated the four open questions with one direction: keep each option available, and
open it when the situation calls for it rather than always or never.

1. **Section reviews:** two meetings stay the default. A section review opens in two cases only:
   the owner asks for it ("review each section with me", recorded as delegation and changeable
   per E), or the section carries a new trade-off (A). Otherwise a section is an agent self-check.
2. **Component sources:** no source-category ask. The owner is asked only when the choice has a
   consequence: a new dependency, a license obligation, or a notable cost (bundle size, a paid
   service). Otherwise the agent decides within its delegation and records the source.
3. **Rules from a round's "no"s:** scoped silently by default. At final acceptance the agent asks
   once, listing the candidates, only when a "no" looks general: it was given about more than one
   object, or the owner phrased it as a principle without saying "from now on". Nothing becomes a
   rule without the owner's answer.
4. **Page review lite:** an overlay on the real page, injected only when the pipeline serves the
   page for review, never written into `index.html`. This follows Vercel's comment toolbar, which
   appears on preview deployments and not in production, and keeps the reviewed page's digest equal
   to the shipped bytes. The existing variant switcher stays inlined in the variants page (it never
   ships), and the overlay layers on top of it there.

## Sources

- Figma Make comments: https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make
- v0 Design Mode and versions: https://v0.app/docs/design-mode, https://v0.app/docs/versions
- Vercel comments: https://vercel.com/docs/comments
- Linear Inbox, Triage and Snooze: https://linear.app/docs/inbox, https://linear.app/docs/triage, https://linear.app/docs/snooze
- Cursor checkpoints: https://cursor.com/docs/agent/chat/checkpoints
- GitHub reviews and stale approvals: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request
