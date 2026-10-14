# Pin film reference provenance

## Why

Step 5 of `redesign-user-workflow` ports ideas from two reference skills, motion-web and onetake.
Both have non-commercial licenses (CC BY-NC 4.0 and PolyForm Noncommercial 1.0.0), so only ideas
may enter this MIT repository, and every adopted idea needs an auditable source record first.

The only existing motion-web record lives in uncommitted work in the `product-animation-integration`
worktree (now backed up on `backup/product-animation-wip`). It was reviewed on 2026-09-18 with a
30-day freshness window, so it expires on 2026-10-18. onetake has no record at all.

## What changes

- `skill/references/reference-skill-motion-web.md` and `reference-skill-onetake.md` carry one
  `sourceMeta` each: the canonical repository (`feitangyuan/*`; `2233admin/motion-web` is a fork),
  pinned revision, content hash of `README.md` and `LICENSE`, license, `codeCopied: false`, and an
  ideas-only use boundary.
- motion-web was re-reviewed on 2026-09-28: upstream is still at `5f4e40f1`, and the recomputed hash
  equals the 2026-09-18 value. onetake is pinned at `36072d36`.
- `tests/source-governance.test.cjs` asserts both records and fails once a record is older than
  `reviewedAt + freshnessDays`, so the next review cannot be missed.

The rest of the WIP (motion-first capability reference, animation runtime and verification) is
not ported here. It depends on contracts this line does not have, and it is ported idea by idea in
later step 5 changes that cite these records.
