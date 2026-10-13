# Design: Audit Rendered UI Craft

## Audit Probe

An audit probe is one entry in the existing `probes` array of `design-pipeline.interaction-probe.v1`,
distinguished by `"kind": "audit"`. Motion and journey probes keep their current shape and behavior.

```json
{
  "id": "page-audit",
  "kind": "audit",
  "viewports": [{ "width": 1280, "height": 800 }, { "width": 390, "height": 844 }],
  "thresholds": { "fonts": ["Inter", "system-ui"], "fontSizes": [12, 14, 16, 20, 24, 32, 48] },
  "declare": {
    "numbers": [".price"],
    "stacks": [".card-list"],
    "controlContainers": [".toolbar"],
    "alignGroups": [{ "selector": ".hero", "items": ".hero > *", "edge": "start" }],
    "radiusPairs": [{ "outer": ".card", "inner": ".card > img" }],
    "contentBoxes": [".card"]
  }
}
```

- `viewports` defaults to the probe file's viewport. Each viewport is measured after a resize, after
  `document.fonts.ready` and two animation frames.
- `thresholds` overrides the defaults below; `thresholds.fonts` is required because every page has
  text and `DESIGN.md` names its families. Lists replace defaults; they are not merged.
- `declare` holds selectors instead of lintapple's `data-ui-*` markers, so delivered markup does not
  carry audit attributes.
- There is no exclusion or waiver field. A probe cannot skip a subtree, suppress a finding or mark
  a check as passed; unresolved results are fixed in the page, not in the probe. Embedded frames are
  separate documents and are not audited.
- Validation rejects an unknown field, a missing `thresholds.fonts`, an empty selector, a
  non-positive threshold and a duplicate viewport before any browser starts, like other
  probe-contract errors. A selector the page itself rejects is a contract error (exit 1) and records
  no gate pass.

## Checks

| Code | Measurement | Default | Inputs |
| --- | --- | --- | --- |
| `audit.font-family` | First computed family of visible text (code elements excluded) is in `fonts` | none | `thresholds.fonts` (required) |
| `audit.font-loading` | No `document.fonts` face has `status: "error"` | none | none |
| `audit.font-size` | Visible text and generated text are at least `minFontPx`; when `fontSizes` is declared, sizes are on that scale within 0.1 px | `minFontPx` 12 | `thresholds.minFontPx`, `thresholds.fontSizes` |
| `audit.tabular-numbers` | Declared numbers and inferred numeric table cells render the digits 0-9 at equal advance width within 0.5 px | none | `declare.numbers` |
| `audit.numeric-alignment` | Inferred numeric table cells align to the end edge | none | none |
| `audit.text-contrast` | WCAG 2 ratio over a resolved solid background: 4.5:1, or 3:1 for text at least 24 px or bold and at least 18.67 px. Generated `::before`/`::after` text is measured over its own background when it paints one, otherwise over the background behind its box: the element's box in flow, or the inset box of an absolute pseudo-element of a positioned element. Text over gradients, images, translucent backgrounds, shadows or overlapping paint, text under opacity, a filter or a blend mode on its element or any ancestor, and generated text that cannot be placed, is `indeterminate`, with the fix "put the text on a measurable solid surface or scrim" | 4.5 / 3 | `thresholds.contrastNormal`, `thresholds.contrastLarge` |
| `audit.root-background` | The root has an opaque background color | none | none |
| `audit.horizontal-overflow` | The document is no wider than the viewport by more than 1 px | 1 px | none |
| `audit.viewport-bounds` | Visible boxes and text stay inside the viewport horizontally; overlays also vertically; clip and scroll ancestors respected | 1 px | none |
| `audit.content-clipping` | Text is not cut by an `overflow: hidden` or `clip` ancestor without an inner scroller | 1 px | none |
| `audit.content-overflow` | Text stays inside each declared content box unless it scrolls | 1 px | `declare.contentBoxes` |
| `audit.target-size` | Each control's hit area (its box widened by an absolutely positioned `::before` or `::after`) is at least `minTargetPx` in each dimension; an inline link is exempt only beside visible text in its own inline formatting context, not text in block-level descendants of its block or text that is not displayed, invisible, transparent or clipped away (text hidden only from assistive technology is still painted on the line and counts) | 24 px | `thresholds.minTargetPx` |
| `audit.control-gap` | The hit areas of controls in one group are separated by at least `minControlGapPx` edge to edge, diagonally when they share neither axis, and do not overlap | 8 px | `thresholds.minControlGapPx` |
| `audit.control-inset` | Controls inside declared containers keep `minControlInsetPx` from each padding edge | 8 px | `declare.controlContainers` |
| `audit.layout-gap` | Visible children of declared stacks are separated by at least `minLayoutGapPx` edge to edge, diagonally when they share neither axis | 8 px | `declare.stacks` |
| `audit.layout-alignment` | Items of a declared group share the start, center or end edge within 1 px | 1 px | `declare.alignGroups` |
| `audit.nested-radius` | Inner radius equals `max(0, outer radius - inset)` within 1 px for even insets | 1 px | `declare.radiusPairs` |

