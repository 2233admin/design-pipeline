## Why

The component state gate (`checkInteractionStateCoverage` in `gate-core.cjs`) makes every entry
declare `long-content` and `overflow` and cite evidence, and `worst-case-content.md` lists the
fixtures that would produce it. Nothing measures them: the evidence is whatever string the agent
writes. A page built around its mock-up copy passes the `verify interaction` audit and breaks the
first time a real name, a German label or a long order id arrives (#240).

## What Changes

- The `verify interaction` audit probe accepts an optional `stress` field (`{}` or
  `{ "textScale": 2.5, "scope": [selectors] }`). After the normal audit at each viewport, the loaded
  page's visible text in scope is rewritten in place: lengthened `textScale` times (default 2.5),
  every fourth table-cell or list text replaced by one unbroken word, numbers set to 9,999,999. The
  page settles and the same in-page audit runs again.
- Only the audit's existing overflow codes are read from the stressed run
  (`audit.horizontal-overflow`, `audit.viewport-bounds`, `audit.content-clipping`,
  `audit.content-overflow`), and only items the normal audit did not already report become findings,
  marked `"pass": "stress"`, each with a fix. Clipped text that is a deliberate truncation (ellipsis
  or line clamp) passes when a `title`, link or `details` element reaches the full value and fails
  with a truncation fix otherwise.
- Each viewport's audit coverage gains `stress` (status, counts, per-code statuses and the states it
  is evidence for: `long-content`, `overflow`). Native completion requires it when the probe
  declares stress.
- `worst-case-content.md` explains how to cite the passing row as `long-content` and `overflow`
  evidence, and what the pass does not cover; `workflow-web.md` documents the field.

Not in scope: the reference's dead-control pass (clicking stateful controls) is about the `pressed`
state, not long content; the state matrix gate does not read or verify the evidence string.

## Capabilities

### Modified Capabilities

- `design-pipeline`: ADDED `Interaction audit stress pass measures long content`.

## Reuse

- The audit probe contract, `auditPage`, its overflow and clipping geometry, `summarizeAudit`, the
  gate record and lineage of `verify interaction`, and `auditResultFailure` for native completion.
- `APPLICABLE_STATES` ids `long-content` and `overflow`; no new state, gate, schema, code or CLI flag.

## Impact

- New `skill/scripts/interaction-stress.cjs`; small hooks in `interaction-audit.cjs` (probe key,
  validation, summary), `interaction-capture-core.cjs` (`recordAudit`) and `interaction-core.cjs`
  (summary option, native completion).
- An audit probe without `stress` captures, summarizes and completes exactly as before.
- Cost: one more in-page audit per viewport on the already loaded page, only when `stress` is declared.
