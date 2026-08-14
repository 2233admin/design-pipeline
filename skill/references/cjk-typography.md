# CJK Typography Contract

Read this reference whenever shipped interface copy contains Chinese, Japanese, or Korean text.
Project `DESIGN.md` may choose a more specific family or editorial convention, but it must preserve
the loading, legibility, fallback, and punctuation guarantees below.

This contract adapts the Chinese typography guidance reviewed from
[`joeseesun/qiaomu-design`](https://github.com/joeseesun/qiaomu-design) revision
`39dac8238a6ba44a4e39c1f0f6ca641224b01879`. It does not import that skill's visual theme,
reference-site library, or mandatory four-direction workflow.

## System-Font Default

Use a zero-download system stack for CJK body copy and controls unless the project already owns a
tested font family:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
  "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
  "Noto Sans CJK SC", sans-serif;
```

- Keep body copy, labels, form controls, tables, navigation, and status text on the system or
  project-owned UI stack.
- Do not fetch a full CJK webfont merely to make routine interface copy feel distinctive.
- Verify the actual Windows, macOS, Android, and iOS fallback used by the target product; a stack is
  a preference order, not proof that every family is installed.
- Use `400` for body copy and a real available `500` or `600` face for emphasis. Do not assume an
  intermediate or italic CJK face exists, and do not synthesize italic CJK text.

## Size, Line Height, and Measure

- Dense product UI body copy starts at `14px`; reading surfaces normally start at `16px`.
- Set CJK paragraph line height between `1.5` and `1.75`. Controls may be tighter only when their
  touch target and glyph bounds remain intact.
- Keep body `letter-spacing` at `0`; never use negative tracking to force Chinese text into a box.
- For sustained reading, target roughly 30-40 Han characters per desktop line and 18-25 on mobile.
  Treat these as review ranges, not fixed-width layout tokens.
- Test real minimum, typical, maximum, localized, and mixed-script strings. Truncation is a product
  decision and must not be introduced only to hide an undersized component.

## Punctuation and Mixed Scripts

- Chinese sentences use full-width Chinese punctuation consistently. Do not mix half-width commas,
  periods, question marks, or exclamation marks into the same sentence without a semantic reason.
- Do not add spaces around full-width punctuation. Keep paired punctuation balanced, and prevent an
  opening mark from ending a line or a closing mark from starting one.
- Use `line-break: strict` with `word-break: normal` where the target browsers support the desired
  behavior. Do not apply `word-break: break-all` to CJK prose as a generic overflow repair.
- Choose one project editorial rule for CJK/Latin and CJK/numeral boundaries, then apply it
  consistently to authored copy. When using visible spaces, omit them before `%`, `°`, and
  full-width punctuation.
- Use ASCII digits for data and `font-variant-numeric: tabular-nums` where columns or changing
  metrics must align.
- Do not use underlining for emphasis; reserve it for links where the design system calls for it.

## Decorative Font Subsetting

A decorative CJK webfont is allowed only for a short, known heading or when the brief explicitly
requires calligraphic, historic, or handwritten character. It never becomes the body/UI font.

When one is justified:

1. Freeze the exact glyph set from the shipped heading and every supported locale.
2. Produce or request a WOFF2 subset containing only those glyphs. A hosted `text=` request is
   acceptable only when external font loading is already allowed by project policy and the heading
   is static.
3. Use `font-display: swap` and retain the system stack as fallback.
4. Record the subset path or URL, byte size, glyph source, license, and fallback in change
   `design.md`.
5. Capture the fallback state and the loaded state. Missing glyphs, layout shift, or a network
   dependency with no approved fallback blocks the font decision.

Dynamic, user-generated, or broadly localized text cannot rely on a phrase subset. Use the system
or project-owned CJK family instead.

## Required Design and QA Evidence

When CJK content is in scope, change `design.md` records:

- the resolved system/project font stack and available weights;
- body size, line height, measure, and overflow behavior;
- punctuation and mixed-script spacing convention;
- every decorative subset's glyph scope, byte size, license, loading policy, and fallback.

Stage 6 verifies representative CJK and mixed-script strings at desktop/mobile widths, 200% zoom,
font-load failure, and the product's light/dark surfaces. A screenshot made only with Latin
placeholder copy is not CJK typography evidence.