The checks adapt lintapple `src/audit.js` and `src/visibility.js`. The rebased defaults are the
24 px target floor (WCAG 2.2 2.5.8) instead of lintapple's 15 px control size and measured digit
widths instead of a computed-style flag. lintapple's `copy` rule and every axe-backed rule are not
ported.

Every check reports `passed`, `failed`, `not-declared`, `not-applicable` (no visible element in
scope) or `indeterminate`, with a `checked` count; `checked: 0` is never `passed`.

- Required checks are every always-on code plus `audit.font-family`. They pass only as `passed` or
  `not-applicable`; `failed` and `indeterminate` fail the audit.
- Optional checks need selectors: `audit.tabular-numbers` (`numbers`, or inferred numeric cells),
  `audit.content-overflow`, `audit.control-inset`, `audit.layout-gap`, `audit.layout-alignment` and
  `audit.nested-radius`. Without declarations they report `not-declared`, which is listed in the
  coverage and the review but never counted as passed. Once declared they are judged like required
  checks, and a declared selector that matches no element in the document is a failed finding.
- The audit passes only when no check fails or is `indeterminate` at any viewport. Pixel sampling
  of non-solid backgrounds is deferred to a later change.

## Execution and Findings

`skill/scripts/interaction-audit.cjs` exports one self-contained in-page function plus code
constants and option normalization. The kernel passes it to `page.evaluate` with plain JSON options,
so it works with the existing puppeteer path and needs no handles, bundler or dependency. Contrast
math follows WCAG 2 relative luminance as in `composition-core.cjs` and is inlined in the page
function.

A failed check yields error findings with `code`, `selector`, `expected`, `actual`, `message` and
`fix`, plus the viewport; each `indeterminate` item yields an error finding with the scrim fix.
Findings flow through the existing `verify interaction` report and gate, so a failing audit is a
gate failure (exit 2). The report's audit coverage lists every check's status and counts per
viewport, including `not-declared` optional checks. Navigation and browser failures keep the
existing verify behavior. Native visual tasks gain an audit branch in `interactionResultFailure` so
audit rows are not judged by motion-sample rules.

## Web Workflow

The web `probe` stage requires at least one audit probe at every tier. When `interaction.json` is
missing, `next` asks for interaction probes plus one audit probe. When it exists without an audit
probe, `next` returns an instruction to add one instead of the verify command, so the stage cannot
finish. Every emitted command keeps `--root` and `--project-root`. `verify interaction` already
accepts `--project-root`; it now names the workflow project whose gate is recorded, defaults to the
probe file's directory as before, and must contain the probe file.

## Gate Lineage

When `verify interaction` records the `interaction` gate, it also records `lineage`:

- `files`: the hash of every local file the page loaded during verification (stylesheets, scripts,
  fonts, images, data) under the project root, collected from the browser's request log;
- `tokens`: the hash of `DESIGN.md` and `MOTION.md` at the project root when present;
- `absent`: local files the page requested that did not exist;
- `remote`: the sorted remote URLs, recorded but never fetched or hashed.

