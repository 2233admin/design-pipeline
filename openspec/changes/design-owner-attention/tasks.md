## 1. Change records

- [x] 1.1 Write proposal.md, design.md and the principle-level spec delta.
- [x] 1.2 `npm exec -- openspec validate design-owner-attention --strict` is valid and
  `npm run specs:check` passes (29 passed, 0 failed).
- [x] 1.3 Owner answers the open questions in design.md; record the answers here before any
  implementing change starts. The owner delegated them: open each option when the situation calls
  for it. Recorded under "Owner decisions" in design.md.
- [x] 1.4 Re-scope #109 and #110 to point at this change.

## 2. Implementing changes (one OpenSpec change and PR each, in phase order)

- [x] 2.1 Phase 1: ask shape and budget, owner-facing language, feedback scope (`owner-attention-asks`).
- [x] 2.2 Phase 2: change tiers (`owner-attention-change-tiers`); the page tier moved to phase 3, which brings the per-element comparison it needs.
- [ ] 2.3 Phase 3: page review lite and owner confirmation provenance; 3a (`owner-attention-page-refs`: numbered references, `--ref`, quoted web acceptance) is in progress, 3b (overlay, comparison, page tier) follows.
- [ ] 2.4 Phase 4: absence (states, inbox, away summary) and delegation over time.

## 3. Verification

- [ ] 3.1 Repeat the two-section walkthrough after phase 1: count owner interventions, missed key
  questions and rework.
- [ ] 3.2 Hallway test after phase 3 with someone who has not read the docs: build a page, request
  one local change, leave and return; note where they stop engaging.
