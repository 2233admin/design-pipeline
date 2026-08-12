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

Write `direction-preview.json` for every change before Stage 2 selects a direction.

- `required`: an open whole-surface request, a material visual redesign, or an explicit request to
  compare styles.
- `waived`: a narrow repair, an extension of an established surface, a non-visual change, an exact
  primary-target reconstruction, or a user-specified single direction.

A waiver is an explicit artifact with a supported reason and rationale. Missing preview evidence is
not an implicit waiver.

## Candidate Set

For a required preview, render three candidates by default. Two are allowed when product or
reference constraints leave only two honest directions; use four only when the brief or user asks
for broader exploration.

Candidates must be different systems, not recolors:

- record luminance, type-family, color, layout, density, era, and material axes;
- every pair differs on at least four axes, including luminance or era;
- each candidate names its visual thesis and one product-specific signature;
- use the same real content fixture, state coverage, and viewport for every candidate;
- use scoped styles so one candidate cannot leak into another.

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

4. After the preview passes, obtain the user's selection or make the bounded autonomous selection
   allowed by the run. Record `selectedDirectionId` and a product/visitor-fit rationale.
5. Run:

   ```bash
   designer-pipeline direction check --stage selection --change-root <change-root> --json
   ```

6. Only then write the committed direction to `directions.md` and continue to change `design.md`.

Do not treat a recommended badge, default card, timeout, or visually emphasized candidate as a
selection. Do not begin production implementation from an unverified preview.

## Receipt Shape

`direction-preview.json` uses `design-pipeline.direction-preview.v1` and contains:

- `changeId`;
- `applicability.status` and `applicability.reason`;
- `comparison.brief`, `comparison.index`, viewport, content-fixture hash, and shared state coverage;
- two to four candidate records with axes and hash-bound screenshots;
- `decision.status`, `selectedDirectionId`, and rationale.

Paths are relative to the change root and remain contained after link resolution. Unknown fields,
escaping paths, duplicate IDs, false diversity, missing stage markers, malformed or wrong-size PNGs,
missing files, and hash drift fail the executable gate.