An audited page must be bindable. A probe file with an audit probe must point at a local page
inside the project; an `http(s)` page is a contract error before the browser starts (exit 1, no
gate). Every resource the audited page requests at any viewport, including failed requests, is
classified from the browser's request log: a local file inside the project is hashed, and an
inline `data:` or `blob:` resource is part of the page. Anything else, a CDN or dev-server URL or a
file outside the project, fails the audit through the verifier's existing `external-request`
finding (exit 2): one finding per audit probe that lists each URL once, with the fix to copy the
resource into the project and reference it locally. Motion and journey probes already raise that
finding for requests outside the page origin; an audit's boundary is the project, so it also
covers outside-project files, which share the `file:` origin. No new finding code is added for it.
The same bound holds for motion and journey probes on a local page: a file outside the project that
a probe's own recording requested fails that probe with `external-request` and the fix to copy it
into the project, since the gate could neither hash it nor see it change. A probe's log runs from
its start to its return, and the next probe starts before the page can deliver another request, so
the probe logs cover the run log; an audit probe judges its whole log, including loads while the
viewport is restored. Every request the gate's lineage reads was therefore judged by a probe. An
audited pass records an empty `remote` list. Probe files without audit probes keep their current
URL behavior for remote URLs and keep recording them without hashing them.

A report destination the page loaded is refused before anything is written, since writing the
report would replace the bytes the page was measured with before the gate binds them. `verify
interaction` exits 1 with `OUTPUT_COLLISION` and writes no report and no gate; native completion,
which shares that observation, stops as `blocked` without writing its checks or failure state.

`gateStatus` treats an `interaction` record as stale when its lineage is missing (records written
before this change), when any recorded hash differs, when an `absent` file now exists, or when
`DESIGN.md` or `MOTION.md` now exists but was not recorded. Review and delivery acceptance already
depend on the gate's hashes, so a stale gate reopens `probe`, `review` and `deliver`. Audit
thresholds are probe inputs covered by the probe file's existing hash; this change adds no policy
digest.

## Rule Ownership

`skill/references/ui-craft-sources.md` becomes the project-owned rule index:

- each audit code with its measurement, default, token source and upstream sources;
- one deduplicated review checklist with stable `UC-` ids for rules the audit does not measure
  (motion feel and timing, focus, semantics, forms, copy, states), each citing its sources;
- the conflict resolutions under the existing precedence;
- the provenance index of the vendored originals and the lintapple adaptation.

The checklist is derived from a deduplicated matrix of 587 rules across the six bundled sources,
the interface-discipline suite and the project references (340 measurable, 127 source-only, 120
judgment). This change measures the lintapple page-design subset; measured focus, motion and
semantics checks are later candidates. The web `review` section walks the checklist and records
results as Component Conformance evidence in `qa.md`, never as Visual Acceptance.

## Provenance

The ported module header names lintapple, revision `90ddc736af6f2712903d53dd9a463445e109f586`, the
MIT license and `Copyright (c) 2026 Gavin Holtzapple`; `THIRD_PARTY_NOTICES.md` carries the full
notice. No lintapple bytes are vendored and no lintapple package is installed.

## Compatibility and Migration

- Motion and journey probes, their findings and exit codes are unchanged.
- Native visual tasks without audit probes are unaffected.
- In-flight web projects: their recorded `interaction` gate lacks lineage, so `probe` reopens; the
  agent adds an audit probe and re-verifies. Pages that passed before may now fail.

## File Ownership

- Audit engine: `skill/scripts/interaction-audit.cjs`, `tests/interaction-audit.test.cjs`,
  `tests/fixtures/ui-audit/`.
- Integration: `skill/scripts/interaction-core.cjs`, `interaction-capture-core.cjs`, `cli-core.cjs`,
  `workflow-core.cjs`, `workflows/shared.cjs`, `workflows/web.cjs`, their existing tests,
  `skill/references/workflow-web.md`, `scripts/test-manifest.json`,
  `skill/references/package-resources.json`.
- Rules and notices: `skill/references/ui-craft-sources.md`, `skill/SKILL.md`, `README.md`,
  `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`.

## Verification

- `tests/interaction-audit.test.cjs`: violating, clean and undeclared fixtures at two viewports;
  every code fires on the violating page; the clean page has no failed check; undeclared checks
  report `not-declared`; translucent or image-backed text is `indeterminate`.
- Integration tests: probe validation rejections; `verify interaction` exit 2 with audit findings
  and exit 0 on the clean fixture; the web `probe` stage refuses a probe file without an audit;
  editing a loaded stylesheet or `DESIGN.md` reopens the gate; a legacy record without lineage is
  stale.
- `npm test`, `npm run specs:check`, and a real `next` -> `verify interaction` run on a fixture
  project.
