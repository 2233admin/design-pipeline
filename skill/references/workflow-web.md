# Web workflow

Motion-first websites and pages. `designer-pipeline next` names the current stage; read only that
section. Stage order:

- `quick` brief/freeform: build, probe; `quick` replicate: reference, build, probe.
- `standard` and `full`: intake, reference, concepts, build, probe, review, deliver.
  Replicate keeps the reference direction and omits replacement concepts.

For new-site design, existing-site redesign or visual critique, use [taste-skill.md](taste-skill.md)
to select and read the complete built-in method. On an existing site, audit brand, routes, content,
states and stack before changing its design. Preserve supplied references in replicate mode;
Taste's generate-first preferences do not require replacement images. Image concepts and brand
boards use the matched image-only method with an available provider, then become selected
reference/concept inputs through the existing workflow. No external Taste install is required.

## intake

Ask the four web questions in one numbered round, each with its recommendation: `product` (what it
is and the one thing a visitor should do or understand), `audience` (who visits, from where, on
which devices), `scope` (which pages or sections it needs and what the visitor should be able to do
first), `assets` (copy, screenshots, product UI, logos, fonts, brand rules, licensing). Record the
reply with `decide --stage intake`.

Intake is complete only when `decisions.intake` is recorded in `.design-pipeline/state.json`;
`brief.md` or `BRIEF.md` alone does not complete it. If recording refuses a case-insensitive
`brief.md` collision with a file intake did not write, preserve that file by moving or renaming it,
then retry the returned intake record command. Refusal leaves the existing brief and state unchanged.

## reference

For a local video run `reference analyze-video --path <contained-video> --output <new-dir>`.
Inspect ordered timed windows, record named target/property/state observations and uncertainties,
and bind `videoAnalysis` in the existing reference carrier. A note alone does not finish temporal
observation. Resample uncertain intervals with `--start <sec> --end <sec> --fps 12`; a local range
does not replace whole-source observation. In an existing project use `project inspect` and trace
the observed targets to actual renderer/component/material/animation source evidence.

Watch 1-3 moving web references at full speed and write `reference.md`: observed motion, timing,
easing, structure, and what to transfer. In `replicate` mode the reference is the thing being
reproduced and cannot be skipped. Otherwise the user may decline references
(`decide --stage reference --answer none`).

Use `reference-spec.md` for observed regions, invariants and unknowns; for reconstruction read
`reconstruction-spec.md` and applicable `3d-spec.md`. Record animation observations against timed
frames when supplied, and mark missing timestamps or uncertain motion. `reference.md` records
document delivery, not verified understanding. Full reference checks include graybox evidence;
do not require that aggregate to be ready before building the bounded graybox.

## concepts

Write `concepts.md` with three genuinely different first-screen structures: vary the layout
skeleton, focal element, type position and image role (including no image), not just copy, colour
or styling. Each card starts with its central idea as one sentence about the page and a one-line
`Skeleton:` declaration naming those four choices. Then record the section arc (one line per
section: what it is for and its dominant element), what carries the eye down the page, the look,
tools in one line, and any missing license.

Render all three first viewports at the same size and combine them into one contact sheet. Before
asking the user, the agent pre-screens it for structural divergence, a clear focal point and readable
hierarchy. Redo any same-skeleton, common-template or collapsed-hierarchy card, rerender and compare
again without showing failed cards to the user (`web-direction.md`). This pre-screen is not Visual
Acceptance and adds no gate or schema. Show the surviving three cards and contact sheet; the user
picks one (`decide --stage concept --choice 1|2|3`). After the pick, extend the chosen card with
`## Treatment`.

When a Taste method is selected, record its exact entry, brief/dial read and adapted decisions in
these cards. For an explicitly requested web concept-image set, produce separate readable
horizontal images per section; do not confuse those images with implemented or tested UI.

## build

