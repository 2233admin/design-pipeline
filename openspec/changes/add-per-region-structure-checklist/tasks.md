# Tasks

- [x] Add failing tests: `uniform: true` alongside a non-empty `breaksFrom` must fail validation.
- [x] Add the required per-region table to `reference-spec.md` section 2.
- [x] Require an explicitly answered uniformity question with named exceptions.
- [x] Require `breaksFrom` on every region row; accept `none`, reject blank.
- [x] Add the `composition` block to `reference-evidence.schema.json` with the contradiction check.
- [x] Require at least two regions before the checklist applies.
- [ ] Reject `as above` and `same as previous` as region descriptions. `reference-spec.md` and
      `qa-checklist.md` forbid them and a test asserts the spec says so, but the `composition` block
      carries no contents field and nothing parses the `reference.md` table, so no code rejects
      anything. This is documented, not enforced.
- [x] Bind graybox comparison regions to these ids once the graybox gate lands.
- [x] Run focused tests, full tests, and package QA.
