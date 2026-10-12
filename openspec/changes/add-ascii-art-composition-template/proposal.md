# Proposal

## Why

The user wants the animated ASCII art style of github.com/2233admin/ascii (a fork of
bas3line/ascii, published as npm `ascii.rest`) available as a design-pipeline starting point, so
web and capture/film agents start from tested pieces and a seekable player instead of hand-writing
ASCII renderers, as the one-off `experiments/ascii-canvas-launch/` film did with its own donut.

The upstream forms cannot be captured as they are. `mount()` advances only on
`requestAnimationFrame` while the page is visible, and the `<ascii-art>` element loads its modules
from ascii.rest at runtime, while compositions forbid network access and render-time clocks
(`skill/references/hyperframes.md`). Some pieces also depend on earlier calls: doom fire advances a
simulation by the time since its previous frame, and the coloured scenes fill a colour cache from
earlier frames, so asking a piece for time t directly is not repeatable.

## What Changes

- Vendor the needed upstream bytes of npm `ascii.rest@0.4.0` under `skill/vendor/ascii-rest/`:
  the MIT `LICENSE`, `package.json`, the piece contract `dist/types.d.ts`, the reference renderer
  `dist/mount.js` and eleven self-contained piece modules (donut, the eight effects pieces,
  night-coast and ocean-sunset). `manifest.json` records the package version, tarball integrity,
  upstream repository and revision `1848fa5`, the user's fork as an alias, a sha256 per file and
  each piece's call-history behaviour.
- Add `--template ascii-art` to the existing `composition scaffold`. Its maintained files live in
  `skill/tools/ascii-art/`. The copied project opens from disk without network: `pieces.js`
  carries the exact text of the vendored piece modules and the page evaluates them itself.
- The page draws `frame(t, env)` for an explicit time into a `<pre>` (mono pieces) or onto a canvas
  (pieces with a palette), from a preset table (piece, options, sample rate, grid, ink, ground,
  duration) chosen by URL hash or query, a control, or a `data-preset` attribute.
- Reuse the existing capture contract: `window.renderStudy(progress)` and the
  `window.__timelines` seek hook that `composition capture --seek` calls. A seek replays the piece on
  the preset's sample grid, so the same time gives the same frame in any seek order. A live preview
  loop serves live viewing only and honours `prefers-reduced-motion`.
- Document the template, its presets, capture and the npm/CDN alternative for live sites; add the
  third-party notice, CHANGELOG entry, package resources and a focused test file.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: adds requirements for the ASCII art composition template, its pinned vendored
  source, time-addressed frames, the capture contract and the reduced-motion live preview.

## Impact

- New: `skill/vendor/ascii-rest/`, `skill/tools/ascii-art/`, `tests/ascii-art.test.cjs`.
- Changed: `skill/tools/visual-craft/scaffold.cjs` (template list and copy table), the CLI help it
  feeds, the help assertion in `tests/designer-pipeline-cli.test.cjs`, `.gitignore` (the package's
  `dist/` layout under the vendor bundle), `.gitattributes`, `package.json` (`sources:check`),
  `scripts/test-manifest.json`, `skill/references/package-resources.json` and documentation.
- Reused: `composition scaffold` containment and refusal rules, `composition capture` and its seek
  hook, the composition gate. No new CLI flag, gate, receipt schema, target resolver or policy
  digest. The component source catalog is not changed; registering the template there is a
  follow-up. `experiments/` is not changed.
