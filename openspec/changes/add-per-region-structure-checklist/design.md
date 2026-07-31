# Design: Per-Region Structure Checklist

## Artifact Shape

`reference.md` section 2 gains a required table:

| Region | Rows | Columns | Contents left to right | Breaks from |
| --- | --- | --- | --- | --- |
| register-1 | 2 | 1 | label block above; full-width readout below | register-2, register-3 |
| register-2 | 1 | 3 | label block, mark badge, readout | none |
| register-3 | 1 | 3 | label block, mark badge, readout | none |

Followed by a required, explicitly answered question:

```markdown
Uniform structure across regions? **No.** register-1 is a two-row block; registers 2 and 3 are
three-column rows.
```

The answer must be `Yes` or `No` with named exceptions. An unanswered or hedged question is invalid.

`Breaks from` is required on every row. `none` is a valid value and is not the same as leaving it
blank.

## Machine-Readable Form

`reference-evidence.json` gains:

```json
"composition": {
  "uniform": false,
  "regions": [
    { "id": "register-1", "rows": 2, "columns": 1, "breaksFrom": ["register-2", "register-3"] },
    { "id": "register-2", "rows": 1, "columns": 3, "breaksFrom": [] },
    { "id": "register-3", "rows": 1, "columns": 3, "breaksFrom": [] }
  ]
}
```

Validation rules:

- at least two regions, or the checklist adds nothing;
- region ids are unique, and every `breaksFrom` entry names a declared region other than its own;
- `uniform: true` requires every `breaksFrom` to be empty and every region to share `rows` and
  `columns`, so the flag cannot contradict the rows;
- `uniform: false` requires at least one non-empty `breaksFrom`, and then requires every exception
  to be accounted for by name - see below.

The contradiction check is the point. It catches the exact failure observed: a uniform claim stated
alongside rows that are not uniform.

## Accountability Under `uniform: false`

One named exception is not enough, and this is stricter than the rule this design first carried.
The norm is the modal `rows x columns` structure: whichever key the most regions share, counted
from the regions alone. Declaration order never enters it, so an author cannot flip the verdict by
reordering the table.

A region is accounted for when the document says something about it - either it records a non-empty
`breaksFrom`, or another region names it as the thing being broken from. Every region that departs
from the modal structure must be accounted for. A region that matches the modal structure needs no
entry: it is following the declared norm.

A tie has no implicit norm. When two or more `rows x columns` keys share the top count, no
structure is modal, so no region gets the free pass of "this one just follows the norm" and every
region must be accounted for explicitly. Picking the first-written key, or the larger group, would
both be guesses that make the verdict depend on how the table was ordered.

The two failures are kept apart by their reason strings:

- `composition contradiction:` - `uniform: false` with no `breaksFrom` recorded anywhere, or a
  region that differs from a single modal structure without naming what it breaks from;
- `composition ambiguity:` - no structure is modal, and at least one region is unaccounted for. The
  message names the tied structures, how many regions each describes, and the unaccounted regions,
  and tells the author to record what each one breaks from.

## Interaction With The Graybox

Once `add-unconditional-graybox-gate` lands, the graybox comparison SHALL reference these region ids,
so the structural claim written before the render and the structure seen in the render are compared
by name rather than by impression.

## Cost

One table. It is deliberately shallow: rows, columns, left-to-right contents, and what each region
breaks from. Deeper structure belongs in `design.md`, which by then has a render behind it.
