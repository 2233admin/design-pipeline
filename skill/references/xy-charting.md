# XY Charting Route

Use this reference when a Python product needs interactive charts, notebook display, static chart
exports, Reflex integration, or large-data rendering. XY is a built-in routing contract, not a
vendored runtime: the target project must install and pin its own compatible `xy` version.

Reviewed baseline: `reflex-dev/xy` v0.0.8 at commit
`6483032a7947e1f44ced1a560ac08f1025637529` on 2026-11-04. XY is Apache-2.0 and
alpha; pre-1.0 upgrades require a changelog and migration review.

## Selection Boundary

Prefer XY when the project is Python-based and one or more of these is material:

- one declarative chart must work in notebooks, the web, and HTML/PNG/SVG/PDF exports;
- a Reflex application needs a chart without an iframe or separate chart service;
- large scatter or line data needs resolution-aware decimation, density rendering, and drilldown;
- interaction requires hover, pan, zoom, selection, linked views, or Python callbacks;
- chart chrome must be customized through Python, CSS, or Tailwind.

Preserve the project's accepted chart library when it already satisfies the data, interaction,
accessibility, export, and performance contract. Prefer SVG/D3 for small, DOM-inspectable custom
marks. Do not add XY to a JavaScript-only product just for visual style.

## Installation And Ownership

Installation is an explicit target-project dependency change:

```bash
pip install xy
```

For a Reflex application, use the extra and bundled `reflex_xy` namespace:

```bash
pip install "xy[reflex]"
```

Pin the selected pre-1.0 version with the target project's existing Python package manager. The
pipeline never installs XY automatically, copies its runtime, or assumes a source build toolchain.
Published wheels include a native Rust core; a source build requires Rust. Python 3.11 or newer is
required.

The built-in adapter lifecycle uses a read-only Python package-metadata probe, records
`xy[reflex]` as the target-project dependency, describes `reflex run` as the project-owned launch
command, and requires a hash-bound `design-pipeline.toolchain-receipt.v1`. Resolve it through
`designer-pipeline toolchain resolve`; run `toolchain probe` only after the target project has
installed and pinned its dependency.

## Design Contract

Record in change `design.md`:

- the user question each chart answers and the comparison, trend, distribution, or relationship it
  exposes;
- source fields, units, missing-value behavior, transforms, aggregation, ordering, and provenance;
- chart family, marks, channels, scales, domains, axes, legends, labels, annotations, and tooltip
  content;
- responsive dimensions, dense-dashboard limits, theme tokens, and browser/static-export styling
  differences;
- interaction states and a non-pointer path for the same user task;
- a semantic data table or equivalent accessible representation for the underlying values.

Use change `motion.md` only when chart transitions or streaming motion carry meaning. XY implements
the motion semantics; its animation API does not redefine the project `MOTION.md` language.

## Dashboard And Chart Composition

Applies to every `vector-data` runtime (XY, SVG/D3, ECharts, Chart.js). It feeds the Design
Contract above and the owner's review; nothing here is a gate.

### Before any card: decision, form, headline

1. Name the single decision the page supports. Put a plain title on top and, beneath it, one
   sentence computed from the data that states what the numbers imply for that decision.
2. Pick one form and build only that:

   | Form | Reader's job | Layout |
   | --- | --- | --- |
   | Scorecard | Weekly check-in | 4–6 cards; each: current value, delta, small trend, target; red only for a missed target |
   | Board | Watching health all day | A status line listing what is out of bounds; one metric per member as small multiples sharing a scale; incident table; still, with danger colour reserved for breaches |
   | Experiment | Ship or not | Lift of the primary metric as the big number; a sentence on whether the 95% interval includes zero; all intervals plotted against a zero line |
   | Funnel | Locate drop-off | Steps as bars from a shared left edge, prior period as a thin bar under each, percentage lost between steps, largest loss in the danger colour |
   | Table | Scanning many rows | One sortable, filterable table; in-cell bars on a common scale; low-priority columns collapse on narrow screens |
   | Review | Reading a finding once | The finding as a sentence built around one number, then one chart per heading; one accent series, others muted |

