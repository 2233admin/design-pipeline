# Web workflow

Motion-first websites and pages. `designer-pipeline next` names the current stage; read only that
section. Stage order:

- `quick` brief/freeform: intake, components, build, probe; `quick` replicate: intake, reference,
  components, build, probe.
- `standard` and `full` brief/freeform: intake, reference, concepts, components, description, build,
  probe, review, deliver. Replicate keeps the reference direction and omits replacement concepts:
  intake, reference, components, description, build, probe, review, deliver.

At `standard` and `full` the agent talks before it builds: a conversation that ends in a playback
the owner confirms, three switchable first-screen variants (not in replicate), one round of
concrete decisions with recommended answers, and a one-page description the owner approves. Only
then is the page built, one section at a time, each reviewed by the owner, before the final
review. `quick` states what was decided for the owner instead of asking.

Every "no" the owner gives on the way becomes a project rule in `state.rules`, the same record a
rejected draft makes, with `from` set to `playback N`, `variants N`, `description N` or
`section <id> N`. `next` lists the rule texts in `rules` on every later action. Rules are never
removed; the owner's later decisions refine them.

For new-site design, existing-site redesign or visual critique, use [taste-skill.md](taste-skill.md)
to select and read the complete built-in method. On an existing site, audit brand, routes, content,
states and stack before changing its design. Preserve supplied references in replicate mode;
Taste's generate-first preferences do not require replacement images. Image concepts and brand
boards use the matched image-only method with an available provider, then become selected
reference/concept inputs through the existing workflow. No external Taste install is required.

## intake

Facts are the agent's job. Before asking, take what you can from the conversation and the
project's files (README, existing pages, `DESIGN.md`, brand assets; in an existing project run
`project inspect`), and never ask the owner for something you can look up.

