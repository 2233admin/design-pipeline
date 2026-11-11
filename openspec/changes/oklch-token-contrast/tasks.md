# Tasks

## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta; Closes #357.
- [x] 1.2 `npm exec -- openspec validate oklch-token-contrast --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `brand-design-systems-core.cjs`: `parseColor` marks an `oklch()` value outside sRGB (also through `color-mix()`), `normalizeTokens` lists such tokens in `clamped`, `inspect` returns `clampedTokens`; export `parseColor`.
- [x] 2.2 `design-system-package-core.cjs`: `rgbaOf` measures `oklch()` through `parseColor`; `out-of-gamut` finding per token; the unmeasurable-colour message names oklch.
- [x] 2.3 `parseColor` reads the oklch() forms the bundled guidance uses: `none` for a powerless component, a chroma percentage, a negative hue (review of #362).

## 3. Docs and tests

- [x] 3.1 `design-system-package.md`, `design-md.md`, CHANGELOG.
- [x] 3.2 `design-system-package.test.cjs`: passing and failing oklch pairs with CLI exit codes 0 and 2, hex against its oklch equivalent within 0.05, one `out-of-gamut` finding, the `lab()` message.
- [x] 3.3 `brand-design-systems.test.cjs`: `outOfGamut` on `parseColor`, `clamped` on `normalizeTokens`.
