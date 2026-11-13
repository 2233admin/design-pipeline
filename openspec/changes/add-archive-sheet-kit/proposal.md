# Sheet kit for industrial document sheets about a real subject

## Why

The owner asks for posters and information sheets about real subjects ("a poster about the Tay
Bridge collapse", "an infographic on 圭表测影") in the industrial document grammar, the way the
ETH NMR and orbital-archive reference sheets read. The method exists
(`industrial-document-sheets.md`), but every sheet is still hand-built from nothing: the frame, the
protocol column, the computed hero and the side blocks are rewritten per page, and routing only
fires on Arknights / Endfield wording. Two sheets built by hand this week (a TCP protocol sheet and
a Webb mirror structure sheet) showed the parts repeat; the owner wants them split out so they can
be reused.

## What Changes

- New `skill/tools/template-bank/sheet-kit.cjs`: a sheet is a JSON spec rendered from reusable
  parts — frame (institution, file and sheet number, registration marks, sources footer, control
  strip), title block, one computed hero, a side column of blocks, and notes.
  - Heroes, each drawn from data in the spec: `sequence` (message ladder between two actors),
    `bitfield` (header or record on a bit ruler), `hexmap` (segmented aperture), `elevation` (long
    structure in spans with a failed group and a cross-load), `gnomon` (noon shadows computed from
    latitude and declination).
  - Blocks: `table`, `bill`, `metrics`, `tabs` with a live dot, `barcode`, and `hero` to embed a
    second figure in the side column.
  - Notes: handwritten annotation with a pen arrow to an anchor the hero exposes, a "not to scale"
    object, and a link from the selected item to the selected field.
  - Dialects `paper`, `terminal`, `field`; one brand colour passed as `data-hue-brand` so the
    existing `hue-budget` rule applies.
- Checks on render, reported as findings (exit 2 from the script): sources line required; frame
  complete; method §5 density budgets (hero annotations and text-column fields counted separately,
  "delete, do not shrink"); side-column overflow. Values flagged `example` get a `*` and the footer
  says so automatically.
- Four example specs in `skill/tools/template-bank/sheets/` (TCP, Webb mirror, Tay Bridge, Dengfeng gnomon) serve as
  golden examples and test fixtures.
- `industrial-document-sheets.md` adopts the four-question intake (format and size, issuing
  institution, dialect, density), adds a "Sheet kit" section, and drops the Arknights-only framing
  from routing in `SKILL.md` and `capability-routing.md`.

- `examples/computed-sheets-kit/`: 40 worked pieces built while designing the kit, kept as references
  (build scripts, numpy rasters, contact sheet, README). The method guide states that its grammar
  lines are chosen per subject, not stamped.

## Reuse

Extends the method guide and the template-bank tool folder; the hue roles are the ones
`template check --browser` already measures. No new gate, receipt schema or CLI command.
