# Design: Spec Ordering And Drift Reconciliation

## Ordering

| Reference role | Order |
| --- | --- |
| `primary-target` | reference evidence, graybox, `design.md`, implementation |
| `constraint` | reference evidence, `design.md`, implementation, reconciliation |
| `inspiration` | unchanged; reconciliation optional |

For `primary-target` the graybox is cheap and precedes the expensive artifact. The graybox is
authored from `reference.md` alone, which is observation, not specification. `design.md` then
records values that have already survived one render.

## Drift Record

`design.md` gains a required trailing section for any change with a reference:

```markdown
## Spec Reconciliation

Graybox: `graybox.png`, captured <iso8601>
Reconciled: <iso8601>

| Value | Specified | Implemented | Cause |
| --- | --- | --- | --- |
| board unit | clamp(6px, 1.35vw, 18px) | clamp(7px, min(3.95vh, 2.62vw), 36px) | render showed the board roughly 40% oversized |
| register 1 structure | [label][mark][readout] | label above full-width readout | reference reading corrected at first render |
```

`Cause` is required and must describe an observation, not an intention. "Looked better" is not a
cause; "render showed X" is.

An empty table is a valid outcome and means the spec survived contact unchanged. An absent section
is not.

## Gate

`qa.md` gains a Spec reconciliation row. It is `blocked` when a change has a reference and
`design.md` has no reconciliation section, and `ready` when the section exists and cites a capture
that exists on disk.

## Why Not Just Delete The Spec

Dropping `design.md` for reconstructions was considered and rejected. The spec is what makes the
result reusable and reviewable, and it is the only place tokens, type scale, and accessibility
posture are stated. The defect is not that the spec exists, it is that it was written before anyone
looked and never re-checked afterwards.
