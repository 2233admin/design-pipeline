# Design: Spec Ordering And Drift Reconciliation

## Ordering

| Reference role | Order | Reconciliation |
| --- | --- | --- |
| `primary-target` | reference evidence, graybox, `design.md`, implementation | required |
| `constraint` | reference evidence, `design.md`, implementation - the existing order, retained | required, after the first render |
| `inspiration` | reference evidence, `design.md`, implementation - the existing order, retained | required, after the first render |

Only the ordering differs by role. For `primary-target` the graybox is cheap and precedes the
expensive artifact: it is authored from `reference.md` alone, which is observation, not
specification, so `design.md` then records values that have already survived one render. For
`constraint` and `inspiration` the existing order is retained and nothing is moved.

Reconciliation is required for every change that has a reference, whatever the role. There is no
optional path. An earlier draft of this design made reconciliation optional for `inspiration`; that
was the error. A directional reference still produces specified values, those values still drift
under the first render, and an undocumented drift is the defect this change exists to catch. The
gate is role-agnostic in the same way: it asks whether the change has a reference at all, not what
the reference is for.

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
that exists on disk. The gate reads the presence of a reference, never its role, so `inspiration`
is not exempt.

## Why Not Just Delete The Spec

Dropping `design.md` for reconstructions was considered and rejected. The spec is what makes the
result reusable and reviewable, and it is the only place tokens, type scale, and accessibility
posture are stated. The defect is not that the spec exists, it is that it was written before anyone
looked and never re-checked afterwards.
