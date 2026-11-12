# Toast and Notification

How a product tells a person that something happened, and which of five answers each message gets:
a status toast, an action toast, a progress toast, a notification, or none of these. The work is
judgment first: read the product, diagnose, recommend, and change only what the owner approves.
Restyling is a second, optional step ([section 4](#4-optional-restyle-the-toast-and-the-notifications)).

`designer-pipeline route` selects the `toast-notification` job for a toast, snackbar,
notification, reminder, unread badge, undo prompt or progress prompt. The method and the values in
section 4 are kubai's design ([Provenance](#provenance)); the wording, the conflict table and the
hand-off are this repository's. No section adds a gate, a receipt or a CLI command.

This is a change to the owner's product, not a demo. Work in their code, on their stack, with their
components, tokens, corner scale, fonts and copy style. Add no dependency, state library or new
visual pattern without asking. Every value in this guide is a default to start from, not a mandate.

## Authority

1. The owner's decisions, project `DESIGN.md` and `MOTION.md`, tokens and existing components.
2. The package rules that stay in force: [UC-06, UC-10, UC-19, UC-22, UC-29 and UC-39](ui-craft-sources.md#review-checklist),
   [TR-05, TR-06, TR-08 and TR-09](ui-transition-rules.md#individually-referenceable-rules), the
   resolved conflicts in [UI craft precedence](ui-craft-sources.md#precedence) and the
   [motion gate](animation-opportunity-and-review.md).
3. This guide.

A kubai value that conflicts with 1 or 2 is replaced by the governing value and recorded as not
applicable with that source named, not as a finding
([Where the package wins](#where-the-package-wins)).

## 0. Read the product first

Find every place that shows a message about an event: toasts and snackbars, alerts and banners,
notification lists, inbox or activity panels, badges and counts, inline success and error text, and
browser or push notifications. For each one note:

- what triggers it: the person's own action, another person, the system, a background job;
- what it says and any buttons;
- where it appears, how long it stays, and whether it can be found again later.

Find the components behind them and where they are mounted (one per page or one for the whole app),
and how they announce themselves to screen readers. A toast or notification component the project
already has is the one to use (UC-37). For a library, run
`designer-pipeline design-system route --query "toast notification" --platform web`.

Tell the owner in a few lines what you found before going on.

## 1. What each one is for

**Toast.** Answers something the person just did, in the place they are working. Short, does not
interrupt, goes away by itself. Three kinds:

- **Status** confirms a result so the person does not have to go and check. An icon and a few
  words, no buttons. "Link copied".
- **Action**: the action is already done, and the toast holds the one step that may follow, usually
  Undo. One line, one button and a close; it stays long enough to use the button, with the time left
  shown.
- **Progress**: work that takes a moment. It shows the work is under way, then turns into the
  result in the same place, with a button to see it. "Uploading brand-guide.pdf" turns into
  "Uploaded to Files, Open".

**Notification.** News the person did not cause just now, from other people or the system: a
mention, a reply, a payment, a deadline, a security alert, a finished report. It can carry a title,
a few lines and up to two actions. It shows on every page, stays until it is opened, handled or
closed, and several can show at once. It is also kept where the person can find it again (an inbox
or a list behind a bell, with a count).

**Neither.**

- A form error or a problem with one field: show it next to the field (UC-12).
- A failure the person has to fix (an upload that failed, a payment that did not go through): keep
  it on the item, with a way to fix it, until it is fixed. A toast that disappears is not enough.
- An action that cannot be undone: ask before doing it, with a confirm next to the button or a
  dialog for a large impact (UC-16). A toast after the fact is too late.
- Something only worth seeing when the person looks: a badge, a dot or a change of state in place,
  with no message at all.

## 2. Questions that settle a case

Check the "neither" cases first, then ask in this order; the first question that settles it wins.

| Question | Answer and result |
| --- | --- |
| Who caused it? | The person, just now: toast. Someone else, the system, or the person a while ago in another place: notification. |
| Does the person need to act? | No: status toast. One quick step may follow (Undo, View): action toast. A real decision or a reply: notification. Something that must be fixed: keep it on the item. |
| Can the action be undone? | Yes: do it at once and offer Undo in a toast instead of asking first. No: confirm before, not after. |
| How much is there to say? | A few words: toast. A sentence or two, a name, an amount, a place: notification. |
| Would it matter if the person missed it? | No: toast. Yes: notification, kept until handled. |
| Is the work still running when the person leaves? | It ends while they are on the page: a toast is enough. They moved to another tab or app: a browser or system notification (with permission) is the only way to reach them, and inside the product it also goes into the notification list. |
| Several at once? | Toasts: one at a time; a new one replaces the old one (TR-06) or waits. Notifications: they stack. |

Work that finishes within about 400 ms gets its result toast only; a progress toast for it would
flash ([waiting](interface-defaults.md#waiting)).

## 3. Report before changing anything

Give the owner a table first and change no code. One row per message:

| Column | Holds |
| --- | --- |
| Where | The screen or component, and what triggers it. |
| Now | How it is shown today, in a few words. |
| Should be | Status toast, action toast, progress toast, notification, or neither (and which). |
| Why | One line, using the questions in section 2. |
| Change | What would change: kind, wording, buttons, how long it stays, where it is kept. |

- Mark the rows that are already right.
- Mark the rows that could go either way and put what decides between them as a question for the
  owner.
- List what is missing: an action that should offer Undo, a failure that only shows a toast, a
  background job that never says it is done, news with no place to find it again.
- Ask which rows to change, and wait.

## 4. Optional: restyle the toast and the notifications

After the table, offer a separate choice and wait for the answer:

| Option | Meaning |
| --- | --- |
| A | Restyle the toast only. |
| B | Restyle the notifications only. |
| C | Both. |
| D | Neither; just fix the kinds and wording. |

For each part the owner picks, show a short before and after (values and motion) in the product's
own colours and corners, and wait for the go-ahead before building. Sizes are CSS pixels.

Rows of 4A and 4B that conflict with a package rule are replaced by the value in [Where the package
wins](#where-the-package-wins). kubai's colours are for a light neutral product. Take surface, border, accent and shadow from the
project's tokens; the hexadecimal values are the starting point only when no token exists. Radii
follow the rule of the [UI craft precedence](ui-craft-sources.md#precedence): an inner radius is the
outer radius minus the inset, and `DESIGN.md` radius tokens fix the inner radius the outer derives
from, so snap to the nearest step of the project's corner scale.

### 4A. Toast

| Part | Default |
| --- | --- |
| Place | Top centre of the page, 12 under the top bar, over the content. One at a time. |
| Shape | 40 tall, 16 corners (or the nearest step in the corner scale). |
| Surface | White with a soft top-to-bottom gradient (`#ffffff` to `#f7f9fc`), a 1px border `rgba(214, 219, 227, 0.95)` and a soft shadow `0 16px 36px rgba(17, 24, 39, 0.08), 0 3px 10px rgba(17, 24, 39, 0.05)`. |
| Inner shapes | Concentric with the toast. Icon: 24 with 8 corners, 8 in. Button or close: 28 with 10 corners, 6 in. |
| Content | Icon, then one line of 14/20 text, then the button and the close if any. 8 between icon and text; the button and the close sit next to each other. |
| Icons | Done: a check on a soft tile in the accent colour. Work in progress: a ring. Time left to undo: a ring that empties, with the seconds in its centre. |
| Button | Accent-coloured text, with a tint only on hover. |
| Enter | 500 ms on `cubic-bezier(0.25, 0.1, 0.25, 1)`: the whole toast comes down from 10px above, grows from 96% and clears from an 8px blur, fully opaque a little before the end. Text and controls move with it as one piece, not letter by letter. |
| Leave | 220 ms, ease-in: up 6px, blur 6px, fade out. |
| Sheen | A light band crosses once (900 ms, ease-out) only when something is done: a status toast as it enters, a progress toast as it turns into its result, an Undo toast after Undo. An action toast still waiting for a choice enters without it. |
| Change in place | Progress to result, archived to restored: the old line (text, button and close together) blurs out and moves 5px up in 180 ms; the new line blurs in from 5px below between 100 and 400 ms; the toast takes its new width in 380 ms on `cubic-bezier(0.32, 0.72, 0, 1)`. Only the icon moves on its own: the old one shrinks and blurs away while the new one turns in from -40 degrees and half size. |
| After Undo | The change is reverted and the toast says so ("Task restored") for about 1.5 seconds before it leaves. |
| Timing | Status: 3 to 5 seconds, longer for longer text. Action: at least 5 seconds. Progress: while the work runs, then 3 seconds. The timer pauses while the pointer is over the toast or focus is inside it. |

### 4B. Notifications

| Part | Default |
| --- | --- |
| Place | Top right, 12 under the top bar, the same on every page, above the content. 344 wide. |
| Card | 24 corners, 12 padding, so the picture (32, a person's photo or the product's logo) and the buttons (32 tall, 12 corners) are concentric with it. Title (14/20, semibold) with the time on the right, up to three lines of 13/20 text, then up to two buttons at the bottom right, the main one last. |
| Stack | The newest in front. Older cards are cut to the front card's height and peek out 12 below it, at 95% and 90%, showing only their edge; at most three show. |
| Arrival | Slides down onto the stack from 56px above in 560 ms on `cubic-bezier(0.32, 0.72, 0, 1)`, clearing from a light blur, while the others are pushed down and back a step. The card it covers keeps its content until the new one is on its way over it, so it reads as stacking, not replacing. |
| Hover | The stack spreads into a list at the cards' own heights, 8 apart, in 380 ms on the same curve. In the list each card keeps a hairline and a light shadow, so no shadow falls on the card below; stacked, only the front card has the deep shadow. |
| Close one | As on macOS: a small close button (24, 10 corners) appears over a card's top-left corner while the pointer is on that card. Handling a card with one of its buttons also removes it. A removed card slides 48px right and fades in 260 ms; the ones below close the gap in 400 ms. "Clear all" sits under the last card while the list is spread. |
| Counts | The bell shows how many are waiting, and so does the page title, so a background tab shows it too. Notifications that need a decision (security, payments) stay in the list behind the bell even when cleared from the screen. |

### 4C. For both

- **Reduced motion.** Keep the change of state and a short fade (about 150 ms); drop movement,
  scaling, blur and the sheen. The countdown ring may step once a second instead of sweeping.
- **Screen readers.** Toasts are announced politely (`role="status"`); a notification that needs
  attention is announced once as it arrives. Neither takes focus from what the person is doing.
  Their buttons are reachable by keyboard and Escape closes the one in focus.
- **Touch.** The same places, with swipe to dismiss. There is no hover, so the stack spreads on tap.
- **Dark mode.** The same rules on the project's dark surfaces; the sheen is fainter.

## 5. Build what the owner picks

1. List the files you will touch and wait for the go-ahead.
2. Change one thing at a time and keep what each action does.
3. Check: short and long text, a missing picture, many notifications at once, several toasts in a
   row; Undo used, ignored and closed; a progress that fails; leaving the page while something
   still runs; phone and desktop, light and dark, reduced motion, keyboard and screen reader; and
   that the project's existing tests still pass.

On the web, use CSS transitions or the Web Animations API for the toast. For the stack, measure each
card's height and animate transform and height together. Sonner (React) has a similar stack and can
be adapted, but ask before adding it. On iOS, Android and Flutter use the platform's own animation
tools with the same values; for messages that reach people outside the app, use the system's
notifications.

## Where the package wins

Each row is a kubai default that conflicts with a rule the package already holds. Use the right-hand
value; the review records the kubai value as not applicable with the rule named.

| kubai default | Governing rule | Use |
| --- | --- | --- |
| Status toast stays 3 to 5 seconds | UC-19: timed toasts last 5 seconds or more and pause on hover or focus | 5 seconds, longer for longer text. Pausing on hover and focus is the same in both. |
| Action toast with a countdown, at least 5 seconds | UC-19: a toast with an action or an error stays until dismissed, and a toast is never the only carrier of undo | If the change can also be undone elsewhere (restore from Archive, Trash or history), a timed toast with a countdown of at least 5 seconds is allowed because it is not the only carrier. If the toast holds the only Undo, it stays until dismissed, or the answer is "neither" and the action is confirmed first. |
| A progress that fails ends as a toast | UC-19 and section 1 | The failure stays on the item with its fix, not in a timed toast. |
| Leave: ease-in, 220 ms | [Precedence](ui-craft-sources.md#precedence): use the project's exit token, else ease-out, never ease-in; UC-03: exits are faster than entrances | The project's exit token. Without one, ease-out at 220 ms or less. |
| Enter 500 ms, stack arrival 560 ms, sheen 900 ms | Precedence "Duration": user-initiated UI motion finishes under 300 ms; longer motion states why | A message arrives beside the person's work, blocks no input (UC-04), and the action that caused it has already answered in place, so 500 and 560 stand with a one-line reason in `motion.md`. The sheen is decoration: 900 ms stands only because reduced motion drops it. Prefer the project's duration tokens (TR-05). |
| Hover spread 380 ms, in-place width 380 ms, close and reflow 260 and 400 ms | The same Duration rule: these answer the person's input | The project's duration token; without one, 300 ms or less. Keep the kubai value only with a reason recorded in `motion.md`. |
| The stack spreads on hover | TR-08: a hover-only stack makes actions unreachable | Spread on hover, on focus inside the stack, and on tap. Keep every card's buttons reachable by keyboard while stacked. |
| A new toast replaces the old one, or waits | TR-06: the newest accepted state wins, with no queue of obsolete requests; UC-19 | Replace. Do not queue stale toasts. A replaced action toast must still have its action reachable elsewhere. |
| 1px border beside a shadow | [Ring first, border second](interface-defaults.md#surfaces); UC-22 | The border is the first `box-shadow` layer with `border: 1px solid transparent`; shadows come from the project's elevation token. |
| "Uploading brand-guide.pdf" | UC-39: in-progress copy ends with an ellipsis | "Uploading brand-guide.pdf…". |
| Z-order of toasts and the notification stack | UC-29 | Take a named stacking token; no ad hoc numbers. |
| Top-centre toast and top-right stack on a phone | [mobile-web.md](mobile-web.md) | Pad for the safe area under the notch. |

These kubai details already agree with the package and need no change: the toast grows from 96%
(UC-05: scale entrances start at 0.9 or more); the icon turns in from half size (swapped icons in
[motion details](interface-defaults.md#motion-details-not-in-the-motion-rules) start from about
0.25); toasts never take focus (UC-10); `role="status"` in a region that exists empty before its
text changes ([announce updates](interface-defaults.md#forms-and-feedback)); swipe to dismiss with a
button path (the same section: flicks dismiss, every gesture also has a button or key path); blur
stays under 20px and a short-lived small element is cheap (TR-10, measure on the target device);
reduced motion keeps state and drops movement (UC-06, TR-09).

Also keep: the close button has an accessible name; the countdown seconds are decorative and hidden
from assistive technology; buttons start with a verb (UC-14); a badge or dot carries text or a count
for screen readers, and colour is never its only cue (UC-20).

## Hand-off

- Write the section 3 table and the owner's answers under the existing review record in `qa.md`,
  under Component Conformance. What the owner thinks of the look is Visual Acceptance and is
  recorded only by the owner.
- If a restyle is built, record the decision in `motion.md` using the [motion
  vocabulary](motion-vocabulary.md) term ids: `orchestration` for the toast entering as one piece (the
  anti-pattern is `layered-entry`), `blur`, `crossfade`, `layout-animation` for the stack spread and
  the gap closing, `swipe-to-dismiss`, `interruptible-animation` for a toast replaced mid-flight,
  and `reduced-motion` for the substitute. Fill the Interaction Inventory of
  [motion-spec.md](motion-spec.md#interaction-inventory) and the
  [reduced-motion section](motion-spec.md#accessibility-and-reduced-motion).
- Evidence is the project's own run: `designer-pipeline verify interaction` for the rendered
  states and `audit.reduced-motion` for the substitute ([ui-craft-sources.md](ui-craft-sources.md)).
  A passing run is Component Conformance, not Visual Acceptance.
- A surface that is first "too loud" or "too much" is [polish, distill or
  quieter](refine-intents.md) work; an AI surface that streams or needs caveats also reads
  [ai-interaction-patterns.md](ai-interaction-patterns.md).

## Provenance

- **Source: kubai's design.** The owner supplied a prompt on 2026-11-12 and said it is kubai's
  design ("这个是 kubai 设计"). This guide restates it. Sections 0 to 3 are rewritten in this
  repository's words; the numbers and motion of section 4 are kept because they are the
  specification.
- **What is bundled.** No upstream repository, revision, licence file, asset or component code.
  `sources.lock.json` follows upstream git repositories, and this source has none, so it has no
  lock entry. `THIRD_PARTY_NOTICES.md` records the credit.
- **Package additions.** The authority order, the conflict table, the 400 ms rule, the focus and
  keyboard spread, the ellipsis, the component-first reading in section 0 and the hand-off are this
  repository's, not kubai's.
