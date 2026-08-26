# Change Reference Evidence And Spatial Routing

Create `reference.md` before design directions whenever screenshots, films, games, live pages,
concept art, diagrams, or other visual references influence the change. The file records observable
evidence; it must not jump directly from mood words to implementation.

## Required Decision

Record four independent decisions before selecting exactly one route:

- object dimensionality: `2d`, `2.5d`, or `3d`;
- camera model: none, fixed orthographic, fixed perspective, or navigable perspective;
- interaction model: none, bounded parallax, inspectable, or navigable;
- output surface: screen-space UI, locked cinematic frame, or interactive scene.

Then select exactly one route:

- `2d`: flat screen-space composition; no authored depth or spatial navigation.
- `2.5d`: planar UI with bounded perspective, parallax, or pseudo-volume; no navigable world.
- `3d`: a perspective or orthographic world with authored depth. Camera navigation is independent
  and may be absent for a fixed-camera cinematic shot.
- `hybrid`: a 3D world plus screen-space UI or DOM accessibility layers.

Evidence that activates the spatial route includes:

- near/far scale change, foreshortening, occlusion, vanishing lines, or camera-dependent overlap;
- volumetric containers, meshes, world-space labels, lights, shadows, reflections, or depth fog;
- orbit, pan, dolly/zoom, fly, inspect, or Blender/Maya-like viewport behavior, when exposed;
- UI whose hierarchy is attached to objects or planes in world coordinates.

Glow, blur, transparency, scanlines, and cinematic color grading are not 3D evidence by
themselves.

## Required Sections

`reference.md` must state:

1. source inventory and provenance, including whether each source resolves to a file path;
2. observable composition, type, color, material, lighting, and motion evidence, including the
   per-region structure table below;
3. spatial evidence for and against 3D;
4. selected route (`2d`, `2.5d`, `3d`, or `hybrid`) and confidence;
5. fidelity invariants that must survive implementation;
6. uncertain or missing evidence and how it will be tested;
7. resulting artifact requirements.

### Per-region structure

Section 2 must carry one row per comparable region, authored independently from the reference:

| Region | Rows | Columns | Contents left to right | Breaks from |
| --- | --- | --- | --- | --- |
| register-1 | 2 | 1 | label block above; full-width readout below | register-2, register-3 |
| register-2 | 1 | 3 | label block, mark badge, readout | none |
| register-3 | 1 | 3 | label block, mark badge, readout | none |

Then answer the uniformity question explicitly, in one line, with named exceptions:

```markdown
Uniform structure across regions? **No.** register-1 is a two-row block; registers 2 and 3 are
three-column rows.
```

Rules:

- the answer is `Yes` or `No`. An unanswered or hedged question is invalid.
- `Breaks from` is required on every row. `none` is a valid value; a blank cell is not.
- exceptions are named in this table, next to the regions they break from, never only in the
  surrounding prose.
- describe every region from the reference. `as above`, `same as previous`, `ditto`, and equivalent
  back-references are forbidden as region descriptions.
- the table exists whenever the reference contains two or more comparable regions; a single-region
  reference adds nothing and may omit it.

Record the same claim in the `composition` block of `reference-evidence.json`, with `uniform` and a
`regions[]` array of `id`, `rows`, `columns`, and `breaksFrom`. `composition` is a required root key
of a v2 document; omitting it fails validation with
`reference evidence: reference is missing composition`. A v1 document predates the block and stays
exempt, so archived changes remain readable.

