---
name: Stripe Design System
style: clean, high-density, professional, payment infrastructure
colors:
  primary: "#635BFF"
  primary-hover: "#4F46E5"
  background: "#FFFFFF"
  surface: "#F6F9FC"
  surface-raised: "#FFFFFF"
  border: "#E3E8EE"
  border-strong: "#C1C9D2"
  text-primary: "#0A2540"
  text-secondary: "#425466"
  text-muted: "#8898AA"
  success: "#09825D"
  success-light: "#EFFFEF"
  error: "#CD3D64"
  error-light: "#FFF0F3"
  warning: "#B5810A"
  warning-light: "#FFF9EA"
typography:
  heading: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  mono: "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace"
  scale:
    display: "2.5rem / 700 / -0.02em"
    h1: "1.75rem / 600 / -0.01em"
    h2: "1.25rem / 600 / -0.01em"
    h3: "1rem / 600 / 0"
    body: "0.9375rem / 400 / 0"
    small: "0.8125rem / 400 / 0"
spacing:
  base: "8px"
  scale: "4, 8, 12, 16, 24, 32, 48, 64, 96"
radius:
  button: "8px"
  card: "12px"
  input: "8px"
  badge: "4px"
  pill: "999px"
shadows:
  card: "0 1px 4px rgba(0,0,0,0.05)"
  elevated: "0 4px 12px rgba(0,0,0,0.08)"
  modal: "0 16px 40px rgba(0,0,0,0.12)"
---

# Stripe Design System

## Visual direction

Stripe is payment infrastructure for internet businesses. The UI must feel exact, trusted, and operational — like it was built to process millions of dollars in transactions without a single pixel out of place.

Use a white canvas, midnight slate text (`#0A2540`), and restrained indigo accents. Surfaces are clean and data-dense but breathe. Every element earns its place on screen. Never decorative, always purposeful.

## Layout

- Container: max-w-[1120px] mx-auto px-6
- Dashboard: left sidebar 220px + main content fills remaining space
- Marketing: alternating wide sections with product screenshots
- Table view: full-width, sticky column headers, compact rows (44px)
- Modals: max-w-lg, centered, `backdrop-blur-sm bg-black/30`

## Components

### Buttons

```
Primary:     bg-[#635BFF] text-white px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-medium
             hover:bg-[#4F46E5] shadow-sm transition-colors
Secondary:   bg-white text-[#0A2540] border border-[#E3E8EE] px-4 py-2.5 rounded-[8px] text-[0.9375rem]
             hover:bg-[#F6F9FC] transition-colors
Destructive: bg-[#CD3D64] text-white px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-medium
             hover:bg-[#B5304F] transition-colors
Ghost:       text-[#425466] px-4 py-2.5 rounded-[8px] text-[0.9375rem]
             hover:bg-[#F6F9FC] hover:text-[#0A2540] transition-colors
Link:        text-[#635BFF] text-[0.9375rem] hover:text-[#4F46E5] underline-offset-2 hover:underline
```

- Standard button height: ~40px (py-2.5 with 0.9375rem text)
- Icon-only buttons: 36×36px, ghost variant, `rounded-[8px]`
- Loading state: `opacity-70 cursor-not-allowed` + spinner, same dimensions

### Cards and panels

```
Base card:   bg-white border border-[#E3E8EE] rounded-[12px] p-6
             shadow-[0_1px_4px_rgba(0,0,0,0.05)]
Surface card: bg-[#F6F9FC] border border-[#E3E8EE] rounded-[12px] p-6
Stat card:   bg-white border border-[#E3E8EE] rounded-[12px] p-5
             flex flex-col gap-1
```

