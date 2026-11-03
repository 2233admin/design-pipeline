# XY Charting Route

Use this reference when a Python product needs interactive charts, notebook display, static chart
exports, Reflex integration, or large-data rendering. XY is a built-in routing contract, not a
vendored runtime: the target project must install and pin its own compatible `xy` version.

Reviewed baseline: `reflex-dev/xy` v0.0.6 at commit
`55b8b61e432842995dc0b581113b0998a70a052d` on 2026-08-13. XY is Apache-2.0 and
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

These rules hold for any `vector-data` route (XY, SVG/D3, ECharts, Chart.js), not only XY. They feed
the Design Contract above and the owner's review; none is a gate.

- **One decision.** A dashboard serves one decision. Under a one-line title, one sentence of
  takeaway, computed from the data, says what the numbers mean for that decision.
- **Headline figures.** At most about six in a row. The first is the one nearest the outcome
  (orders, not visits). Each shows its change from the previous period, signed, with the period
  named, coloured by whether the change is good. Every card names its time window ("Last 28 days").
  Figures that are stages of one process are a funnel or a ratio, not separate tiles.
- **A shape for the job.** Pick one before laying out cards:
  - *Scorecard* (weekly check-in): four to six cards, each latest value, change, small trend and
    target; only a missed target turns red.
  - *Board* (kept open to watch health): one status line naming what is over its limit, the same
    metric per member as small charts on one shared scale, recent incidents in a table; only a
    breach takes the danger colour, and nothing moves.
  - *Experiment* (ship or not): the primary metric's lift as the big number, a sentence on whether
    its 95% interval crosses zero, every metric's interval against a zero line.
  - *Funnel* (where people drop off): each step as a bar from one left edge, the previous period as
    a thin bar beneath, the share lost between steps, the biggest loss in the danger colour.
  - *Table* (many rows to scan): one sortable, searchable table, an in-cell bar on one shared scale,
    secondary columns that hide when narrow.
  - *Review* or *analysis* (read once): the finding in a sentence around one number, then one chart
    per heading that says what it shows; one accent series, the rest muted.
- **Marks.** Counts per day, week or month are bars; rates, running totals and several series over
  time are straight-segment lines, because a smoothed curve shows values the data does not have.
  A breakdown table keeps its parent's columns in the same order. Label a line at its end with name
  and latest value instead of a legend when there are few lines. Define a metric in plain words where
  it first appears.
- **Measured layout.** Chart margins come from the widest tick and end label as drawn, not a guessed
  constant; thin ticks or move end labels apart when labels meet. Give every chart box an explicit
  height: a responsive chart inside a parent with no resolved height can grow without bound (Chart.js
  with `maintainAspectRatio: false` loops on its resize observer).
- **States keep their place.** Loading, empty, failed and refreshing states keep the chart box's
  drawn height, so nothing below moves. A failed source shows one short line in place; empty values
  stay blank rather than printing "No data"; a refreshing card dims and keeps its last values.
  These are the `loading`, `empty` and `error` rows of the component state matrix.
- **Honest data.** Rows that were made up, estimated or recalled are labelled as sample data on the
  page, with how they were made; anything left out is named on the page with the reason.

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

Provenance: Dashboard And Chart Composition distils the dashboard design defaults of the claude.ai
Dashboard artifact type, as published in `JimLiu/baoyu-design`
(`skills/claude-dashboard/artifact-type/reference/design-defaults.md`, Anthropic material, no licence
granted), and the chart-container rule of `nexu-io/open-design` `skills/data-report` (Apache-2.0).
Mechanisms only, in this repository's words; see
`openspec/changes/distill-claude-design-methods/design.md`. `codeCopied: false`.