At `standard` and `full`, `next` returns an ask with no question list, options or recommended
answer. Send its opening as its own message: the `first` line ("If you'd rather skip the questions
and have me start, say so."), then its one open `question` ("Is there a site you saw recently that
felt exactly like this one should? What about it?"; in replicate mode, "What about the page you
want reproduced must stay exactly as it is, and what would you change?"). Then:

- Ask one open question per message, with no list of example answers unless the owner is stuck.
- Anchor on real specifics (a site they saw, the moment a visitor arrives). Ask what would make
  them wince (the anti-goals) and what they have seen elsewhere and loved or hated.
- When you can describe the page, play it back in about 200-300 words: who it is for, what a
  visitor should do, what it should feel like. Mark what the owner said as theirs and what you
  guessed as your guess, and end by asking what is wrong or missing.

Record each reply with the command the ask returns:

| Owner's reply | Record | Effect |
| --- | --- | --- |
| Confirms the playback | `record`: `decide --stage intake --verdict accept --answer "<the playback the owner confirmed>"` | `decisions.intake` holds the playback, marked `playback: "confirmed"`; intake is done |
| Corrects it | `correction`: `decide --stage intake --verdict reject --answer "<what the owner said is wrong or missing>"` | The correction becomes a project rule (`playback N`) and intake stays open: play it back again with the corrections applied, then ask "What is wrong or missing in this?" |
| Asks you to just start | `skip`: `decide --stage intake --choice skip --answer "<the line telling the owner what you decided on their behalf>"` | Tell the owner that line first; `decisions.intake` holds it, marked `skipped: true` |

Each record is appended to `decisions.playbacks`, and a later correction reopens intake. The answer
must say something: a bare go-ahead such as `default`, `ok`, `yes`, `skip`, `just start`, `默认` or
`好` is refused, and so is a web `--answer` without `--verdict` or `--choice skip`.

At `quick`, `next` returns a run instead: do not interview the owner. A quick piece is settled by
the request, the conversation and the project's files. Tell the owner in one plain line what you
decided on their behalf (what you will build, for whom, the look or reference you follow), then
record that line with `decide --stage intake --choice skip --answer "<the line you told the owner>"`.
Ask first only about something essential that you can neither look up nor reasonably decide.

Web intake writes no `brief.md`: the brief is written later as the [description](#description).
An intake recorded before playbacks existed (no `decisions.playbacks` history) still completes
intake; a `quick` project started before quick intake existed records its stated line first.

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

Write `concepts.md` with three cards, `A`, `B` and `C`, with genuinely different first-screen
structures: vary the layout skeleton, focal element, type position and image role (including no
image), not just copy, colour or styling. Each card starts with its central idea as one sentence
about the page and a one-line `Skeleton:` declaration naming those four choices. Then record the
section arc (one line per section: what it is for and its dominant element), what carries the eye
down the page, the look, tools in one line, and any missing license.

Then build `concepts.html`, the variants page: one self-contained page with the three first screens
as real markup, each in an element marked `data-variant="A"`, `"B"` or `"C"` (with a short
`data-variant-name`), one shown at a time by `?variant=A|B|C`. Inline the packaged switcher,
`tools/variant-switcher/variant-switcher.js` ([how to use it](../tools/variant-switcher/README.md)):
it adds a floating bar with left and right arrows around the variant label, and the ← → keys do the
same. Until the page marks all three variants and contains the switcher (`data-variant-switcher`),
`next` returns a run with the finding `variants-incomplete` or `variant-switcher-missing` and its
fix.

Before asking the owner, pre-screen the three variants: render each first viewport at the same size
and combine them into one contact sheet. Check it for structural divergence, a clear focal point and
readable hierarchy. Redo any same-skeleton, common-template or collapsed-hierarchy variant, rerender
and compare again without showing failed variants to the owner (`web-direction.md`). This
pre-screen is not Visual Acceptance and adds no gate or schema; only the owner picks a direction.

Then ask the owner to open `concepts.html`, flip through A, B and C with the arrows or the ← → keys,
and say which first screen to build or what to combine from them (for example B's header with C's
layout). Recommend the variant whose structure best serves what the visitor should do first, and
say why. Record:

- a pick: `decide --stage concept --choice B`;
- a mix: `decide --stage concept --choice B,C --answer "<what to take from each, in the owner's words>"`.
  Combining requires the answer, kept as `decisions.conceptNotes`;
- a rejection: `decide --stage concept --verdict reject --answer "<what is wrong, in the owner's words>"`.
  It becomes a project rule (`variants N`) and reopens the stage. While `concepts.html` is
  unchanged, `next` tells you to redo what the rule rules out and pre-screen again before asking.

Letters are case-insensitive; numbers are refused. A pick is refused (`WORKFLOW_NOT_READY`) until
`next` has reached the variants ask. `decisions.concept` holds the pick (`B` or `B,C`) and
`decisions.variants` the history; a pick recorded before variant history existed still counts.
`quick` and replicate have no concepts stage and refuse concept records.

The variants are throwaway prototypes. Fold the chosen variant, and anything combined from the
others, into the real page, rewritten properly; the switcher never ships in `index.html`
([build](#build)). After the pick, extend the chosen card with `## Treatment` (`web-direction.md`);
for a combination, extend the first card named and say what it takes from the others.

When a Taste method is selected, record its exact entry, brief/dial read and adapted decisions in
these cards. For an explicitly requested web concept-image set, produce separate readable
horizontal images per section; do not confuse those images with implemented or tested UI.

## components

One grilling round of concrete decisions, each with your recommended answer. At `standard` and
`full` it follows the variants (the reference in replicate mode) and comes before the
[description](#description); at `quick` it comes immediately before build. The ask's `questions`
are:

- `sections` (`standard` and `full` only): which sections the page should have, in build order,
  starting with the first screen. Recommend the chosen variant's section arc from `concepts.md`, or
  in replicate mode the reference's sections in its order. The sections the owner settles go into
  the description.
- `components`: where the components should come from:
  1. The project's existing components (name the paths you found).
  2. A GitHub component library the user names.
  3. Search this skill's component source index, `references/component-source-catalog.json`.
  4. Let the agent find maintained open-source component libraries and icon sets on GitHub beyond
     the index (`discover`).
  5. Write from scratch.

Ask them as one numbered round: one `❓ Qn` per question with its body and options, then `➡️` your
recommended answer, and wait for the reply. Settle facts yourself first: find the project's
existing components and their paths, and the assets and their licenses, and name what you found
instead of asking for it. Add a question only for a concrete decision you can neither look up nor
settle from the conversation, such as whether supplied material is licensed for this use. A
question whose answer depends on another one still open waits for the next round.

Recommend the project's own components first, then the index, then letting the agent find more:
`project,index,discover`. Preserve the user's exact nonempty reply in `decisions.components`;
earlier intake does not replace this decision. Supply `--choice` as a comma-separated set of
`project`, `github`, `index`, `discover` or `scratch`. Missing or unknown choices are rejected;
duplicates are removed and `decisions.componentSources` is stored in canonical
`project,github,index,discover,scratch` order. `scratch` is exclusive. Selecting `github` requires
an HTTPS GitHub owner/repo URL such as `https://github.com/owner/repo` in the unchanged answer.
`discover` needs no URL: the agent finds GitHub repositories and records each one with its pinned
license in the manifest (see [build](#build)).
Legacy answer-only web decisions ask again; do not infer the source set from prose. Recording a
different answer or set later, or the first explicit decision on a legacy state that already has a
checked page, drops the interaction pass and delivery; earlier review verdicts stay recorded but no
longer complete review. At `quick`, `next` then returns to probe, not build, so update `index.html`
and `component-manifest.json` for the new decision yourself before rechecking. At `standard` and
`full` the change also makes the description approval stale: `next` returns to the
[description](#description), then reviews each section again before probe.
Set `SKILL_ROOT` to the installed skill's absolute path and `PROJECT_ROOT` to the project's absolute
path, then record the reply using the returned command, equivalent to:

```sh
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" decide \
  --root "$PROJECT_ROOT" --project-root "$PROJECT_ROOT" \
  --stage components --choice project,index,discover --answer "<the user's reply>"
```

## description

`standard` and `full` only: the hard gate before building. Nothing is built until the owner
approves a written description of it.

While `brief.md` is missing, `next` returns a run to write it. An owner-supplied brief with
different casing, such as `BRIEF.md`, is extended in place: keep the owner's words and extend them
rather than replacing them. `brief.md` is one page in plain words that a builder could work from
without asking again:

- what the page is and why;
- who it is for and the one thing a visitor should do;
- how it should feel, in the owner's words;
- goals, non-goals and anti-goals (what would make the owner wince, and the project rules);
- the chosen first screen (the variant and anything combined from the others), or in replicate mode
  what is reproduced, its invariants and what changes;
- the sections in build order, first screen first, each with its id and one line on its job;
- where the components come from;
- constraints such as devices, assets and their licenses;
- which choices are the owner's and which are your calls, marked as yours.

Show it and ask: "Here is the one-page description of what I will build (brief.md). Approve it, or
tell me what is wrong?" Record:

- an approval: `decide --stage description --verdict accept --choice first-screen,proof,close`
  (optionally `--answer "<the owner's words>"`). `--choice` lists the section ids in build order,
  first screen first. Each id is a lowercase slug (letters, digits and hyphens), listed once, and
  must be named in `brief.md`. The approval is refused (`WORKFLOW_NOT_READY`) unless `next` is at
  the description ask.
- a rejection: `decide --stage description --verdict reject --answer "<what is wrong, in the owner's words>"`.
  It becomes a project rule (`description N`); while `brief.md` is unchanged, `next` asks you to
  revise it before asking again.

The approval binds the `brief.md` bytes, the confirmed playback, the chosen variant and its notes,
and the component decision, and fixes the sections the page is built in. A changed `brief.md` (a
typo fix included), a new playback, a re-picked variant or a different component decision makes it
stale: `next` returns here, asks you to bring `brief.md` up to date and asks for approval again. A
new approval makes every section ask for review again. History in `decisions.descriptions`.

## build

At `quick` build the whole page in one pass: `index.html` from the decisions you told the owner, or
in replicate mode from the reference and its invariants. At the `full` tier, open an OpenSpec
change under `openspec/changes/<id>/` first and build inside it.

At `standard` and `full` the page is built in the sections of the approved description, first
screen first, and the owner reviews each section before the next one starts:

1. **First screen only.** Unless replicating, first extend the chosen card in `concepts.md` with
   `## Treatment` and write a brief per section (`web-direction.md`); the briefs land in
   `design.md`, `motion.md`, `component-state-matrix.json` and `interaction.json`. At `full`, open
   the OpenSpec change first. Then build only the first section into `index.html`, from the chosen
   variant and the approved description (in replicate mode, from the reference and its
   invariants), inside an element marked `data-section="<id>"`, with the component manifest below.
2. **Review it.** Once the page and its manifest are valid and the section's marker is in
   `index.html`, `next` asks about that section (the action carries `section: <id>`). Open
   `index.html` at the section in a real browser and let the owner look and interact; ask them to
   point at each element they comment on by its text, label or place. Record
   `decide --stage section --choice <id> --verdict accept` only when nothing in the section needs to
   change. Any change they ask for is a rejection:
   `decide --stage section --choice <id> --verdict reject --answer "<the owner's comments>"`. Each
   comment becomes a project rule (`section <id> N`). Revise the section before asking again: while
   the page (`index.html`, its manifest and the local files it names) is unchanged since the
   rejection, `next` tells you to revise first.
3. **Next section.** `next` returns a run with `section: <id>` for the next approved section: build
   it from its brief inside its own `data-section` element, keep the accepted sections as the owner
   accepted them unless a project rule requires a change, and add every component it uses to
   `component-manifest.json`. Then review it as in step 2.

A section can be accepted only while `next` asks about it (`WORKFLOW_NOT_READY` otherwise); any
built section of the approved description can be rejected again later, which reopens it. A page
that drops a section's marker returns to building that section. Verdicts bind the current
description approval, so re-approving makes every section ask again. Rules apply going forward and
never silently reopen accepted sections. With `--director`, the section asks go to the art
director. History in `decisions.sections`.

When the project already carries runtime-review inputs ([runtime-review.md](runtime-review.md)),
build a runtime-review bundle for the section so the owner can pick its elements and export
Feedback, record each with `runtime-review record`, and cite the recorded files on the rejection
with `--evidence runtime-review/feedback/<hash>.json` (repeatable, with or without `--answer`).
Each cited file must be a contained `design-pipeline.runtime-review-record.v1` record with
lifecycle `recorded` and a Feedback naming `objectId`, category `component-conformance` or
`visual-acceptance`, `actual` and `expected`; each becomes a project rule
`<objectId>: <actual> Expected: <expected>`. The workflow reads only the record's shape;
`runtime-review check` stays the authority on its bundle lineage. Ordinary web projects do not have
those inputs: runtime-review needs a component-first artifact, UI IR, tokens, a design-code map
and a captured observation, which this workflow does not produce. Their comments are therefore text
that names elements by their text, label or place; picking elements on the live page is not
available.

A section verdict is the owner's review of work in progress, not Visual Acceptance of the page; the
final [review](#review) is.

Follow the component decision and write the manifest below before building `index.html`. Motion
follows `web-motion.md` (spring-damper parameters, stepped motion as a style); design tokens and
components come from `pipeline-reference.md`.

Honor `decisions.components` and its explicit `decisions.componentSources` set: reuse the specified
project paths, inspect the named GitHub library, search the index, find open-source sources, or
author the components from scratch as selected. When searching, search the index first:

```sh
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" design-system route \
  --root "$PROJECT_ROOT" --query "<page brief>" --platform web
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" design-system search \
  --root "$SKILL_ROOT" --snapshot "$SKILL_ROOT/references/component-source-catalog.json" \
  --query "<page brief>" --platform web
```

The route and search with `--platform web` use the component-source index; search without a
platform or explicit snapshot retains Astryx. Load only returned entries and needed source guides/implementations, not every
catalog. Keep catalog artifacts inside the selected root.

When `discover` is selected and nothing indexed fits, look for maintained open-source component
libraries or icon sets on GitHub yourself, using the method in `tools/open-source-design.md`. Read
the repository's license at the exact commit or tag you will use and record its manifest entry
before using it. Prefer genuinely reusing a fitting source over hand-writing an equivalent. Without
`discover`, stay within the selected sources.

Choose fonts through `tools/fonts.md`; do not silently fall back to the system stack unless the
treatment (in quick and replicate builds, the page's direction) deliberately calls for it. Record
the chosen family under Typography in `DESIGN.md`, where the audit probe's `thresholds.fonts`
reads the approved families ([probe](#probe)). Bundle or self-host discovered code and fonts
inside the project and keep their license notices: the page loads no CDN scripts or remote fonts
at runtime (`web-motion.md#self-contained-pages`).

Before writing `index.html`, write project-local `component-manifest.json`. Its `entries` array
records every component source used. The existing catalog core's
`validateComponentManifest` checks this evidence; the web workflow stays at build if it is invalid.

```json
{
  "entries": [
    {
      "name": "Project navigation",
      "sourceId": "src/components/Navigation.tsx",
      "availability": "project-owned",
      "license": { "state": "project-owned" },
      "usedIn": [{
        "file": "index.html",
        "marker": "Navigation",
        "how": "Adapt the project's Navigation component"
      }]
    }
  ]
}
```

The example requires the source file to exist and `Navigation` to appear in `index.html`. A
discovered library copied into the page looks like this; the angle-bracket values are the ones you
checked:

```json
{
  "name": "<library>",
  "url": "https://github.com/<owner>/<repo>",
  "revision": "<commit SHA or tag>",
  "availability": "bundled-implementation",
  "license": {
    "state": "verified",
    "id": "MIT",
    "evidence": ["https://github.com/<owner>/<repo>/blob/<commit SHA or tag>/LICENSE"],
    "file": "licenses/<repo>.txt"
  },
  "usedIn": [{
    "file": "index.html",
    "marker": "<import path or class>",
    "how": "Copy <library> into vendor/<repo>.js; keep its MIT license notice in licenses/<repo>.txt"
  }]
}
```

For each entry:

- `name` is nonempty. `sourceId` resolves to an indexed source in
  `references/component-source-catalog.json`, or names an existing project-owned file inside the
  project. Alternatively, `url` names a GitHub repository URL present in the recorded components
  decision, a discovered GitHub repository (below), or a contained project-owned file path/file
  URL. Cite an indexed source by its `sourceId`: a URL of its GitHub repository, or a deep link into
  it, is rejected unless it is the decision-named repository URL, and a deep link inside a named
  repository is rejected in favour of the repository URL. Other URLs (npm pages, project
  homepages, other hosts), URLs with credentials and invented IDs do not resolve. Containment
  follows real paths, so a symlink cannot point outside the project.
- `availability` is `bundled-implementation`, `reference-link`, `metadata-only` or `project-owned`.
  `license.state` is `verified`, `unverified`, `commercial`, `project-owned` or `platform`.
  An indexed source's license state matches the index, including when identified by its named
  GitHub repository URL. Project files use project-owned availability and license state.
- Any other `https://github.com/<owner>/<repo>` URL (neither named in the decision nor indexed) is a
  discovered source; GitHub pages such as `topics`, `orgs`, `sponsors` or `marketplace` are not
  repositories. It needs availability `bundled-implementation`, `reference-link` or
  `metadata-only`, a `revision` (the commit SHA or tag you checked, never `HEAD`, `main` or
  `master`), `license.evidence` (a non-empty array of https URLs, at least one on the same
  repository whose `blob`, `tree`, `raw`, `commit`, `releases/tag` or `archive` ref is exactly the
  revision, such as `https://github.com/<owner>/<repo>/blob/<revision>/LICENSE`; the URL path is
  compared undecoded) and `license.state` `verified`, `unverified` or `commercial`, never
  `project-owned` or `platform`.
  Record `license.id`, the SPDX expression at that revision, whenever you know it; copying or
  importing requires it (below). Validation checks this auditable shape offline; it does not fetch
  the evidence or authenticate the upstream repository, revision or license.
- Each entry's source category must be in the recorded `componentSources`, judged by how it cites
  its source: `project` for a contained project file or the indexed `project-components` record,
  `github` for a decision-named GitHub URL, `discover` for a discovered GitHub repository, and
  `index` for every other indexed `sourceId`, `platform` records such as `native-dom` included. To
  use a named GitHub library under a `github`-only set, cite it by `url`, not by its indexed
  `sourceId`. Scratch keeps its own rules below.
- Every `usedIn` has an existing contained `file`, a nonempty `marker` that literally appears in
  that file, and a nonempty `how`. Choose a real import path, class name, custom element name or
  component identifier as the marker, not a fabricated usage description.
- `how` describes use. Unverified/commercial sources allow only study/reimplementation, never
  copying or importing; availability does not grant permission. A `how` that bundles, vendors,
  self-hosts or downloads the source counts as copying. For example:
  `Study and reimplement the Navigation interaction independently`.
- For verified imports/copies, `how` explicitly records attribution/license-notice handling,
  for example `Import Navigation; retain upstream copyright/license notices in LICENSES.md`.
  This documents handling; validation does not independently audit legal compliance or verify
  a non-indexed repository's declared license.
- Copying or importing a discovered source requires `license.state: verified`, a permissive
  `license.id` (`MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`, `Zlib`,
  `Unlicense` or `CC0-1.0`; the whole id, case-insensitive) and `license.file`: a non-empty file
  contained in the project that holds the copied license text. Validation does not read the text
  to recognise the license. Anything else, including compound expressions such as
  `MIT OR Apache-2.0`, allows only study/reimplementation.

For the exclusive `scratch` set, write `{"fromScratch":true,"entries":[]}` or include only
project-owned entries satisfying the same per-entry rules. `fromScratch: true` is required;
the answer language (including `从零写`) does not determine scratch status. For every nonscratch
set, `fromScratch: true` is forbidden and `entries` must be nonempty. These rules use the explicit
source set, not inferred library names or phrases in the answer.

Build finishes only when `index.html` and a valid manifest both exist, `index.html` does not carry
the variant switcher and, at `standard` and `full`, every approved section is accepted under the
current description approval. While `index.html` contains `data-variant-switcher`, at every tier,
build stays open with the error finding `variant-switcher-shipped`: remove the switcher and its
script; they belong only in `concepts.html`. Invalid evidence returns
the build instructions with the validator message and an existing finding whose `code` is
`CONTRACT_INVALID`, `severity` is `error`, `message` is that validator message, and `fix` gives
remediation. Repair the reported manifest/source-set, source identity, license declaration or
file/marker provenance before running `next` again. This is Component Conformance stage-completion
evidence, not a new gate or receipt schema, and does not grant Visual Acceptance.

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
it locally. A file outside the project that a motion or journey probe's interaction loads fails
that probe the same way. The audit fails on any `failed` or `indeterminate` result at any viewport.

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

Final acceptance of the whole checked page, after each section was reviewed in the build. The
section verdicts do not replace it.

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
