## Context

`skill/scripts/interaction-audit.cjs` holds the probe contract, the in-page `auditPage` function and the
summary; `skill/scripts/interaction-capture-core.cjs` drives puppeteer-core. `auditPage` is shipped to the
page as source text, so it stays self-contained. Each audit row must report exactly the codes of
`AUDIT_CODES`, and `auditResultFailure` re-reads every check at native completion.

## Decisions

1. **Codes, not a new gate.** The five codes extend `AUDIT_CODES` (appended, so existing indices and
   order hold). The summary, native completion, evidence and lineage need no change.

2. **Required or optional.**
   - `audit.line-length`, `audit.line-height`: optional, declared with `declare.bodyText`. Running text
     is a role only the author knows; inferring it would judge labels, captions, table cells, hero
     lines and code, and would fail pages that pass today for text that is not running text.
   - `audit.heading-levels`: required. It is structural, needs no threshold or selector, has no
     false-positive class we know of (screen-reader-only headings count, `hidden`, `display: none` and
     `aria-hidden` ones do not) and the fix is a tag change.
   - `audit.reduced-motion`: required. The component state gate already requires every interactive
     entry to declare reduced-motion behavior and the anti-slop rule is hard; this measures a promise
     every project already makes. It needs no selector, and a page without motion passes.
   - `audit.state-contrast`: required. Every page with controls has states; a missing focus
     indicator fails WCAG 2.4.7 whatever the design, and a state's text is held to the floors the
     resting text already meets.
   The CHANGELOG states that the three required codes can fail pages that passed before.

3. **Passes.** `auditPage(options, pass)` takes a pass object built by `auditPass(kind, extra)`, which
   also carries the control selector, so the page and the driver's DOM query share one string. Per
   viewport the driver runs: `reduced-motion` on a load with `prefers-reduced-motion: reduce`
   (emulated before navigation, read after the fonts, two frames and `REDUCED_MOTION_SETTLE_MS` =
   1000 ms); `audit` on a fresh load with `no-preference`, read after the same 1000 ms so script
   timers (a preloader, a toast, a rotator) stand at the same point in both loads, with the reduce
   snapshot; then `rest` and one `state` pass per state. The full audit emits
   `audit.state-contrast` as `null`; the driver replaces it with `combineStateChecks` of the state
   passes, and a summary that still finds `null` rejects the row as incomplete.

4. **Reading.** Lines are the text-node client rects of each declared block grouped by vertical
   overlap; the widest line is divided by 1ch, the advance of `0` in the block's own font (ten zeros
   measured in an off-screen probe span with the block's font properties). Line-height is the
   computed value over the font size; `normal` is half the height of a two-line probe. Tolerances:
   0.1ch and 0.005. Headings: `h1`-`h6` and `role="heading"` in document order, `aria-level` first.