Each region may also carry `contents`, the same independent reading the table's `Contents left to
right` column holds. Where it is recorded the back-reference rule is machine-enforced: `as above`,
`same as`, `see above`, `ditto`, and `idem` are refused anywhere in the string, with a message
prefixed `composition back-reference:`. Two regions may legitimately carry identical descriptions -
registers 2 and 3 above do - so identical text is never treated as evidence of copying.

`contents` is optional but not selectively optional. A composition that omits it from every region
predates the field and validates unchanged; a composition that records it for some regions and not
others fails with `composition contradiction:`, because a document that adopted the field and then
left one cell empty is the back-reference dodge without the words.

### Schema era

`design-pipeline.reference-evidence.v1` is a frozen legacy carrier, not a live schema version. It
records what an older document looked like; it is not a switch that turns the current checklist off.

- A document declaring v1 that stays inside the v1 feature set validates exactly as it always did.
  The absence of `intent` and `composition` there is a real signal about an older document, and
  nothing new is demanded of it retroactively.
- A document declaring v1 while carrying a **v2-era block** - `intent`, or a `graybox` block - is not
  an older document. It is current work wearing a stale version label, so it is validated as
  `design-pipeline.reference-evidence.v2` and owes both `intent` and `composition`. Missing either
  fails validation with a message beginning `schema era mismatch:`, which names the v2-era block
  found and the root keys still owed.

`graybox` earns its place in that trigger set on evidence, not chronology: the graybox comparison's
region ids are checked *against* the declared `composition`, so a graybox block with no composition
to bind to is a gate reporting success on evidence nothing could check. A v1 document that
*volunteers* a `composition` is supplying more evidence, not escaping a gate, so `composition` is
deliberately not a trigger. The repair is to add the two missing blocks; the version string may
stay as written.

Validation fails on a contradiction:

- `uniform: true` with any non-empty `breaksFrom`, or with differing `rows`/`columns`;
- `uniform: false` with no non-empty `breaksFrom`;
- `uniform: false` where a region departs from the modal `rows x columns` structure and neither
  declares a `breaksFrom` nor is named in another region's `breaksFrom`. Every structurally
  divergent region is named - by itself or by the region it breaks from - or the claim is a
  contradiction.

Those three fail with a message beginning `composition contradiction:`.

There is a fourth case, and it is an ambiguity rather than a contradiction. When no single
`rows x columns` structure is modal - two or more structures tie for the most regions - the document
never declared a norm, so no region gets the free pass of "this one just follows the norm". Every
region must then be accounted for: it records a `breaksFrom`, or another region names it. Any region
left unaccounted for fails validation with a message beginning `composition ambiguity:`, which names
the tied structures and the regions still unexplained.

The modal structure is read from the counts alone and never from declaration order. Reordering the
rows of the table cannot change the verdict - previously a tie was resolved in favour of whichever
tied structure happened to be written first, so the same regions passed or failed depending on how
the table was sorted.

Region ids are the names the graybox comparison addresses, so the structure claimed before the
render and the structure seen in the render are compared by name rather than by impression. The
binding runs in both directions, on both carriers, and at either schema version - a `composition`
that is present is applied whether the document declares v1 or v2. The comparison must address every
declared region id, and it may not name an id `composition` never declared.

An absent binding is not a satisfied one. A comparison that names regions while nothing recorded a
`composition` is asserting against a structure no document wrote down, so the graybox stage blocks:
`graybox-composition-unrecorded` when no `reference-evidence.json` exists at all, and
`graybox-composition-undeclared` when the document exists but records no `composition`.

### Source availability

Resolve the source to a file path before writing reference artifacts. A resolvable path unlocks
rectification, camera calibration, landmark error, and the fidelity receipt; ask the user for it and
say so. When no path is available, record `source.availability: pending` with `pendingReason` and
`requestedFrom`, leave `path`, `width`, `height`, and `sha256` null, and continue. Absent
`availability` means `resolved`, and a resolved source requires all four values. Never invent a
path, a dimension, or a hash. When a pending source later lands, run `designer-pipeline reference resolve --path "<file>"`.
It sets `availability: resolved`, fills path, width, height, and sha256 from the landed PNG,
records `resolvedAt`, strips `pendingReason`, and keeps `requestedFrom` and `requestedAt` so a run
that began pending stays identifiable afterwards. Do not invent those four values by hand.

Absent and invalid are different. An absent `availability` field means `resolved`, and so does an
absent `reference-evidence.json`, so documents written before the pending state existed keep their
behaviour on the measured chain. A field that is present but out of enum, a `source` that is not an
object, or a document that cannot be parsed is a loud failure: the reconstruction stages refuse to
measure and report `reference-source-availability-invalid`, `reference-source-malformed`, or
`reference-source-unparseable` with `measurements: null`. An unreadable declaration is not evidence
that the source was supplied.

A resolved `availability` is also not the same as a resolvable file, and neither absent case
resolves anything. The declared `source.path` must exist inside the change root before any
comparison may call itself `measured`. With no document, or a document that declares no `source`, no
path was named and no file was opened, so a `measured` comparison has nothing to stand on and blocks
with `reference-source-unrecorded` or `reference-source-undeclared` respectively. See the graybox
measurability rule in `reconstruction-spec.md`.

Write the same classification and evidence to normative `reference-evidence.json`, then run
`designer-pipeline reference check`. A valid contract remains blocked until its approval status is
`approved`. `blocked` with reason `source-pending` is a recorded state with `contractValid: true`,
not a contract failure, and it does not change requested or effective fidelity. Two or more recorded
spatial cues make a `2d` classification invalid.

Version 2 also records the reference role and the fidelity contract:

- `primary-target`: the implementation is compared back to this exact source.
- `constraint`: selected properties constrain the implementation but the whole frame is not a
  pixel baseline.
- `inspiration`: the reference informs direction only.
- `exact-reconstruction`: measured equivalence is required and cannot be silently downgraded.
- `adaptive-reconstruction`: measured comparison is required, with explicit documented
  adaptations.
- `directional-inspiration`: comparison is qualitative and must never be described as 1:1.

Words such as identical, exact, 一模一样, 1:1, reproduce, clone, pixel-accurate, and faithful copy
select `primary-target` plus `exact-reconstruction`. In that mode, `reference check` also runs the
geometry stage of the declared `reconstruction.json`; approval of the medium alone is not enough.
Only explicit user approval may downgrade requested exact fidelity, and the original request remains
recorded.

Every route requires an actual-runtime graybox before visual polish, including `2d`, `2.5d`, and
runs whose source is `pending`; see `reconstruction-spec.md`. Every route therefore names
`graybox.png` in `requiredArtifacts`, not only `3d` and `hybrid`; omitting it fails validation with
`reference evidence: every reference route requires graybox.png`. `reference check` also evaluates
the graybox stage on every call and reports it under `stages.graybox`, and it returns `blocked`
whenever that stage is not `ready` - reason `graybox-missing` for a change with no graybox block,
`graybox-invalid` for one that could not be validated, `graybox-mode-unverifiable` for one whose
`runtimeMode` is a bare token that names no disabled layers. Optical treatment is what this gate holds
back: materials, glow, bloom, depth of field, scanlines, and grading. Detail geometry, type
treatment, and measured fidelity claims are held by the geometry gate instead.

`reference check` carries the spec-reconciliation gate the same way, under `stages.reconciliation`.
A gate an agent has to remember to run separately is not a gate, so `reconciliation check` is still
available on its own but is no longer the only place the result appears: the aggregate returns
`blocked` (exit 2) whenever the reconciliation stage is not `ready`, and its blockers trail the
aggregate's own. A reconciliation that cannot be evaluated at all is `blocked` with reason
`reconciliation-unverifiable`, never `ready` - the same rule `graybox-invalid` follows.

For `3d` and `hybrid`, also require
`scene.json` plus `3d.md`. Navigation is required only when the interaction model is inspectable or
navigable. For
persistent non-3D renderers or narrative runtimes, require `scene.json` plus
`scene.md`. For ordinary `2d`, neither runtime artifact is required unless a persistent engine owns
state.

For exact or adaptive static-reference reconstruction, also require
`rectified-reference.png`, `front-elevation.svg`, `camera-calibration.json`,
`landmark-overlay.png`, and `reconstruction.json`. Follow `reconstruction-spec.md`.

## Anti-Shortcut Gate

Do not satisfy a spatial reference by arranging flat cards and adding bloom. Before polishing,
verify perspective, near/far scale, occlusion, the declared camera constraints, object pivots,
world/screen-space ownership, and a usable non-3D fallback. Do not add orbit, pan, or dolly controls
when the approved output is a locked cinematic frame.
