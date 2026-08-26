---
name: Minimal SaaS Design System
style: clean, neutral, professional, works for any B2B product
colors:
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  primary-light: "#EFF6FF"
  background: "#FFFFFF"
  surface: "#F9FAFB"
  surface-raised: "#FFFFFF"
  border: "#E5E7EB"
  border-strong: "#D1D5DB"
  text-primary: "#111827"
  text-secondary: "#6B7280"
  text-muted: "#9CA3AF"
  success: "#059669"
  success-light: "#ECFDF5"
  error: "#DC2626"
  error-light: "#FEF2F2"
  warning: "#D97706"
  warning-light: "#FFFBEB"
typography:
  heading: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
  body: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
  mono: "JetBrains Mono, ui-monospace, monospace"
  scale:
    h1: "1.875rem / 700"
    h2: "1.5rem / 600"
    h3: "1.125rem / 600"
    h4: "1rem / 600"
    body: "0.9375rem / 400"
    small: "0.875rem / 400"
    label: "0.875rem / 500"
spacing:
  base: "4px"
  scale: "4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96"
radius:
  button: "8px"
  card: "12px"
  input: "8px"
  badge: "6px"
  avatar: "50%"
shadows:
  sm: "0 1px 2px rgba(0,0,0,0.05)"
  card: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)"
  dropdown: "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)"
  modal: "0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.03)"
---

# Minimal SaaS Design System

## Visual direction

A clean, neutral foundation for B2B SaaS products. Light mode default. The design is professional and trustworthy — it stays out of the way and lets content speak. Uses a single blue accent for all primary actions. No loud colors, no decorative elements. Suitable for dashboards, analytics tools, admin panels, and any productivity product.

## Layout

- Sidebar: 256px, white, 1px right border `#E5E7EB`
- Main content: `#F9FAFB` background, 32px padding
- Content max-width: 1280px
- Card-based layout: content goes inside white cards on the gray background
- Page header: 64px height, white, bottom border

## Components

### Buttons

```
Primary:   bg-[#2563EB] text-white px-4 py-2 rounded-[8px] text-[0.9375rem] font-medium
           hover:bg-[#1D4ED8] transition-colors shadow-sm
Secondary: bg-white border border-[#E5E7EB] text-[#111827] px-4 py-2 rounded-[8px] text-[0.9375rem]
           hover:bg-[#F9FAFB]
Ghost:     text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] px-3 py-2 rounded-[8px]
Danger:    bg-[#DC2626] text-white px-4 py-2 rounded-[8px] text-[0.9375rem] font-medium
           hover:bg-[#B91C1C]
```

- Standard height: 40px (py-2 + text-[0.9375rem])
- Small buttons: 32px (py-1.5 + text-[0.875rem])
- Large buttons: 48px (py-3 + text-base) — landing pages only
- Disabled state: opacity-50, cursor-not-allowed

### Cards

```
Base:    bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)]
Flat:    bg-white border border-[#E5E7EB] rounded-[12px]
Surface: bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px]
```

- Standard card padding: 24px
- Card header: 20px padding with bottom border `#E5E7EB`
- Compact card (tables, lists): 16px padding

### Forms and inputs

```
Input: bg-white border border-[#E5E7EB] rounded-[8px] px-3 py-2 text-[0.9375rem] text-[#111827]
       placeholder:text-[#9CA3AF]
       focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none transition
Label: text-[0.875rem] font-medium text-[#111827] mb-1.5 block
Help:  text-[0.875rem] text-[#6B7280] mt-1
Error: text-[0.875rem] text-[#DC2626] mt-1
       + border-[#DC2626] on the input
```

- Always show the label — never rely on placeholder only
- Group related fields in 16px gap
- Required marker: red asterisk after label, `text-[#DC2626]`

### Tables

```
Wrapper:    bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden
Header row: bg-[#F9FAFB] border-b border-[#E5E7EB]
Header cell: text-[0.875rem] font-medium text-[#6B7280] px-6 py-3
Body row:   border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors
Body cell:  text-[0.9375rem] text-[#111827] px-6 py-4
```

- Numeric columns: right-align, tabular-nums
- Empty state inside table: centered, 120px height, muted text

### Badges and status

```
Default: bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]
         rounded-[6px] px-2.5 py-0.5 text-[0.8125rem] font-medium
Success: bg-[#ECFDF5] text-[#059669] rounded-[6px] px-2.5 py-0.5 text-[0.8125rem] font-medium
Error:   bg-[#FEF2F2] text-[#DC2626] rounded-[6px] px-2.5 py-0.5 text-[0.8125rem] font-medium
Warning: bg-[#FFFBEB] text-[#D97706] rounded-[6px] px-2.5 py-0.5 text-[0.8125rem] font-medium
Blue:    bg-[#EFF6FF] text-[#2563EB] rounded-[6px] px-2.5 py-0.5 text-[0.8125rem] font-medium
```

### Navigation sidebar

```
Logo area:    h-16 flex items-center px-6 border-b border-[#E5E7EB]
Section label: text-[0.75rem] font-semibold uppercase tracking-wider text-[#9CA3AF] px-3 py-2 mt-4
Nav item:     text-[0.9375rem] text-[#6B7280] flex items-center gap-3 px-3 py-2 rounded-[8px]
              hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors
Nav active:   bg-[#EFF6FF] text-[#2563EB] font-medium
```

### Empty states

```
Container: text-center py-16 px-8
Icon:      w-12 h-12 text-[#D1D5DB] mx-auto mb-4
Title:     text-[1.125rem] font-semibold text-[#111827] mb-2
Body:      text-[0.9375rem] text-[#6B7280] max-w-sm mx-auto mb-6
CTA:       Primary button, centered
```

### Alerts and notifications

```
Info:    bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] rounded-[8px] p-4
Success: bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-[8px] p-4
Warning: bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-[8px] p-4
Error:   bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-[8px] p-4
```

## Spacing rules

- 8px between label and input
- 16px between form fields in a group
- 24px between form sections
- 24px between cards in a grid
- 32px between page sections
- 48px top padding on page content area

## Do

- Use white cards on `#F9FAFB` page background — this is the standard structure
- Use `#111827` for primary text — not pure black
- Use `#6B7280` for secondary labels, captions, and metadata
- Keep badge colors soft: light background + dark text in the same hue
- Use Inter font — it renders cleanly at all sizes on screen
- Use `transition-colors` on all interactive elements

## Don't

- Don't use multiple accent colors — only `#2563EB` blue for primary actions
- Don't use box-shadow for table or sidebar depth — borders only
- Don't use gradient backgrounds on buttons or cards
- Don't use rounded-full on buttons — keep at 8px
- Don't make text smaller than 0.875rem for any readable content
- Don't use colored section backgrounds — gray or white only

## Agent instructions

Use this DESIGN.md as the visual contract for all UI components. When generating any interface:

1. White cards on `#F9FAFB` background is the default page structure — always start here
2. Use the exact hex values for colors — do not substitute with Tailwind named colors
3. Labels are always visible above inputs — never placeholder-only forms
4. Apply `transition-colors` to every clickable element
5. Empty states always follow the icon + title + body + CTA pattern
6. All status indicators use the soft badge pattern (light bg + matching text color)
