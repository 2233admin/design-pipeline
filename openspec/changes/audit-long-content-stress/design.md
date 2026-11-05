## Context

`verify interaction` audit probes already measure page-level horizontal overflow, elements outside
the viewport, text cut by `overflow: hidden`/`clip` containers and text escaping declared content
boxes. They measure the page as written, with its placeholder copy. The component state gate asks
for `long-content` and `overflow` evidence but cannot tell a measurement from a sentence.

Source idea: feimacode/open-design-agent-kit `packages/core/src/export/screenChecks.ts` at
`927d4b6e6a29d8bfebdccadb4bb4a1b2a6438e73` (MIT): rewrite the page's text 2.5x longer, put an
unbroken string in table cells, a huge number in numeric texts, compare scroll widths, report
truncation with no way back, and click stateful controls to find dead ones. Read only, never run;
the code here is ours.

## Decisions

1. **A field of the audit probe, not a new probe kind or gate.** `stress` lives on the existing
   `kind: "audit"` probe, so the page binding, the local-files-only rule, the external-request
   finding, the gate record, lineage and staleness all apply unchanged. The state matrix gate is not
   touched: the pass produces evidence that an entry cites.
2. **Measure with the audit, not with scrollWidth.** The stressed page is measured by the same
   `auditPage` function, and only `STRESS_CODES` (horizontal overflow, viewport bounds, content
   clipping, content overflow) are read from it. `scrollWidth > clientWidth` from the reference is
   what `audit.horizontal-overflow` already computes at page level; per element, the audit's clip and
   text-rect geometry is more exact and already excludes scroll regions, screen-reader-only text and
   off-screen drawers. Typography, contrast and spacing on stressed copy are not judged: the copy is
   synthetic.
3. **Only new breakage is reported.** A stressed item whose `code` and `selector` the normal audit
   already failed or left indeterminate at the same viewport is counted in `alreadyReported`, not
   repeated. Selectors are stable because the rewrite changes text node values only.
