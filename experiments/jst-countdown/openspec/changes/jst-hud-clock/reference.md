# Reference Evidence — jst-hud-clock

## 1. Source Inventory And Provenance

| Field | Value |
| --- | --- |
| Source | One still frame supplied by the user in conversation |
| Kind | image (raster still) |
| Path on disk | **none** — the frame was pasted into the chat transcript |
| Dimensions | unknown; the displayed crop is approximately 16:9 |
| SHA-256 | **unavailable** |
| Role | `primary-target` |
| Requested fidelity | `exact-reconstruction` ("做一个一样的版本") |
| Effective fidelity | `exact-reconstruction` — not downgraded |

The absence of a file path and hash is the blocking condition for this change. It is recorded
rather than worked around. No placeholder hash was written, because a fabricated hash would make
the contract validate while proving nothing.

## 2. Observable Evidence

Composition:

- One rectangular display plane fills the frame and bleeds past the left, right, and bottom edges.
- Three stacked registers. Register one occupies roughly half the visible plane height.
- Each register splits into three columns: a boxed bilingual label, a code badge, and a readout.
- Register one omits the badge column; its readout starts immediately after the label column.
- Hairline rules separate registers and columns. The rule closing register one is heavier than the
  others.

Type:

- Register labels are Japanese-primary with a smaller Latin gloss directly beneath:
  日本標準時 / Japan Standard Time, 作戦開始時間 / H - Hour, 世界標準時 / Greenwich Mean Time.
- Each Japanese label sits in an open stroked box with a short leading tick, not a filled chip.
- Live numerals are ultra-heavy, wide, geometric, with large open counters and flat terminals.
- Kanji unit marks 時 / 分 / 秒 sit on the numeral baseline between and after the digit pairs.
- Small superscript Latin letters `h`, `m`, `s` sit above and right of each digit pair.
- A small `Live` label sits above and left of the first digit pair.
- Register two reads `Countdown` above `GET`, with value `T+00:00:00` and a smaller `.53` tail in a
  narrower, more mechanical numeral face than register one.
- Badges read `MST` and `GMT` inside a notched cartouche with side tabs.
- Register three reads `GMT` above value `15:00:00`, cut by the bottom frame edge.

Color and material:

- Single warm amber hue family on near-black. No second hue anywhere in the frame.
- Luminance ranks the hierarchy: near-white numeral cores, amber kanji and badges, dim amber Latin
  glosses, faint amber hairlines.
- Saturation falls as luminance rises — the hottest numeral cores approach warm white.
- Emission is the light source: the panel is only visible where type spills onto it.

Lighting and surface:

- Wide bloom halo around all emissive type, strongest on register one.
- Fine film grain across the whole frame.
- Slight softening toward the frame corners consistent with a shallow depth of field.
- Faint horizontal banding consistent with a scanline treatment.
- Overall vignette darkening the outer frame.

Motion:

- None observable. A single still frame carries no timing evidence.

## 3. Spatial Evidence

For depth:

- Perspective convergence: the horizontal hairlines are not parallel to the frame edge and
  converge toward a vanishing point off the left of the frame.
- Near/far scale: identical structural elements are drawn larger toward the right of the frame,
  placing the near edge of the plane on the right.
- Camera roll: the plane's horizontal axis is rotated a few degrees relative to the frame.
- Depth of field: corner softening implies a lens focused on the plane rather than a flat blit.

Against depth:

- No occlusion between separate objects: the frame contains exactly one plane.
- No volumetric containers, meshes, world-space labels, cast shadows, or reflections.
- No visible thickness, bevel, or edge highlight on the plane.
- No exposed camera control, and no parallax cue that requires one.

Glow, transparency, scanlines, and grading were excluded from this assessment; per the spatial
routing spec they are not spatial evidence on their own.

## 4. Selected Route

Route: **`2.5d`**. Confidence: 0.85.

- object dimensionality: `2.5d` — a single planar object with no authored volume.
- camera model: `fixed-perspective`.
- interaction model: `none`.
- output surface: `locked-cinematic-frame`.

Two or more spatial cues are present (perspective convergence and near/far scale), so `2d` is
invalid. No authored volume, world coordinates, or navigation is present, so `3d` and `hybrid`
overstate the evidence and would drag in `scene.json` plus `3d.md` for a surface that owns no
runtime state.

## 5. Fidelity Invariants

These must survive implementation:

1. One plane, one camera. Perspective is a projection of the whole plane, never a per-element skew.
2. The near edge of the plane is on the right; scale increases left to right.
3. Hairlines converge with the numerals under the same transform.
4. Single warm amber hue family; hierarchy carried by luminance only.
5. Saturation falls as luminance rises.
6. Register one is oversized relative to registers two and three.
7. The third register is cut by the bottom frame edge.
8. Japanese-primary labels with Latin glosses beneath, in open stroked boxes.
9. Kanji unit marks on the numeral baseline; superscript Latin unit letters above right.
10. Bloom must not close the numeral counters.

## 6. Uncertain Or Missing Evidence

| Item | Status | How it will be tested |
| --- | --- | --- |
| Source pixel dimensions | missing | requires the source file |
| Source SHA-256 | missing | requires the source file |
| Numeral typeface identity | uncertain | no offline match; substituted from a system stack |
| Exact rotation angles and focal length | uncertain | requires camera solve against source landmarks |
| Exact token values | approximated by eye | requires sampling the source raster |
| Cropped content below register three | unknown | not recoverable from the supplied crop |
| Badge cartouche notch geometry | partially legible | requires a higher-resolution source |
| Timing behaviour | absent | a still frame carries none; motion was authored from product logic |

## 7. Resulting Artifact Requirements

Every reference route requires `graybox.png`, including `2d` and `2.5d`, so this change requires it
on route grounds alone. Because role is `primary-target` and requested fidelity is
`exact-reconstruction`, it additionally requires `reference-evidence.json` v2, `reconstruction.json`,
`rectified-reference.png`, `front-elevation.svg`, `camera-calibration.json`, `landmark-overlay.png`,
and a hash-bound `fidelity-receipt.json`.

These two groups are blocked for different reasons and must not be collapsed into one.

**Source-derived group** — `rectified-reference.png`, `front-elevation.svg`,
`camera-calibration.json`, `landmark-overlay.png`, `fidelity-receipt.json`. None can be produced
without the source file. Every one of them is derived from source pixels: rectification anchors,
landmark coordinates, camera solve, and the diff receipt all measure against the source raster.
Blocked by the environment.

**Graybox group** — `graybox.png` plus a `graybox` block on exactly one carrier. The graybox gate is
unconditional: it applies to every route, to every fidelity mode including
`directional-inspiration`, and to runs whose source is `pending`. It needs no source raster and
costs one screenshot, so the missing source does not excuse it. It gates a different thing from the
geometry and final stages — it holds back optical treatment (materials, glow, bloom, depth of field,
scanlines, grading) until the layout has been checked without them. Blocked by **`graybox-missing`**:
no capture and no block was produced, and the optical treatment shipped anyway. This is a process
gap, not an environmental limit, and it is recorded as one in `qa.md` and in `state.json.blockers`.

Status: **blocked**, on both counts. The route classification above is complete and usable; the
graybox gate never ran and the measured fidelity contract is not started. The implementation
proceeds as an unverified reconstruction and is labelled as such in `qa.md`. Requested fidelity
remains `exact-reconstruction` and has not been downgraded, because only the user may approve a
downgrade. Producing `graybox.png` would clear `graybox-missing`; it would not upgrade the fidelity
claim, which stays `unverified` until a measurement against the source replaces it.