3. Headline numbers: keep the row to roughly six. Order them by closeness to the outcome (orders
   before visits). Each carries its delta against the prior period, with sign, the comparison
   period spelled out, and a colour for good or bad. Each card states its window (for example
   "28 days to 3 Nov"). Sequential stages of one process become a funnel or a ratio rather than
   loose tiles.

### Marks, labels and layout

| Rule | Why |
| --- | --- |
| Counts per period as bars; rates, cumulative totals and multiple series as lines with straight segments | Smoothing invents in-between values |
| Few lines: name and last value at the line's end instead of a legend | The eye stays on the data |
| A drill-down table repeats its parent's columns in the parent's order | Rows compare across levels |
| Define each metric in plain words at first use | Readers outside the team |
| Derive chart margins from the measured width of the longest tick and end label; thin ticks or offset labels that collide | Data decides label width |
| Every chart box has an explicit height | A responsive chart in a parent without a resolved height can grow forever (Chart.js with `maintainAspectRatio: false` loops on resize) |

### States and honesty

- Loading, empty, failed and refreshing keep the box at its drawn height so the page below never
  shifts: a failed source gets one short in-place line, missing values stay blank instead of a
  "No data" label, a refresh dims the card while its previous values stay legible. These map to the
  `loading`, `empty` and `error` rows of the component state matrix.
- Invented, estimated or remembered rows are marked on the page as sample data, with how they were
  produced. Anything omitted is named on the page with the reason.

## Runtime And Security Boundaries

- Notebook display, native PNG/SVG, and standalone HTML can run offline after compatible wheels are
  installed; XY does not need a CDN for its own client assets.
- Standalone HTML is an interactive snapshot. It cannot call Python or receive later appends.
- Live callbacks, drilldown, or Reflex state require the product's Python host and project-owned
  network path.
- Self-contained HTML blocks external connections but permits inline script/style and a `blob:`
  worker. A nonce/hash-only CSP requires a host wrapper rather than unchanged embedding.
- Chromium-backed export requires a locally installed supported browser. Native PNG and SVG do not.

## Accessibility Boundary

XY supplies a semantic chart region, generated summary, live region, named controls, focus styling,
reduced-motion behavior, and direct-point keyboard navigation. That is not complete accessibility
parity: aggregated-bin keyboard navigation and a built-in view-as-table escape hatch are not
covered. Every meaningful chart therefore needs a tested semantic data table or equivalent path,
and QA must exercise the actual chart family with the project's browser and assistive-technology
matrix.

## Alpha And Export Boundaries

- Treat v0.0.x APIs as version-sensitive and verify them against the installed version.
- Density mode is an aggregate overview, not one exact browser mark per source row; verify zoom and
  selection against canonical rows when exactness matters.
- Browser classes and custom CSS do not survive every native export path. Verify the exact HTML,
  PNG, SVG, or PDF output being shipped rather than inferring parity from the live chart.
- Python callbacks are unavailable in standalone HTML, and already-exported HTML does not receive
  later live updates.
- If the native core, WebGL, Python host, or required interaction is unavailable, fall back to a
  verified SVG or PNG plus the semantic data table.

## QA Minimum

Verify representative empty, loading, error, sparse, dense, missing, extreme, and resized data;
units and tick formatting; keyboard and screen-reader operation; reduced motion; forced colors;
hover/zoom/selection accuracy; static export hashes or visual evidence; offline/CSP behavior; and
measured time and memory at the target dataset size. Record the installed XY version and rendering
mode in `qa.md`.

Official sources:

- Repository and changelog: https://github.com/reflex-dev/xy
- Documentation: https://reflex.dev/docs/xy/
- Capability matrix: https://github.com/reflex-dev/xy/blob/main/spec/api/capability-matrix.md
- Alpha limits: https://github.com/reflex-dev/xy/blob/main/docs/api-reference/limitations-and-alpha-status.md

Provenance: Dashboard And Chart Composition restates, as mechanisms, the dashboard design defaults
of the claude.ai Dashboard artifact type, as published in `JimLiu/baoyu-design`
(`skills/claude-dashboard/artifact-type/reference/design-defaults.md`, Anthropic material, no licence
granted), and the chart-container rule of `nexu-io/open-design` `skills/data-report` (Apache-2.0).
Mechanisms only, in this repository's words; see
`openspec/changes/distill-claude-design-methods/design.md`. `codeCopied: false`.