4. **Truncation is judged, not just clipped.** `worst-case-content.md` allows truncation with a way
   back. In the page, each stressed `audit.content-clipping` item is walked from the element up to
   its clipping element: `text-overflow: ellipsis` or a `-webkit-line-clamp` makes it a truncation.
   A way back is exactly one of: a `title` on the element itself whose trimmed, whitespace-collapsed
   text contains the element's full pre-stress text (read from the page's record of the rewrite); an
   enclosing `a[href]` whose href is not empty, `#` or `javascript:`; or an enclosing `details`. That
   item passes (`truncatedWithWayBack`). A stale title, a title on an ancestor, a titled descendant
   (`<abbr title>`) and `href="#"` do not count (review of #274); a truncation without a way back
   fails with a truncation-specific fix. The normal audit's clipping rule is unchanged.
5. **The rewrite.** Visible text nodes (two or more non-space characters) under `scope` (default
   `body`), skipping `script, style, noscript, template, svg, math, [aria-hidden="true"]`:
   numeric-only texts get their digit run replaced by `9,999,999` (`huge-number`); every fourth text
   inside `td, th, li, dd` or cell/listitem roles becomes a 59-letter word with no hyphen or space
   (`unbroken-string`; the reference's hyphenated string breaks at the hyphens); all others repeat
   their own words until `ceil(length × textScale)` (`long-text`, `long-translation`). Form values and
   placeholders are not text nodes and are left alone; recorded in the docs.
6. **Order and isolation.** The pass runs after the viewport's normal audit on the same load, then
   waits for fonts and two frames. The next viewport navigates fresh, so stress never leaks between
   viewports or into the normal audit. The page file is never written.
7. **`scope` is a fixture choice, not a waiver.** It selects which text is data-driven (authored brand
   copy does not grow at runtime). A scope selector that the page rejects or does not match is a
   probe contract error (exit 1, `AUDIT_SELECTOR_INVALID`), and the chosen scope is in the probe file
   the gate binds. There is no in-page opt-out attribute, matching the rule that no probe field
   skips a subtree of the audit itself.
8. **Nothing to lengthen is `not-applicable`.** When the scope holds no visible text, the stress
   coverage is `not-applicable` with a hint; it does not fail and does not claim a pass. Native
   completion rejects a `passed` stress record with zero changed texts.
9. **`textScale` bounds.** Above 1 (otherwise nothing grows) and at most 10 (a 10x page already
   exceeds any real translation and keeps the element count bounded by the audit's 5000 limit).
10. **A reverted rewrite fails the pass.** A page whose MutationObserver or framework re-render
    puts its own text back would let the stressed audit measure the original copy and pass. The
    rewrite keeps each node and its stress value on the page; after the stressed audit and the
    truncation classification, every node must still be connected and hold that value. The count is
    `reverted`; any reverted text fails the stress coverage with a `stress-reverted` finding whose fix
    is to point `scope` at a region the page does not re-render or to disable re-rendering in the
    fixture. Native completion rejects a passed record with `reverted` above 0.
11. **Blind spots are counted, not hidden.** Text the rewrite cannot reach is counted per viewport
    in `skipped`: elements in scope with an open `shadowRoot`, `input`/`textarea`/`select` with a
    value or placeholder, elements with string `::before`/`::after` content, and non-empty SVG text
    elements. They are not rewritten; `worst-case-content.md` lists them with the CJK limit (the
    repeat inserts spaces, so unspaced CJK breaking and `keep-all` are not exercised).
12. **Dead controls are out of scope.** The reference's click pass tests whether stateful ARIA
    controls respond; that evidences `pressed`/`focus`, not long content, and #252 is extending the
    audit's state checks. Left for a separate issue.

## File ownership and compatibility

- New `skill/scripts/interaction-stress.cjs` owns the contract helper, the two in-page functions,
  the per-viewport stress summary and the completion check; listed in `package-resources.json`.
- `interaction-audit.cjs`: `stress` added to `PROBE_KEYS`, one validation call, and an optional
  `options.stress` on `summarizeAudit` (default off: existing callers and captures are unaffected).
- `interaction-capture-core.cjs`: `recordAudit` calls `recordStress` after the audit when the probe
  declares stress. Open PR #252 also edits `recordAudit` (reduced-motion load and state passes) and
  changes the in-page call to `auditPage(options, pass)` built by `auditPass()`. Main has no pass
  helper yet, so this change calls `auditPage(options)`; #274 merges after #252 and, on rebase,
  `recordStress` calls the audit through `auditPass("audit", …)` with the reducedMotion field #252
  passes, the stress call stays last in the viewport loop (after the reduced-motion load and the
  state passes, because it rewrites the page), and the `coverage.push` line in `summarizeAudit`
  keeps both #252's fields and `stress`.
- `interaction-core.cjs`: `evaluateAudit` passes the probe's stress flag; `auditResultFailure`
  requires settled stress coverage when declared.
- No CLI flag, schema, state id or audit code is added. Captures from before this change have no
  `stress` and their probes have no `stress` field, so nothing migrates.

## Measured on the fixtures (headless Chromium, 1280x800 and 390x844)

- `tests/fixtures/ui-stress/fragile.html` passes the normal audit. With stress (9 texts lengthened,
  3 unbroken, 1 number) it fails 7 items at 1280 and 8 at 390: page sideways scroll 142px and 728px,
  the order table outside the viewport, two fixed-width names clipped (316.58px, 124.67px), two
  ellipses with no title reported as truncation, a fixed-width button clipped 29.03px, and at 390
  only a two-line clamp cut 22px with no way back (at 640px wide the 2.5x note still fits).
- `robust.html` (wrapping names and cells, `min-width: 0`, titled ellipses, the clamp on a link, a
  button that grows) passes both audits; 2 reachable truncations at 1280 and 3 at 390.
- `scope: ["table"]` rewrites only the table (3 lengthened, 2 unbroken, 1 number) and reports only
  the page overflow and the table bounds at 390px.
- `tests/interaction-stress.test.cjs` (four browser runs, three CLI runs) takes about 15 s.
