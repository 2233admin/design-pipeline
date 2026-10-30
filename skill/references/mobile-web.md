# Mobile web

Scope: platform-layer rules for web UI that is used on a phone. They cover viewport units, safe areas,
touch input, scroll chaining, hover, the software keyboard and the browser chrome. They do not cover
motion (see `animation-opportunity-and-review.md`) or general CSS craft (see `good-css.md`). Where
`good-css.md` already owns a rule, this file only points to it. Use capability queries, never user-agent
or screen-width guesses, to detect touch.

Source: Distilled from emilkowalski/skills mobile-native at a81dbca (MIT); wording and selection are this repository's.

## 1. Viewport units

`vh` on a phone equals the tallest viewport, with the browser bars collapsed. With the bars showing, a
`100vh` box overflows and a bottom-pinned control sits under the toolbar. Use the newer units.

| Unit | Meaning | Use for |
| --- | --- | --- |
| `svh` | Smallest viewport, bars showing | Heroes and first screens. Never overflows, never shifts on scroll. |
| `dvh` | Current viewport, tracks the bars | App shells, drawers and sheets that must fill the visible area. |
| `lvh` | Largest viewport, bars hidden | Rarely. Decorative backgrounds that may extend under the bars. |

```css
.app  { height: 100dvh; }
.hero { min-height: 100svh; }
```

- Avoid `dvh` for scrolling page content. It resizes mid-scroll and the layout jumps.
- See `good-css.md`, the-reset, for the accepted shell behaviour.

## 2. Tap highlight

iOS Safari and Android Chrome paint a translucent box over tapped elements. It fights any press
feedback you designed.

```css
html { -webkit-tap-highlight-color: transparent; }
```

- Set it once, globally.
- In the same change, give every tappable element an `:active` or pointer-down state. Removing the
  highlight removes the only feedback the browser gave.
- Press feedback rules live in `good-css.md`, press-feedback.

## 3. Input zoom and the 16px rule

iOS Safari zooms into any focused field whose font size is under 16px and does not zoom back out on
blur. The user is left with a cropped, shifted page.

```css
input, textarea, select { font-size: 16px; } /* floor, not target */
```

- Fix the font size. Never add `user-scalable=no` or `maximum-scale=1`. Both block pinch zoom and fail
  accessibility checks.
- If desktop needs smaller text, restore it only for fine pointers with `@media (pointer: fine)`.
- Choose the right keyboard: `type="email"` or `"tel"`, `inputmode="numeric"` or `"decimal"`,
  `enterkeyhint="send"`, `"search"` or `"done"`. Add `autocapitalize="none"` and `autocorrect="off"` for
  usernames and codes.

## 4. Tap latency and touch-action

Two causes stack. The browser may wait for a possible double tap, and the control may only react on
release.

```css
button, a, [role="button"] { touch-action: manipulation; }
```

- `manipulation` removes double-tap zoom on that element, so `click` fires without a wait.
- Show feedback on press, not on `click`. If script is needed, listen for `pointerdown`.
- For custom gestures, name the axes the browser may still handle:

```css
.carousel   { touch-action: pan-y; }  /* we take horizontal, browser keeps vertical */
.drag-pad   { touch-action: none; }   /* we take everything */
.sheet-grip { touch-action: pan-x; }  /* we take vertical drags */
```

- Use `none` only on an element that handles every axis. Otherwise users cannot scroll past it.
- Prefer native scroll with `scroll-snap-type` over a scripted carousel. See `good-css.md`,
  carousel-on-native-scroll.

## 5. Overscroll and pull-to-refresh

Scrolling past the top triggers pull-to-refresh on Android and a page rubber band on iOS. That is right
for a document and wrong for an app with its own scroll areas, a drag-to-dismiss sheet or a canvas.

```css
html, body { overscroll-behavior: none; }        /* app shell only */
.sheet-body { overflow-y: auto; overscroll-behavior: contain; }
```

- Use `none` on the root and `contain` on inner scrollers. `contain` keeps the area's own bounce but
  stops the page behind it from moving.
- Never call `preventDefault()` in a `touchmove` listener for this. It blocks scrolling and makes the
  listener non-passive.
- Root bounce policy: see `good-css.md`, no-rubber-band-bounce-on-desktop.

## 6. Safe-area insets

Without opt-in, the browser keeps the page inside the safe area. To paint edge to edge, extend the page,
then pad the content back.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.bottom-bar { padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)); }
```

- Without `viewport-fit=cover` every `env(safe-area-inset-*)` is `0px`.
- Pad fixed headers, tab bars, toasts and sheets. Normal flowing content rarely needs it.
- Detail and test notes: `good-css.md`, content-clear-of-the-notch.

## 7. Touch targets and spacing

- Make the hit area at least 44 by 44 CSS px for primary controls. WCAG 2.2 sets 24 by 24 as the
  minimum (SC 2.5.8). Treat 24 as the floor, not the goal.
- Size the hit area, not the glyph. A 16px icon can sit in a 44px button, or use a pseudo-element to
  extend the area without changing layout.
- Keep at least 8px between adjacent targets, more when a mistap is destructive.
- General target rules: `good-css.md`, Interaction category.

## 8. Hover-only affordances

Touch has no hover, so any control that appears only on hover is unreachable there.

- Gate decoration with `@media (hover: hover) and (pointer: fine)`. Test both conditions: some
  devices report hover but are not precise.
- Treat hover as enhancement. Every action must also work with tap and keyboard.
- Do not hide row actions, delete buttons or menus behind hover. Show them always, or reveal them on
  focus, tap or a visible overflow button.
- Mouse and touch are not exclusive (tablets with trackpads, laptops with touchscreens). Gate by
  capability, never by device class.
- Prevent text selection only on controls, never on `body`:

```css
button, [role="button"], .chip { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
```

## 9. Keyboard and visual viewport

The software keyboard shrinks the visual viewport, not always the layout viewport. Browsers differ.

- Add `interactive-widget=resizes-content` to the viewport meta so Android Chrome resizes the layout
  like iOS. Then `100dvh` and bottom-pinned inputs follow the keyboard.
- Keep composer bars and sticky footers inside a `dvh`-sized shell, not `position: fixed; bottom: 0`
  alone.
- When script is needed, read `window.visualViewport` (`height`, `offsetTop`) and listen to its
  `resize` and `scroll` events. Write to a transform or a single custom property on the shell, not per
  frame state in a framework.
- Scroll the focused field into view with `scrollIntoView({ block: "center" })` after the keyboard
  opens. Do not rely on the browser.
- Test with the keyboard open, in landscape, with an accessory bar (autofill, password manager).

## 10. Status bar and verification

Give each colour scheme its own `theme-color`, matching the top edge of the page.

```html
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a">
```

Device mode in desktop browsers cannot reproduce sticky hover, tap delay, bar-driven viewport changes,
input zoom, overscroll, safe areas or the keyboard. Before calling a mobile fix done:

- Open the dev server by LAN address on a real phone, ideally an older one.
- Use Safari Web Inspector (iOS) or `chrome://inspect` (Android).
- In the review record, say which rules were verified from code and which need a device.

## Never ship

- `user-scalable=no`, `maximum-scale=1`, or touch detection by user agent.
- `100vh` for a shell, or `dvh` for a hero.
- Ungated `:hover`, or any action reachable only by hover.
- `env(safe-area-inset-*)` without `viewport-fit=cover`.
- `touch-action: none` on something users must scroll past.
