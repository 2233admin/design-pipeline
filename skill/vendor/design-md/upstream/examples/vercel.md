---
name: Vercel Design System
style: dark, monochrome, developer-native, high-contrast
colors:
  primary: "#000000"
  background: "#000000"
  surface: "#111111"
  surface-raised: "#1A1A1A"
  border: "#333333"
  border-strong: "#555555"
  text-primary: "#EDEDED"
  text-secondary: "#A1A1AA"
  text-muted: "#71717A"
  success: "#50E3C2"
  success-subtle: "#0D2B25"
  error: "#FF4444"
  error-subtle: "#2B0D0D"
  warning: "#F5A623"
  warning-subtle: "#2B1F0A"
  accent-blue: "#0070F3"
  accent-cyan: "#79C0FF"
typography:
  heading: "'Geist Sans', system-ui, -apple-system, sans-serif"
  body: "'Geist Sans', system-ui, -apple-system, sans-serif"
  mono: "'Geist Mono', 'JetBrains Mono', Consolas, monospace"
  scale:
    display: "3.5rem / 700 / -0.03em"
    h1: "2rem / 700 / -0.02em"
    h2: "1.375rem / 600 / -0.01em"
    h3: "1rem / 600 / 0"
    body: "0.875rem / 400 / 0"
    small: "0.8125rem / 400 / 0"
spacing:
  base: "8px"
  scale: "4, 8, 12, 16, 24, 32, 48, 64, 96"
radius:
  button: "6px"
  card: "8px"
  input: "6px"
  badge: "4px"
---

# Vercel Design System

## Visual direction

Vercel is frontend cloud infrastructure. The UI must feel instant, high-contrast, and developer-native — like a terminal that was redesigned by product designers, not the other way around.

Use strict monochrome structure: black backgrounds, near-white text, Geist typography, and a rigid grid. Color is punctuation only — blue for links and primary actions, cyan/green for successful deploy states. Never decorative.

## Layout

- Container: max-w-[1200px] mx-auto px-6
- Dashboard grid: sidebar 240px + content fills rest
- Marketing: centered grid, hard edges, no soft gradients behind content
- Max reading width: 720px for docs and prose
- Section spacing: 80px between major marketing sections

## Components

### Buttons

```
Primary:     bg-white text-black px-4 py-2 rounded-[6px] text-[0.875rem] font-medium
             hover:bg-[#EDEDED] transition-colors
Secondary:   bg-transparent text-[#EDEDED] border border-[#333333] px-4 py-2 rounded-[6px] text-[0.875rem]
             hover:border-[#555555] hover:bg-[#111111] transition-colors
Ghost:       text-[#A1A1AA] px-4 py-2 rounded-[6px] text-[0.875rem]
             hover:text-[#EDEDED] hover:bg-[#111111] transition-colors
Danger:      bg-[#FF4444] text-white px-4 py-2 rounded-[6px] text-[0.875rem] font-medium
             hover:bg-[#E03333] transition-colors
Link:        text-[#0070F3] text-[0.875rem] hover:text-[#79C0FF] transition-colors
```

- Button height: ~36px (py-2 + 0.875rem line-height)
- Icon-only: 32×32px, ghost, `rounded-[6px]`
- Never use color-filled buttons except white-primary and danger
- Disabled: `opacity-40 cursor-not-allowed pointer-events-none`

### Cards and panels

```
Base card:   bg-[#111111] border border-[#333333] rounded-[8px] p-5
Surface:     bg-[#1A1A1A] border border-[#333333] rounded-[8px] p-5
Interactive: bg-[#111111] border border-[#333333] rounded-[8px] p-5
             hover:border-[#555555] transition-colors cursor-pointer
Feature:     bg-black border border-[#333333] rounded-[8px] p-6
             group hover:border-[#555555] transition-colors
```

- No box-shadows — borders only for depth
- Card header: `border-b border-[#333333] pb-4 mb-4`
- Nested cards go one shade lighter: `bg-[#1A1A1A]` inside `bg-[#111111]`

### Deploy and status rows

```
Deploy row:   flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A]
              hover:bg-[#111111] transition-colors
Status dot:   8px circle — green (#50E3C2) for ready, yellow (#F5A623) for building,
              red (#FF4444) for error, gray (#555555) for queued
Branch badge: font-mono text-[0.75rem] bg-[#1A1A1A] border border-[#333333]
              rounded-[4px] px-1.5 py-0.5 text-[#A1A1AA]
Commit hash:  font-mono text-[0.75rem] text-[#71717A]
Duration:     text-[0.8125rem] text-[#A1A1AA] tabular-nums
```

### Terminal and code blocks