At `standard` and `full`, unless replicating, first extend the chosen card in `concepts.md` with
`## Treatment` and write a brief per section (`web-direction.md`); the briefs land in `design.md`,
`motion.md`, `component-state-matrix.json` and `interaction.json`. Then build `index.html` from the
chosen concept, or from the reference and its invariants in replicate mode. Motion follows
`web-motion.md` (spring-damper parameters, stepped motion as a style); design tokens and components
come from `pipeline-reference.md`. At the `full` tier, open an OpenSpec change under
`openspec/changes/<id>/` first and build inside it.

Apply the selected Taste source through the approved design and existing component/runtime owners.
Keep complete requested artifacts, real content and loading/empty/error/focus states. Bind
image-to-code inputs to the existing reference evidence and inspect actual renders for drift;
Stitch semantic output must use the project-owned Google-format foundation via design-synthesis.

Use `tools/README.md` when a bounded visual task needs drawing, image placement, text fitting,
material techniques or pixel comparison. Load only that tool, preserve the existing DOM/runtime,
and inspect the resulting surface at its real viewport. Source tools support the chosen direction;
their example styles, coordinates and characters do not define the product.

For page/component styles, follow `good-css.md` and its matched original entries across CSS,
utility classes and CSS-in-JS. Prefer a fitting intrinsic/native solution, preserve project
DESIGN/MOTION tokens, and verify target-browser support and usable fallbacks. Use the bundled
offline specimen builder for a bounded study; keep film seeking and interaction evidence on
their existing routes. In probe/review, record applied entries and actual fallback, focus,
content/viewport and reduced-motion observations in the existing QA evidence.

For components, polish and accessibility, follow `ui-craft-sources.md` and load only the matched
sources: the component source from the catalog and `design-system route`, plus `shadcn` rules only
in a shadcn project or a selected shadcn-registry route; `emil-design-eng` and
`make-interfaces-feel-better` details expressed in the existing styling system; and
`fixing-accessibility` for every added control, form or dialog.

Use the task fields in `stages.md#stage-4-tasks`: one visual goal with explicit inputs, scope,
outputs, checks and repair path. For references, first render bounded structure/occlusion in a
graybox. Then read complete `reference check`, `reconstruction check` and applicable `scene check`
results before dependent material, polish or motion; repair the reported prerequisite failures.
Follow reconstruction's existing permissions: graybox readiness releases optical treatment even
if geometry is blocked; detail geometry and fidelity claims still require their own readiness.
Creating files or passing engineering checks does not grant visual acceptance.

## probe

If `interaction.json` is missing, write it, schema `design-pipeline.interaction-probe.v1`: one probe
per key interaction (a section with no driver has none, but the page keeps at least one; see
`web-direction.md`) and one audit probe for the page. Every tier needs the audit: while the file
has none, `next` asks for it instead of returning the verify command.

```json
{
  "schema": "design-pipeline.interaction-probe.v1",
  "id": "landing",
  "url": "index.html",
  "viewport": { "width": 1280, "height": 800 },
  "probes": [
    {
      "id": "card-follows-pointer",
      "target": "#card",
      "input": { "kind": "pointer-sweep", "from": [200, 400], "to": [1080, 400], "durationMs": 600 },
      "expect": { "responds": true, "settleWithinMs": 1200, "returnsToRest": true, "response": "spring" }
    },
    {
      "id": "page-audit",
      "kind": "audit",
      "viewports": [{ "width": 1280, "height": 800 }, { "width": 390, "height": 844 }],
      "thresholds": { "fonts": ["Inter"], "fontSizes": [12, 14, 16, 20, 24, 32, 48], "minTargetPx": 24 },
      "declare": {
        "numbers": [".price"],
        "stacks": [".features", ".plans"],
        "controlContainers": [".toolbar"],
        "alignGroups": [{ "selector": ".hero", "items": ".hero > *", "edge": "start" }],
        "contentBoxes": [".card"]
      }
    }
  ]
}
```

