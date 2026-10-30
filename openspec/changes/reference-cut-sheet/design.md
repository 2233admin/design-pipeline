# Design

## Vocabulary (from the TV-animation cut sheet)

- `size` (shot size): `LONG`, `FULL`, `KNEE`, `WAIST`, `BUST`, `UP`, `BIGUP`, `INSERT` (object, screen or text card), `GRAPHIC` (full-frame type, chart or UI with no camera).
- `camera` (array, one entry per move, in order): `FIX`, `PAN`, `TILT`, `TU` (track up), `TB` (track back), `FOLLOW`, `ZOOM-IN`, `ZOOM-OUT`, `ROLL`, `SHAKE`, `RACK` (focus pull). Free text goes in `picture`, not in the enum.
- `transition` (what happens at the cut's head): `CT` (hard cut), `OL` (dissolve), `FI`, `FO`, `WI` (white in), `WO` (white out), `WIPE`, `GLITCH`, `FLASH`.
- Time column shows `seconds+frames` at the board `fps` (3+12 = 3 s 12 frames). Stored as `startSec`/`endSec`; the sheet derives the display, so there is one source of truth.

The enums are the vocabulary of the cut-sheet format as agents meet it in Japanese production material; they are
a closed list so a gate can reject typos, and extending the list is a spec change. The list was written from
general knowledge of the format and a web search that confirmed the column set and TU/TB/PAN; it has not been
checked against a real production sheet, so task 3.1 asks the user for one sample before the enum is frozen.

## Ownership

- `film-core.cjs` owns shape and cut rules, as it owns beat rules.
- `film-cut-core.cjs` (new) owns the cut checks, parity, rendering and seeding; it reads the board and the analysis report, never edits timelines or receipts.
- Parity reads the analysis `report.json` named by `board.referenceCuts` (a project-relative path). The path joins the film gate's upstream evidence inputs, so a changed analysis invalidates the recorded pass, as `reference.md` already does.

## Gate semantics

- Structure findings (cut shape, contiguity, vocabulary) fail like beat findings.
- Parity findings are `severity: "warn"` by default and listed under `parity` in the result, with counts. A board may set `parityStrict: true` to fail on them. Warn-by-default keeps a homage free to depart from the reference on purpose; the departure stays visible.
- Beat rules about `productAction` and `transformation` do not apply to cuts.
- Cut `energy` (still, low, mid, high) is the author's declared motion class, compared with the reference class; the gate does not measure render motion per cut. Parity tolerance: cut start within 2 frames of a reference shot start; motion class (still / low / mid / high from `motion.meanShare` at 3 / 15 / 40 %) equal or adjacent; sound onsets in the reference shot matched by a declared `sound` entry within 0.1 s.

## Alternatives rejected

- A new `design-pipeline.cut-sheet.v1` schema and gate: a parallel schema (forbidden) that would drift from the storyboard timeline.
- One beat per cut: forces `productAction`/`transformation` on every cut and trips the slideshow and cadence rules.
