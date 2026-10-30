# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate internalize-upstream-methods --strict` and `npm run specs:check`.

## 2. Distillations (creative: draft, then owner/lead review before merge)

- [x] 2.1 `references/mobile-web.md` (emil `mobile-native`).
- [x] 2.2 Compositor section and subtract pass in `animation-opportunity-and-review.md` (emil `animation-performance`, `remove-animations`).
- [x] 2.3 `references/worst-case-content.md` (jakub `break`); scenario ids map to existing matrix states. Gate support for the optional extra ids is in 3.x.
- [x] 2.4 `references/interface-defaults.md` (raphael `defaults`).
- [x] 2.5 `references/timeline-deconstruction.md` (raphael `deconstruct`), indexed in the tool table.

## 3. Code and data

- [ ] 3.1 Anti-slop render checks: first-viewport column overflow, stragglers, clipped overflow containers, browser surfaces (design.md 2); gate-map entries.
- [ ] 3.2 Vendor ui-ux-pro-max `google-font-licenses.json` at `28b3b8d`; lookup in `references/fonts.md`.
- [ ] 3.3 Refresh `skill/vendor/mengto-skills/` to `a45892d2fdadab75b31fb16abecc02f101b31c43` with `web-design/html-demo/**` in scope (not `media/html-reel`); manifest, notices, `package-resources.json`, route rows (web section, product-film source).
- [ ] 3.4 `THIRD_PARTY_NOTICES.md` concept credits for every distillation.

- [ ] 3.5 Component state matrix accepts the optional worst-case ids from `worst-case-content.md` as declared states.

## 4. Verification

- [ ] 4.1 Tests for the spec scenarios, each new test file registered in `scripts/test-manifest.json`; `npm run sources:check`; `npm test` green; CHANGELOG entry.
