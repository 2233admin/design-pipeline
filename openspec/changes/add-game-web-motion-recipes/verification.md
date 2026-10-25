# Verification: Game and Web Motion Recipes

## Exercised behavior

All four original specimens were opened from `file://` in a real managed Chromium browser. Their HTML contains no remote scripts, fonts or assets. Fresh screenshots and state sampling were used; the reference site's demonstration was not substituted for the delivered code.

| Recipe | Normal and interruption observations | Reduced motion / semantics |
| --- | --- | --- |
| HP ghost bar | Damage immediately produced HP 80 with ghost 100/Holding; ghost then sampled 97.9/Settling. A heavy hit retargeted to HP 35 from ghost 95.9, rather than restarting from 100. Healing aligned both at 60. A three-hit burst committed HP 70 and settled at 70. | Checkbox reduction aligned immediately. Live system reduction during a hit aligned HP/ghost at 50. Meter value and readable HP stayed authoritative. |
| Cooldown completion | Restart at ≥70% elapsed left the replacement Cooling with zero completions after the old deadline. Cancel returned Ready without cue. A genuine completion produced Ready/enabled while cue remained active; it then became inactive with count still 1. | Reduced run completed with count 2 and no cue; moving arc hidden. Live system reduction during an actual ability use retained one use, one completion and Ready. |
| Reward arrival | First grant committed 10 before flight ended. Three rapid grants produced total 30/count 3 with one flight. Cancelling retained 30; a later arrival retained committed 40. Reset cancelled pending presentation and stayed at zero. | Checkbox and live system reduction retained the exact grant (10) with hidden coin and zero animations. |
| Menu switch | Open/close/reopen ended open, visible and active after stale exit timing. Selecting Settings/Inventory made only that view available and focused its heading. Settings captions operated. | Closing immediately set inert/aria-hidden. Native Tab reached Overview when open; Escape closed and returned focus to the toggle. Checkbox/live system reduction retained the latest open state with zero animations. |

Media-emulation changes dispatch asynchronously. One exploratory smoke assertion sampled before the preference-change event; the corrected smoke waited for the displayed mode/state condition and passed without a source-code fix. Normal and reduced modes were explicitly exercised; the browser's default reduced preference was not mistaken for normal playback.

No measured FPS, target-device performance, full cross-browser/mobile matrix, back-forward-cache behavior or owner Visual Acceptance is claimed.

## Discovery and packaging

- Existing `design-system search --root skill --snapshot references/component-source-catalog.json --kind doc` retrieved each recipe through its exact Chinese and English phrase.
- After the concurrent merge, all four records were again returned for `motion-recipe/`, and each exact Chinese scenario search returned its method. These are original project-owned doc/method records, not component adoption receipts.
- `--platform web --query motion-recipe/` returned an empty result before and after integration repair, preserving component-only filtering.
- `npm run package:skill -- --output-root .design-pipeline/motion-recipes-package` succeeded after conflict repair, before the later canonical-source correction and concurrent explanation-tool registrations. Required resources include the four guides, four specimens and two indexes.
- Archive-member reads confirmed the recipe index, final HP title and strict two-sided film predicate in that ZIP. **That archive is now superseded, not final delivery evidence:** it predates `source/design-pipeline/motion-recipes`. Final rebuilding remains tied to completion of the ambient explanation-tool change; do not reuse this archive as a validated final package.

## Concurrent merge repair

A concurrent merge introduced markers into CHANGELOG, package-resources, film-core and film-continuity tests while the first full QA was running. That QA failed on `film-core.cjs` syntax and repository-state drift; it is not passing evidence.

Release notes preserve the independent current-main audit fixes, recipe/UI-transition additions and expanded tracking-HUD description. Packaging retains all ten recipe resources. The catalog's four method entries and other existing entries were preserved.

The film conflict was resolved by preserving the current-main strict double bound and its existing boundary/inversion regressions, as explicitly required by `fix-film-alignment-and-correlation-contracts/proposal.md`; the older one-sided inclusive predicate was not restored. No new film behavior or regression was authored in this change. All four touched files had zero content conflicts and their resolution was staged; no merge commit or push was performed.

## Repository checks

- `npm exec -- openspec validate add-game-web-motion-recipes --strict`: passed.
- Post-merge focused existing catalog, package-release and film-continuity checks: 30 passed, 0 failed, 0 skipped.
- Post-merge `npm run specs:check`: 30 items passed, 0 failed. Existing informational archive-applicability notices remain outside this change.
- Post-merge `npm test`: failed. The repository-test phase reported 1475 passed, 1 failed, 4 skipped; the single failure was our missing canonical recipe source. The source record was added and the existing canonical identity/license/local-pointer checks subsequently passed. Packaging also failed while the concurrent `internalize-answer-me-with-html` change was registering files not yet written, and the worktree changed during QA. The later focused run had 22 passed/1 failed: its only failure was that concurrent tool's new vendor/companion source URLs lacking a catalog source record, not recipe source registration. Complete repository QA remains blocked until that owner finishes its test/source/package registrations and the worktree is stable; task 3.3 stays open.
- Final focused recipe integration invariants (`--test-name-pattern "record IDs and canonical sourceIds|every index local pointer|source records declare"`): 3 passed, 0 failed. This is deliberately scoped to identity/license/local-path contracts; it does not conceal or count the concurrent explanation-tool inventory failure as passed.
- Final strict validation of `add-game-web-motion-recipes`: passed. At the final prerequisite check, the explanation tool still had no canonical catalog source and its declared `answer-me-with-html-sources.test.cjs` was absent; `renderer.mjs` and the consumer test had since appeared. That evolving external work must converge before an honest full-suite/reproducible-package run.

## Acceptance boundary

This evidence establishes the exercised technical behavior and local discovery/package path. Component Conformance and owner Visual Acceptance remain separate. No new motion gate, receipt schema, source export, external license grant or animation runtime was introduced. Existing project motion/transition/QA guidance governs adaptation.

## Final integration run (2026-10-25)

- Setup: `npm ci` and `npm run browser:install` on the integration tree; the earlier blocker (concurrent explanation-tool registration) has converged.
- `npm run specs:check`: 35 items passed, 0 failed.
- `npm test`: after fixing one real defect (`text.japanese-ime` validate did not reject `selected` outside `candidates`; added a relation check in `text-semantic.js`, regenerated `full/data.js`), the remaining failures were ambient: Git's GNU `tar` ahead of `C:\Windows\System32\tar.exe` on PATH (`film-sources`, `ui-craft-sources`; both pass with Windows tar first: 10/10 and 18/18) and browser/protocol timeouts under memory pressure (`interaction-audit`, `component-eval`, `art-motion-tools`; each passes alone: 20, 18, 12 passed, 0 failed).
- This evidence covers technical behavior only; Component Conformance and owner Visual Acceptance remain separate.
