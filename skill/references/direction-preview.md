# Visual Direction Preview Contract

Use this contract before selecting a visual direction for an open whole-surface design or visual
redesign. The preview makes competing layouts visible; it is not a substitute for the selected
change `design.md` or production implementation.

This contract adapts the visible-comparison mechanism reviewed from
[`joeseesun/qiaomu-design`](https://github.com/joeseesun/qiaomu-design) revision
`39dac8238a6ba44a4e39c1f0f6ca641224b01879`. It keeps Design Pipeline's autonomous, resumable
artifact lifecycle: a user may select a direction when present, while an unattended run may select
one only after recording the same preview evidence and an explicit rationale.

## Applicability

Write `direction-preview.json` for every change before Stage 2 selects a direction. When the direction is clear, waive it; when it is open, make the directions from the three sources below, in every flow. There is no model-made candidate set.

- `required`: an open whole-surface request, a material visual redesign, or an explicit request to
  compare styles.
- `waived`: a narrow repair, an extension of an established surface, a non-visual change, an exact
  primary-target reconstruction, or a user-specified single direction.

A waiver is an explicit artifact with a supported reason and rationale. Missing preview evidence is
not an implicit waiver.

## Versions

When the brief needs external references, use [Design sources](../tools/design-sources.md)
to find specific works and observable mechanisms. Carry selected references into the existing
reference notes; a gallery entry does not substitute for a rendered version or select its style.

A required preview renders exactly three full versions, chosen from six cards (below). Versions must be
different systems, not recolors:

- record luminance, type-family, color, layout, density, era, and material axes;
- every pair differs on at least four axes, including luminance or era;
- each version names its visual thesis and one product-specific signature;
- use the same real content fixture, state coverage, and viewport for every version;
- use scoped styles so one version cannot leak into another.

## Directions From Three Sources

An open direction, in any flow (`ui`, `web`, an OpenSpec change, Stage 2), is not the model's own idea
of a few styles. It is made from three sources, two cards each, using the
library described in [design-direction-library.md](design-direction-library.md):

1. **Best designer**: the designers who would do this best for this need, with what each is known for.
2. **Same-medium real work**: real work of the same medium, found and captured with `composition
   capture` (an existing browser tool, no Python). When the work cannot be captured the card says
   `seen: false` with the reason; it never pretends to have seen it.
3. **Style roulette**: two draws from the 84-style catalog by the current second `S`:
   `S % sectionCount + 1` in the medium's section and `S % 12 + 1` in east. Print both with
   `direction draw --medium <web|ppt|info|app> [--second S]`. The draw skips past styles the
   [appearance ledger](#appearance-ledger) shows in the user's last three deliveries and records what
   it skipped. A style under 70% fidelity says what degrades.

If the owner named a style or brand, the flow is unchanged: all six cards interpret that context,
the receipt records it as `context`, and the roulette draws only compatible styles (`--pool`,
`--east-pool`).

Each card carries six columns: logic and source, what is borrowed, hero, skeleton, boldness and the
form taken from the content. They go in `direction-preview.json` `cards`, with the roulette's
section, number, style, specimen path and fidelity in the card's `source`.

Then build `direction-previews/thumbs.html`, six cells of about 480 by 300 (one `data-card-id` each),
and capture it to `direction-previews/thumbs/screenshot.png`. Pick three cards and build them as full
versions `direction-previews/dir-1.html` to `dir-3.html`, each with its `card`, a capture, and four
recorded reasons: `alone` (good by itself), `distinct` (different from the other two), `ledger` (not
colliding with the ledger) and `restraint` (not overdone; at most one version is marked `overdone`).

`direction check --stage preview` checks all of it: six cards with required fields and evidence, the
roulette arithmetic against the catalog, the thumbnail board and capture, exactly three versions
with captures, the four-axis distinctness, the ledger, and the readability and contrast of each
capture where a browser measured it. Every finding carries its fix. The owner is shown the three
captures with their card summaries and the thumbnail board; the other three cards are alternates
the owner may promote. `decide --by owner` keeps the exact words, the chosen ids and any mix
(`--mix part=id`) as structured fields; an explicit taste statement (`--taste "<as said>"`) becomes a
rule scoped as the owner said it.

The `ui` standard and full flow opens with a playback that restates the need, audience, scene, tone
and what the owner did not say, and ends with "I'll make several real directions for you to see".
`quick`, replicate and the narrow-repair waiver keep their current behaviour.

## Appearance Ledger

`~/.design-pipeline/ledger.json` (override with `DESIGN_PIPELINE_LEDGER`) is user level and records
appearance and reference sources only, never project content. An entry is the project hash, the date,
the appearance (palette lightness and hues, fonts, layout skeleton, motion posture) and the sources
(`designer:<name>`, `reference:<url>`, `style:<section>/NN`). Delivery writes it (ui `deliver` and
review accept, web `deliver`); the direction stage reads the last three deliveries to keep the
roulette and the three versions from repeating them. A failed or empty measurement records nothing
and never blocks delivery.

## Preview Surface

Create these change-local artifacts:

```text
direction-preview.json
direction-previews/
  index.html
  <direction-id>.png
```

`index.html` is a self-contained, responsive comparison surface. It must:

- carry a `data-direction-preview` marker and one `data-direction-id="<id>"` stage per candidate;
- show real miniature UI composition, typography, content, and controls rather than a palette or
  mood board;
- keep its comparison shell visually neutral and label the surface as a direction preview, not the
  final product;
- present every candidate in the same viewport and state/content fixture;
- remain usable as a single column on a narrow viewport;
- follow `cjk-typography.md` whenever its shell or mockups contain CJK text.

Capture one PNG per candidate from the declared comparison viewport. The receipt binds the brief,
HTML, screenshots, and content fixture by SHA-256 so later edits cannot masquerade as the preview
that informed the decision.

## Gate Order

1. Write the applicability and candidate receipt with `decision.status: pending`.
2. Generate the comparison HTML and screenshots.
3. Run:

   ```bash
   designer-pipeline direction check --stage preview --change-root <change-root> --json
   ```

4. After the preview passes, obtain the user's selection, or select as the agent only under a
   delegation: the workflow's `concept` checkpoint handed to the agent, or the owner's instruction
   quoted. Record `selectedDirectionId`, a product/visitor-fit rationale and `by`; an agent
   selection also records `agent` and `delegation`.
5. Run:

   ```bash
   designer-pipeline direction check --stage selection --change-root <change-root> --json
   ```

6. Only then write the committed direction to `directions.md` and continue to change `design.md`.

For the `ui` deliverable at the standard and full tiers (not in replicate mode), `next` runs this
contract as its direction stage after intake: write `direction-preview.json` at the project root
(its `changeId` is the project folder's name), and record the owner's pick with
`decide --stage concept --by owner --choice <id> --answer "<why>"` (or `--choice waived` for a
waiver), which writes the selection into the receipt only when the selection check passes.

Do not treat a recommended badge, default card, timeout, or visually emphasized candidate as a
selection. Do not begin production implementation from an unverified preview.

## Receipt Shape

`direction-preview.json` uses `design-pipeline.direction-preview.v1` and contains:

- `changeId`;
- `applicability.status` and `applicability.reason`;
- `comparison.brief`, `comparison.index`, viewport, content-fixture hash, and shared state coverage;
- `medium`, `context` (optional), six `cards` and `thumbs`, and exactly three version records with axes and hash-bound screenshots; a waiver carries none of them;
- `decision.status`, `selectedDirectionId`, rationale, and for a selection `by` (`owner|agent`);
  an agent selection adds `agent` and `delegation` (`workflow-state` with `stateSha256`, verified
  with `direction check --project-root`, or `owner-instruction` with a quote of at least six words).

Paths are relative to the change root and remain contained after link resolution. Unknown fields,
escaping paths, duplicate IDs, false diversity, missing stage markers, malformed or wrong-size PNGs,
missing files, and hash drift fail the executable gate.