5. **Reduced motion.** Content is an element with its own non-blank text node or a replaced element
   (`img`, `svg`, `video`, `canvas`, `iframe`, `object`, `embed`), not decorative and not clipped
   screen-reader text. Hidden means opacity 0 on it or an ancestor, a `visibility` other than
   `visible`, or every rect outside the page, outside its clipping ancestors or under 1px (the cause
   is the transform on it or an ancestor when there is one, else the clipping ancestor). `display: none` is not counted: removing an element is a choice.
   The reduce pass lists hidden content with its cause; the full audit fails a cause when one of its
   elements is visible and not hidden by the same test without the preference (so a closed menu or a
   carousel slide out of its frame, hidden in both, is not a loss), once per cause with a count.
   Motion: `document.getAnimations()` still `running` one second after load on a visible target, whose
   animated properties (keyframe keys, or the transition's property) include one outside the
   opacity and color set. Animations on or inside `role="status"`, `role="progressbar"`,
   `role="alert"` or `aria-busy="true"` are essential motion (WCAG 2.3.3: spinners, progress bars,
   skeletons in a busy region) and exempt; an auto-advancing carousel announces no such role and is
   still judged. The finding names the CSS animation, transition or script animation and whether it
   loops or how long it has left. The fix for lost content says to skip the entrance and show the
   final state the animation ends in, never to force an element visible: a preloader or a dismissed
   toast ends hidden.

6. **States.** Forced through a CDP session: `DOM.querySelectorAll` with the control selector, then
   `CSS.forcePseudoState` on every match at once; `:hover`, then `:focus` + `:focus-visible`.
   `:active` is not forced: it lasts only as long as a press, and an unstyled link's `:active` is the
   browser's activelink red (`#ff0000`, 3.99:1 on white), so every plain link would fail for a color
   no page chose. After forcing and after clearing, every
   finite animation is finished (`Animation.finish()`), so a state is read at rest. The `rest` pass
   records each control's focus styles and, for each text in a control, a key of colors only: its
   text color and the computed background color of it and every ancestor. A state pass measures only
   text whose key changed, so a hover that only filters, fades, lifts or scales is not measured again (so a resting failure is reported
   once, by `audit.text-contrast`) with the same `measureContrast`, recorded under
   `audit.state-contrast` with the state named. Focus indicator, per focusable control
   (`tabIndex >= 0`, not disabled), against its resting styles: a changed outline (`outline-style:
   auto`, the browser's two-tone ring, passes; otherwise its color against the background inside or
   outside the control, by offset), a new box-shadow layer (inset against the control, outer against
   what is behind it), a changed border (against what is behind), or a background change (new against
   resting). Translucent colors are composited over that background. No indicator fails; the best
   below `contrastFocus` fails. A state whose contrast cannot be measured (a filter, translucency or
   a gradient on a changed color, or a focus indicator over such a surface) is listed under
   `notMeasured` in the check's coverage and does not fail the required check: the resting audit
   already judged that surface, and failing a hover for its `filter: brightness()` would fail common
   pages for nothing measurable. The 3:1 indicator rule stays strict: stock Tailwind
   `ring-blue-500/50` (1.84:1 on white) and Bootstrap 5's form focus (`#86b7fe`, 2.05:1) fail.

## Sources

Our own code; no upstream text is copied. Rules and approach read at:

- Nutlope/hallmark `4f6a46c6dc325d40ab268c93e25c7b96676ebccd`, `skills/hallmark/scripts/sloplint-render.mjs`
  (running-prose measure and leading; MIT, Copyright (c) 2026 Hallmark contributors).
- pbakaus/impeccable `9fadc41729c38fd47d7ae622b501558653f9d2e9`, rules `line-length`, `tight-leading`
  (1.3 floor) and `skipped-heading` (Apache-2.0).
- plugin87/ux-ui-agent-skills `def84a70fadc3490d80901295a4f1951fdb2cc69`,
  `scripts/verify_reduced_motion.mjs` (two renderings, parity loss, motion still running) and
  `scripts/verify_states.mjs` (contrast per state, 3:1 for non-text; MIT, Copyright (c) 2026
  Thientan Soparat).

Differences: states are forced with CDP rather than by focusing one element at a time; only text a
state changes is measured again; the browser ring counts as an indicator; a page without a reduce
media query is not failed for that alone, only for what the reduce rendering measurably loses or
keeps moving.

## Relation to `measure-reduced-motion`

That open change (not implemented) adds a reduce pass to `composition capture` with pixel sampling,
judged by `verify composition`. This change measures the web page inside `verify interaction`, the
gate a web project already passes; it does not touch the composition path. To keep one definition of
"still moving", this PR amends that change's proposal, design, spec and tasks: its animation
inventory and moving test reuse `audit.reduced-motion`'s (running Web Animations one second after
load whose properties go beyond opacity and color, loading indicators exempt), taken from
`interaction-audit.cjs` rather than written again; only its pixel-change sampling and artifact stay
its own.

## Risks

- Motion driven by `requestAnimationFrame` without Web Animations is not seen by
  `getAnimations()`; UC-06 keeps it as a review item.
- Content revealed after the one-second read, or only on scroll, is compared as hidden in both
  renderings and not flagged.
- Forcing a state on every control at once can let one control's state style another's; per-element
  forcing would multiply the passes by the number of controls.