The audit measures the rendered page at each of its `viewports` (default: the file's `viewport`),
after a fresh load, the fonts and two frames, against the codes in
`ui-craft-sources.md#measured-audit`. It needs the bindable local page: `url` names the project's
local `index.html`, and every asset the page loads (stylesheets, scripts, fonts, images, data) is a
file inside the project. An `http(s)` page or a page outside the project is a contract error before
the browser starts.

- `thresholds`: copy them from `DESIGN.md`; a list replaces its default. `fonts` is required: the
  approved families from `DESIGN.md`, so `audit.font-family` always runs. Defaults: `minFontPx` 12,
  `minTargetPx` 24, `minControlGapPx`, `minControlInsetPx` and `minLayoutGapPx` 8,
  `contrastNormal` 4.5 and `contrastLarge` 3 (text of 24 px, or bold at 18.67 px); the `fontSizes`
  scale has none.
- `declare`: selectors for what the markup means, so the delivered page carries no audit
  attributes: `numbers` (changing or compared values; numeric table cells are found without it),
  `stacks`, `controlContainers`, `alignGroups` (`edge` is `start`, `center` or `end`),
  `radiusPairs` (`outer`, `inner`) and `contentBoxes`. A declared selector that matches nothing
  fails, so a typo cannot pass.

No probe field can skip a subtree, suppress a finding or waive a result; any other field is
rejected before the browser starts. Unresolved results are fixed in the page, not in the probe.

Each check reports, per viewport, `passed`, `failed`, `not-declared`, `not-applicable` (nothing
visible in scope) or `indeterminate`, with a `checked` count; nothing checked is never `passed`.
Six optional checks measure only what is declared: `audit.tabular-numbers` (`numbers`, or the
page's numeric table cells), `audit.content-overflow` (`contentBoxes`), `audit.control-inset`
(`controlContainers`), `audit.layout-gap` (`stacks`), `audit.layout-alignment` (`alignGroups`) and
`audit.nested-radius` (`radiusPairs`). Without their declaration they report `not-declared` in the
coverage with a hint naming what to declare: it is never counted as passed and does not fail the
audit. Once declared, an optional check is judged like the others. `indeterminate` means the page
could not be measured, for example text over a gradient, image, translucent layer, filter, blend
mode or shadow; it fails the audit with the fix to put the text on a measurable solid surface or
scrim. A CDN or dev-server URL, or a file outside the project, fails the verifier's existing
`external-request` finding once per audit probe; copy the resource into the project and reference
it locally. The audit fails on any `failed` or `indeterminate` result at any viewport.

Then run the `verify interaction` command `next` returns. It exits 2 when a probe fails, and 1 for a
malformed probe, a page the audit cannot bind or a selector the page rejects; neither records a
pass. In `evidence/interaction.json` each finding has its `code`, the element `selector` (a request
finding has none), the `viewport`, the measured `actual`, the `expected` threshold and a `fix`; the
audit row's `coverage` lists every check's status and count, with the hint of each `not-declared`
check. Apply the fix or declare what was not declared, and rerun. A pass binds the hashes of the
local files the page loaded and of `DESIGN.md` and `MOTION.md`; remote URLs (only a probe file
without an audit can pass with them) are recorded but never fetched or hashed. Editing
`interaction.json`, the page, any local file it loaded or the project's `DESIGN.md` and `MOTION.md`
afterwards reopens this stage, and with it review and delivery.

## review

Before showing the page, walk the `UC-` items of `ui-craft-sources.md#review-checklist` that apply
to what changed (motion feel and timing, focus, semantics, forms, copy, states). Record each result
by its id in `qa.md` as Component Conformance evidence, never as Visual Acceptance; record a rule
that conflicts with the project's precedence as not applicable. The measured audit already covered
the codes in `ui-craft-sources.md#measured-audit`. Name in `qa.md` the surfaces left unmeasured by
`not-declared` checks.

Show the page, its motion at full speed and a one-paragraph gate summary. When the build used a
treatment (not in `replicate` mode), the reviewer also reads W1 to W7 (`web-direction.md`) and
reports them under Visual Acceptance in `qa.md`; the agent never records acceptance and gate
findings stay Conformance. The user accepts, or rejects with one sentence
(`decide --stage review --verdict accept|reject`). A rejection reopens `probe` for the rebuilt page
and becomes a project rule.

## deliver

`decide --stage deliver --answer <url or path>`.
