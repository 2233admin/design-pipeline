# Tasks

- [x] Add failing tests: `uniform: true` alongside a non-empty `breaksFrom` must fail validation.
- [x] Add the required per-region table to `reference-spec.md` section 2.
- [x] Require an explicitly answered uniformity question with named exceptions.
- [x] Require `breaksFrom` on every region row; accept `none`, reject blank.
- [x] Add the `composition` block to `reference-evidence.schema.json` with the contradiction check.
- [x] Require at least two regions before the checklist applies.
- [x] Reject `as above` and `same as previous` as region descriptions through the per-region `contents`
      field and validator; identical independent descriptions remain valid, while partial contents
      adoption and neighbour back-references fail closed.
- [x] Bind graybox comparison regions to these ids once the graybox gate lands.
- [x] Run focused tests, full tests, and package QA.
