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
- `uniform: true` requires every `breaksFrom` to be empty and every region to share `rows` and
  `columns`, so the flag cannot contradict the rows;
- `uniform: false` requires at least one non-empty `breaksFrom`.

The contradiction check is the point. It catches the exact failure observed: a uniform claim stated
alongside rows that are not uniform.

## Interaction With The Graybox

Once `add-unconditional-graybox-gate` lands, the graybox comparison SHALL reference these region ids,
so the structural claim written before the render and the structure seen in the render are compared
by name rather than by impression.

## Cost

One table. It is deliberately shallow: rows, columns, left-to-right contents, and what each region
breaks from. Deeper structure belongs in `design.md`, which by then has a render behind it.
