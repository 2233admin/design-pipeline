# Design: Pending Source State

## Schema Delta

`reference-evidence.schema.json`, `source` object:

```json
"source": {
  "availability": "resolved" | "pending",
  "path": "design/changes/<id>/source.png" | null,
  "kind": "image",
  "width": 722 | null,
  "height": 406 | null,
  "sha256": "<64 hex>" | null,
  "pendingReason": "supplied in conversation transcript; not written to disk",
  "requestedFrom": "user",
  "requestedAt": "<iso8601>",
  "resolvedAt": "<iso8601>"
}
```

Conditional requirements:

- `availability: resolved` requires non-null `path`, `width`, `height`, `sha256`, and forbids
  `pendingReason`.
- `availability: pending` requires `pendingReason` and `requestedFrom`, allows null `path`,
  `width`, `height`, `sha256`, and forbids `resolvedAt`.
- `resolvedAt` present implies `availability: resolved` and records that the run began pending.

Existing v2 documents with no `availability` field default to `resolved`, so nothing already written
becomes invalid.

## Status Semantics

`designer-pipeline reference check` gains a distinct outcome:

| Source | Contract | Result | Meaning |
| --- | --- | --- | --- |
| resolved | valid, approved | `ready` | unchanged |
| pending | valid, approved | `blocked`, reason `source-pending` | classification is usable, measurement is not |
| pending | invalid | `invalid` | unchanged |
| any | approval pending | `blocked`, reason `approval-pending` | unchanged |

`blocked` on `source-pending` is explicitly not a failure of the change. It is the correct resting
state for a run whose reference lives outside the repository. The distinction matters because
`blocked` currently reads as "something went wrong", and this state is "something is known to be
missing and has been asked for".

## Interaction With Other Gates

- The graybox stage is unaffected. It never needed the raster.
- `reconstruction check --stage geometry` and `--stage final` SHALL refuse to run against a
  `pending` source and report `blocked`, never `fidelity-limited`. A threshold miss cannot be
  claimed when nothing was measured.
- `intent.requestedFidelity` remains whatever the user asked for. A pending source is not a
  downgrade trigger, and `intent.downgrade.status` stays `not-requested`.

## Why Not A Sentinel Hash

A reserved value such as sixty-four zeroes was rejected. It keeps the field's shape but makes every
consumer responsible for recognising the sentinel, and any consumer that forgets will treat an
unmeasured reference as measured. An explicit `availability` discriminator fails loudly instead.
