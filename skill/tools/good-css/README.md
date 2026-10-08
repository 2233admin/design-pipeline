# Good CSS offline studies

Use this tool while writing or reviewing CSS, utility classes, inline styles or CSS-in-JS:
intrinsic layout, tokens, typography, content and overflow, focus/hover/press/form states,
native disclosures, popovers, scrolling or CSS motion. Start with
[the project adaptation guide](../../references/good-css.md), then load the applicable
original practice and inspect its specimen. Existing project DESIGN/MOTION decisions and
the target browser remain authoritative.

## Build and inspect

Run with Node.js 22.12+ from your project, using the actual installed skill path:

```sh
node /absolute/path/to/design-pipeline/tools/good-css/build-study.cjs --output ./good-css-study
```

The output must be a new directory whose parent already exists. An existing file, directory
or symbolic link is refused without changes. Every source and fixture is loaded before any
output is written, and a temporary sibling directory is published only after all writes succeed.
Build outside the preserved vendor source; choose a fresh output after an upstream update.
No package install, upstream script execution, network request or deployment is involved.

Open `good-css-study/index.html` directly in a browser. It links all **47** standalone pages
under `specimens/<practice-slug>.html`, including both panel tones, the fixture's original
observable check and its starting frame height, and the complete original practice text.
Resize the browser window to inspect responsive cases. `assets/` contains the byte-preserved
local public assets and font licenses; `source/` contains the original `PRACTICES.md` and MIT
license. The purposely invalid image data URL in the upload specimen demonstrates failure
handling and is expected to remain a broken image.

The cross-document specimen retains the upstream `page=a` / `page=b` pattern: its links
navigate to the explicit relative HTML filename with a new query, loading a real second
document. This works for both `file://` navigation and an HTTP server. `panel=light` follows
the original harness behavior; its navigation links return to the original default panel.
For same-origin view-transition inspection, serve the output through your project's existing
local HTTP server. `file://` can load the pages and navigate but may not support that effect.
Illustrative site-root example routes are localized to `specimens/css-destination.html`;
the original fixture click handlers and diagnostics still handle the demonstrated interaction.

## Source and adaptation

The complete pinned source is [vendor/good-css/upstream](../../vendor/good-css/upstream/).
The maintained builder reads its `PRACTICES.md`, `harness/tokens.css`, `harness/demos/base.css`,
all matching HTML fixtures, and `harness/public/` using Node stdlib. It follows the reviewed
`harness/practices.js`, `harness/demos/index.js` and `harness/frame.js` assembly: code blocks
in source order, unlayered practice CSS over layered fixture cosmetics, HTML at every fixture
placeholder, and practice JS in an inline module at the end. It does not import those modules
or their dependencies. The parser supports the pinned ATX-heading/triple-backtick format and
rejects drift, missing templates, missing assets or incomplete practice coverage.

Generated pages rewrite only the font asset URLs, illustrative example destinations and the
cross-document relative navigation URL. Vendor bytes stay unchanged. Original rules, credits
and browser-version claims remain visible source evidence; verify current support on the
actual target instead of treating those version claims as fresh compatibility evidence.

## Browser limits and verification

Native CSS nesting, OKLCH and `color-mix()` underpin the upstream harness. Older browsers may
render the fixture poorly; use an appropriate supported browser for study and adapt the
technique to the project's own compatibility baseline. Do not treat a missing effect as a pass.

- Without text-box trim, retain normal line boxes; verify label alignment and control target sizes.
- Without field sizing, a fixed textarea still scrolls. Without interpolate-size, native details
  still opens and closes. Preserve those usable results when adding either enhancement.
- Without anchor positioning, the popover uses its centered native position. Without native
  popovers or declarative dialog commands, the original controls may not open: record that
  unsupported interaction and use the project's existing accessible disclosure/dialog behavior.
- Without scroll timelines, the row should still scroll without the edge fade. Without
  cross-document view transitions, links still navigate immediately. Without `@starting-style`
  or discrete transitions, check that the underlying open/close state remains usable.
- The anchored active indicator may be absent where anchor positioning/scope is unsupported;
  the fixture preserves its independent `aria-current` and text/color cue.
- Safe-area values need real device/browser chrome evidence. Desktop zero values and simulated
  pointer/hover settings do not establish notch, pull-to-refresh or rubber-band behavior.

Inspect real narrow/wide layout, RTL/CJK/zoom/content, keyboard focus, open/close states and
reduced motion. Record browser/version, URL, dimensions, actions and observed limitations in
the task's existing QA/evidence documents. Browser inspection is scoped technical evidence;
**Component Conformance** requires the actual project's controls/contracts and
**Visual Acceptance** remains a separate review of appearance and motion.

These live interaction studies run normal browser time. The timer and continuously sampled
readouts intentionally keep their upstream behavior. A film requires the existing deterministic
pause/seek ownership and cold/reordered frame verification; these studies do not supply it.
