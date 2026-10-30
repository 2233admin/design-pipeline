# Worst-case content scenarios

Use this checklist to stress-test a component or page with hostile content, quantities, containers and environments before calling it done. Each scenario has a stable kebab-case id, so it can be declared as a named optional state in a component state matrix entry and carry its own evidence. Where the gate already knows a state, map to it and do not add a duplicate.

Source: Distilled from jakubkrehel/skills `break` at 592aedc (MIT); wording and selection are this repository's.

## How to select scenarios

1. For each axis below, read its cue. If the component does not meet the cue, drop the axis and write the reason in the entry (the same way an inapplicable state needs a reason).
2. Render each kept scenario as a fixture, a story or a probe input. Do not simulate it by resizing the browser window when a fixed-width container will do.
3. Add the worst value the component's own data can really produce (the longest option in the real dataset) as an extra fixture.
4. Record evidence per scenario: a screenshot, a measured audit result or a probe path. A scenario with no evidence is not covered.

## Mapping to existing gate states

`APPLICABLE_STATES` in `skill/scripts/gate-core.cjs` already requires an explicit applicability decision for these. Declare the existing id, and put the specific scenario in its evidence note.

| Existing state | Scenarios it absorbs |
| --- | --- |
| `empty` | `zero-items`, `empty-string` |
| `long-content` | `long-text`, `unbroken-string`, `long-translation`, `tall-script-text` |
| `overflow` | `many-items`, `narrow-container`, `squeezed-sibling` |
| `responsive-collapse` | `narrow-container`, `wide-container`, `viewport-small`, `viewport-huge` |
| `loading`, `error`, `permission-denied`, `disabled`, `offline`, `partial` | state scenarios below, unchanged |
| `reduced-motion`, `focus` | environment toggles, unchanged |

The ids in the next sections are optional extras. Use one only when it adds a case the existing state does not name, for example `unbroken-string` is a sharper test than a generic `long-content`.

## Content length

Cue: the component shows text it does not author (user input, CMS, API, translations).

| Id | Fixture | What it catches |
| --- | --- | --- |
| `empty-string` | Field value `""` | Collapsed boxes, floating labels with nothing to float over |
| `one-word` | A single short word | Badges and buttons sized for the longest expected text |
| `long-text` | Several sentences | Containers that assumed one line, wrong line height across lines |
| `unbroken-string` | A long URL, or a compound word with no break points | Overflow when no wrap opportunity exists |

Rules:
- Text containers in flex or grid rows need `min-width: 0`; fixed neighbours such as avatars need `flex-shrink: 0`.
- Long URLs and emails get `overflow-wrap: anywhere`; do not rely on `word-break: break-all` for prose.
- Truncation must have a way back to the full value (tooltip, expand, detail view).

## Content shape

Cue: text can come from people or locales the team does not write in.

| Id | Fixture | What it catches |
| --- | --- | --- |
| `emoji-text` | Emoji alone and inside a sentence | Line-height jumps, off-centre icons, truncation cutting a character in half |
| `rtl-text` | A right-to-left string | Punctuation on the wrong side, physical left/right properties |
| `mixed-direction` | A Latin name inside an RTL sentence, and the reverse | Bidi reordering, broken separators |
| `tall-script-text` | Diacritics, Thai, Devanagari, CJK | Clipped ascenders and descenders in tight line boxes |
| `long-translation` | German, Finnish or Russian copy about 40% longer than English | Fixed-width buttons, tabs and table headers |
| `numeric-columns` | Mixed digits in a table or timer | Width jitter without tabular figures |

Rules:
- Use logical properties (`margin-inline-start`) so RTL needs no second stylesheet. Set `dir` on the fixture, not only on `html`.
- Mirror direction-bearing icons (arrows, chevrons) but not logos, media controls or clocks.
- Pair this axis with [cjk-typography.md](cjk-typography.md) when CJK is supported.

## Quantity

Cue: the component repeats over items (lists, tables, grids, tag rows, avatar stacks).

| Id | Fixture | What it catches |
| --- | --- | --- |
| `zero-items` | No items | Blank region with no empty state or next action |
| `one-item` | A single item | Grids and separators designed for plurals |
| `many-items` | About ten times the realistic count | Missing scroll or pagination, slow render, sticky elements unsticking |
| `huge-number` | 99,999 or 1.2M in a badge or counter | Clipped badges, wrong abbreviation, layout shift |

## Container and viewport

Cue: always for the container axis. Test containers, not only viewports.

| Id | Fixture | What it catches |
| --- | --- | --- |
| `narrow-container` | A 320px wide wrapper | Clipping, horizontal scroll, controls escaping the box |
| `squeezed-sibling` | A flex or grid sibling that takes most of the width | Min-content blowout, a child that refuses to shrink |
| `wide-container` | 1600px or wider | Unbounded line length, stretched controls, content pinned to far edges |
| `viewport-small` | 320x568 (and landscape phone height) | Fixed bars eating the screen, unreachable submit buttons |
| `viewport-huge` | 2560 wide and above | Layout stuck to the top-left, tiny content on a huge canvas |
| `zoom-200` | Browser zoom at 200% and 400% | Reflow failure, overlapping fixed elements, text clipped by fixed heights |
| `text-scale-large` | OS or browser text size at maximum | Fixed-height boxes, truncated labels |

## Media

Cue: the component shows images, avatars, video or embeds.

| Id | Fixture | What it catches |
| --- | --- | --- |
| `image-missing` | A broken URL | Broken-image icon, collapsed box, alt text overflow |
| `image-slow` | Throttled or never-resolving request | Layout shift when it arrives, no placeholder |
| `image-odd-ratio` | Very tall, very wide and tiny uploads | Distortion, empty bands, upscaled blur |

## State

Cue: the component has the state (read its props and interaction model; do not invent states).

| Id | Maps to | What it catches |
| --- | --- | --- |
| `loading-slow` | `loading` | Layout shift on arrival, spinners with no accessible name |
| `error-long-message` | `error` | Messages that overflow, colour as the only signal |
| `permission-denied-view` | `permission-denied` | A dead end with no explanation or next step |
| `disabled-control` | `disabled` | Contrast collapse, a disabled control that still takes focus |
| `partial-data` | `partial` | Missing optional fields leaving dashes or blank rows |

## Environment

Cue: the project supports the mode. These are viewing modes, not content.

| Id | Toggle |
| --- | --- |
| `dark-scheme` | OS dark mode, where a dark theme exists |
| `forced-colors` | Windows high contrast (shadows vanish, outlines remain) |
| `reduced-motion` | Maps to the existing `reduced-motion` state |
| `no-js-or-slow-network` | Only where the product promises it |

## Matrix entry example

```json
{
  "states": {
    "long-content": { "applicable": true, "covered": true, "evidence": "qa/unbroken-string-320.png; qa/long-translation-de.png" },
    "empty": { "applicable": true, "covered": true, "evidence": "qa/zero-items.png" },
    "rtl-text": { "applicable": false, "reason": "Product ships LTR locales only" }
  }
}
```

Non-gate ids such as `rtl-text` are extra declarations in the entry; the gate still requires every id in `APPLICABLE_STATES` to be declared.