- Card hover: `shadow-[0_4px_12px_rgba(0,0,0,0.08)]` + border-[#C1C9D2], 150ms transition
- Card header separator: `border-b border-[#E3E8EE] pb-4 mb-4`
- No colorful card headers — hierarchy via typography only

### Data tables

```
Wrapper:     bg-white border border-[#E3E8EE] rounded-[12px] overflow-hidden
Header:      bg-[#F6F9FC] text-[0.75rem] font-semibold text-[#8898AA] uppercase tracking-[0.06em]
             px-5 py-3 border-b border-[#E3E8EE]
Data row:    px-5 py-3.5 border-b border-[#E3E8EE] last:border-0
             text-[0.9375rem] text-[#425466] hover:bg-[#F6F9FC] transition-colors
Amount cell: font-mono text-[#0A2540] font-medium tabular-nums text-right
ID cell:     font-mono text-[0.8125rem] text-[#8898AA]
```

- Row actions: appear on hover, right-aligned ghost buttons
- Pagination: simple prev/next + count, right-aligned, `text-[0.875rem]`
- Sort indicators: chevron icon, 14px, muted when inactive

### Forms and inputs

```
Label:        text-[0.8125rem] font-semibold text-[#0A2540] mb-1.5 block
Input:        bg-white border border-[#E3E8EE] rounded-[8px] px-3 py-2.5
              text-[0.9375rem] text-[#0A2540] w-full outline-none transition-colors
              focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/20
              placeholder:text-[#8898AA]
Error input:  border-[#CD3D64] focus:border-[#CD3D64] focus:ring-[#CD3D64]/20
Select:       same as Input + `appearance-none` + chevron icon right
Textarea:     same as Input + `resize-y min-h-[100px]`
Helper text:  text-[0.8125rem] text-[#8898AA] mt-1.5
Error text:   text-[0.8125rem] text-[#CD3D64] mt-1.5 flex items-center gap-1
```

- Input height: ~42px (py-2.5 + line-height)
- Form field gap: 20px between fields
- Section gap: 32px between form groups

### Badges and status chips

```
Success: bg-[#EFFFEF] text-[#09825D] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
Error:   bg-[#FFF0F3] text-[#CD3D64] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
Warning: bg-[#FFF9EA] text-[#B5810A] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
Neutral: bg-[#F6F9FC] text-[#425466] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
Primary: bg-[#F0EFFF] text-[#635BFF] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
```

- Rectangular badges only — 4px radius, never pill-shaped for status
- Dot variant: 8px circle + text, `flex items-center gap-1.5`

### Navigation

```
Top nav:      bg-white border-b border-[#E3E8EE] h-[60px] px-6
              flex items-center justify-between sticky top-0 z-40
Nav link:     text-[0.9375rem] text-[#425466] hover:text-[#0A2540] font-medium px-3 py-1.5
Nav active:   text-[#0A2540] font-semibold
Sidebar:      bg-[#F6F9FC] w-[220px] border-r border-[#E3E8EE] py-4
Sidebar item: text-[0.875rem] text-[#425466] px-3 py-2 rounded-[8px] mx-2
              hover:bg-white hover:text-[#0A2540] transition-colors flex items-center gap-2.5
Sidebar active: bg-white text-[#0A2540] font-medium shadow-[0_1px_4px_rgba(0,0,0,0.06)]
Section label: text-[0.75rem] font-semibold text-[#8898AA] uppercase tracking-[0.06em]
               px-5 py-1.5 mt-4 mb-1
```

### Code and API keys

```
Code block:  bg-[#0A2540] text-[#AAD4FF] rounded-[10px] p-5
             font-mono text-[0.875rem] leading-relaxed overflow-x-auto
Inline code: bg-[#F6F9FC] text-[#0A2540] border border-[#E3E8EE] rounded-[4px]
             px-1.5 py-0.5 font-mono text-[0.875em]
API key:     font-mono text-[#425466] text-[0.875rem] bg-[#F6F9FC]
             border border-[#E3E8EE] rounded-[8px] px-3 py-2
             flex items-center justify-between gap-3
```

- Copy button always visible top-right of code blocks — ghost, 28px square
- Syntax: strings `#4CAF76`, keywords `#9CDCFE`, numbers `#B5CEA8`

### Metric blocks

```
Value:  text-[1.75rem] font-semibold text-[#0A2540] tabular-nums leading-none
Label:  text-[0.8125rem] text-[#8898AA] font-medium mt-0.5
Change: text-[0.875rem] font-medium text-[#09825D] (positive ↑)
        text-[0.875rem] font-medium text-[#CD3D64] (negative ↓)
```

## Spacing rules

- 4px: icon-to-label gap
- 8px: between inline items
- 16px: within a card section
- 24px: between cards in a grid
- 32px: between page sections
- 48–64px: major section breaks on marketing pages

## States

- Empty: centered icon (48px, muted) + heading + 1-line description + single CTA
- Loading: skeleton in `#F6F9FC`, matching shape/radius of real content
- Error: red banner `bg-[#FFF0F3] border border-[#CD3D64]/30` + message + retry link
- Success: toast bottom-right, `bg-[#0A2540]` dark, 3s auto-dismiss

## Do

- Default to white (`#FFFFFF`) — Stripe is a light-first product
- Use `#0A2540` for primary text — never pure `#000000`
- Use `#635BFF` only for primary CTAs and focus rings — keep it restrained
- Use `tabular-nums` on every monetary value, amount, and metric
- Tables and data grids are first-class citizens — design them well
- Borders (`#E3E8EE`) for card separation, soft shadows for elevation

## Don't

- Don't turn it into a purple gradient playground
- Don't use cartoon icons, playful illustrations, or rounded mascots
- Don't hide transactional data behind oversized marketing components
- Don't use dark mode as default — Stripe's primary experience is light
- Don't make buttons pill-shaped or taller than 44px
- Don't use color for decoration — every color must signal status or action

## Agent instructions

When generating UI for this project, treat it as operational financial infrastructure:

1. Monetary values → always `font-mono tabular-nums`, never regular body text
2. Status → always a badge with the correct semantic color (success/error/warning/neutral)
3. One primary CTA per view — always `bg-[#635BFF]`; secondary is outlined or ghost
4. Text hierarchy: `#0A2540` headings → `#425466` body → `#8898AA` captions
5. Form fields → `focus:ring-2 focus:ring-[#635BFF]/20` on every input
6. Data tables → hover rows (`hover:bg-[#F6F9FC]`) + sticky header
7. Empty states → centered, one CTA, no full-page blanks
8. Base unit is 8px — all spacing decisions are multiples of 8
