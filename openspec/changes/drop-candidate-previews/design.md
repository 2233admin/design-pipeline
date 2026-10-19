# Design

## Core

`checkDirectionPreview` treats `applicability.status: required` as one shape. With a change root,
`directionFindings` reports a missing `medium`, `cards`, `thumbs` or a version count other than three
as findings with fixes (`medium-missing`, `cards-count`, `thumbs-missing`, `versions-count`), so `next`
returns a run action naming them. For a receipt alone (no root, nothing on disk to check), a missing
`medium`, `cards` or `thumbs`, or a version count other than three, is a contract error. The divergence
check (four axes apart, including luminance or era) and the waiver form are unchanged.

## Workflow

`workflows/directions.cjs` no longer special-cases a ready receipt without cards: such a receipt is no
longer ready.

## Not changed

Receipt schema id, waiver reasons, selection and delegation rules, the ledger and `direction draw`.