```
Terminal:    bg-black border border-[#333333] rounded-[8px] p-4 font-mono
             text-[0.875rem] text-[#EDEDED] leading-relaxed overflow-x-auto
Prompt:      text-[#50E3C2] select-none mr-2
Command:     text-[#EDEDED]
Output:      text-[#A1A1AA]
Error line:  text-[#FF4444]
Code block:  bg-[#0A0A0A] border border-[#333333] rounded-[8px] p-4
             font-mono text-[0.875rem] leading-relaxed
Inline code: bg-[#1A1A1A] border border-[#333333] rounded-[4px]
             px-1.5 py-0.5 font-mono text-[0.8125rem] text-[#EDEDED]
```

- Copy button: top-right, ghost, 28px, appears on hover
- Line numbers: `text-[#333333]` — barely visible
- Highlighted line: `bg-[#0070F3]/10 border-l-2 border-[#0070F3]`

### Forms and inputs

```
Label:   text-[0.8125rem] font-medium text-[#EDEDED] mb-1.5 block
Input:   bg-black border border-[#333333] rounded-[6px] px-3 py-2
         text-[0.875rem] text-[#EDEDED] w-full outline-none transition-colors
         focus:border-white focus:ring-2 focus:ring-white/10
         placeholder:text-[#71717A]
Error:   border-[#FF4444] focus:border-[#FF4444] focus:ring-[#FF4444]/10
Helper:  text-[0.8125rem] text-[#A1A1AA] mt-1.5
Error msg: text-[0.8125rem] text-[#FF4444] mt-1.5
```

- Input height: ~36px
- Search inputs: leading icon in `text-[#71717A]`, `pl-9`

### Badges and chips

```
Ready:    bg-[#0D2B25] text-[#50E3C2] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
Error:    bg-[#2B0D0D] text-[#FF4444] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
Building: bg-[#2B1F0A] text-[#F5A623] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
Neutral:  bg-[#1A1A1A] text-[#A1A1AA] border border-[#333333] rounded-[4px] px-2 py-0.5 text-[0.75rem]
Beta:     bg-[#0070F3]/15 text-[#0070F3] rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium
```

### Navigation

```
Top nav:      bg-black/90 backdrop-blur-sm border-b border-[#333333] h-[56px]
              px-6 flex items-center justify-between sticky top-0 z-50
Nav link:     text-[0.875rem] text-[#A1A1AA] hover:text-[#EDEDED] transition-colors px-3 py-1.5
Nav active:   text-[#EDEDED] font-medium
Sidebar:      bg-black w-[240px] border-r border-[#1A1A1A] py-4 overflow-y-auto
Sidebar item: text-[0.875rem] text-[#A1A1AA] px-3 py-1.5 rounded-[6px] mx-2
              hover:bg-[#111111] hover:text-[#EDEDED] flex items-center gap-2.5
Sidebar active: bg-[#111111] text-[#EDEDED]
Section label: text-[0.75rem] font-medium text-[#71717A] uppercase tracking-[0.06em]
               px-5 py-1 mt-4 mb-1
```

## Spacing rules

- 4px: tight icon gaps
- 8px: row item spacing
- 16px: within sections
- 24px: between cards
- 32px: between content sections
- 80px: marketing section breaks

## Motion

- Transitions: 150ms ease for hover, 200ms ease-out for appearing panels
- No bounce animations — everything is linear or ease-out
- Sidebar slide: 240ms `transform` only, no opacity fade
- Toast enter: slide from bottom-right, 200ms

## States

- Empty: icon 48px `text-[#333333]` + heading `text-[#EDEDED]` + description `text-[#A1A1AA]` + one white button
- Loading: skeleton `bg-[#1A1A1A]` → `bg-[#222222]` pulse animation
- Error: `border-[#FF4444]/30 bg-[#FF4444]/5` banner + message + action link
- Success: toast `bg-[#111111] border border-[#333333]` with `text-[#50E3C2]` status icon

## Do

- Default to black (`#000000`) — Vercel is a dark-first product
- Use Geist Sans for all text — it's the visual identity
- Treat terminal blocks as first-class components, not afterthoughts
- Status is always a dot + badge — never just text color alone
- Grid-aligned layouts with hard edges — no organic curves in UI chrome
- `tabular-nums` on all deploy times, durations, and metrics

## Don't

- Don't add colorful gradients or pastel sections — this is monochrome
- Don't round things into pill/consumer shapes — 6-8px max
- Don't use light mode as default — Vercel is dark
- Don't use fonts other than Geist — it's core to the identity
- Don't use illustration-style icons — use outline/line icons only
- Don't add marketing decorations inside dashboard views

## Agent instructions

When generating UI for this project, treat it as developer infrastructure:

1. Background hierarchy: `#000000` (page) → `#111111` (cards) → `#1A1A1A` (nested)
2. Borders only — no box-shadows for elevation
3. Primary button is white-on-black — only exception is danger (`#FF4444`)
4. Status signals: always a colored dot + badge, never text color alone
5. Code and terminal blocks are first-class — style them carefully with `font-mono`
6. All time/duration/metric values use `tabular-nums font-mono`
7. Deploy states: green=ready, orange=building, red=error, gray=queued — never invent new colors
8. Focus ring: `focus:ring-2 focus:ring-white/10 focus:border-white` on all inputs
