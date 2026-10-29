# Craft Density and Review Loop

Use this in the build stage of a design, after the direction is fixed and before the first full render.
It raises the ceiling of a design, while `qa-checklist.md` and the preflight gates keep the floor.
Priority when time or scope is short: the two-round loop, then reference DNA, then the density count.

## 1. Reference DNA

Before writing code, pick one or two donor systems close to the chosen direction. Donors must come from a
design system this repository holds (the vendored direction library, the `DESIGN.md` examples, or the
project's own foundation). Extract three to five concrete values or actions and write them into the plan:

- the shadow stack, radius scale, type ratio, hover displacement, border policy, nav structure, spacing
  rhythm, or colour-role assignment;
- each entry names the donor and the exact value: "from <donor>: <value>";
- an entry that cannot be written with a value is not borrowed; redo it.

## 2. Craft density

Each page lands at least five items from this menu, and the delivery report lists which five:

1. atmosphere layer (texture, grid lines or fog) at under 6% opacity;
2. custom `::selection` in the brand colour;
3. brand focus ring with offset, not the browser default;
4. one signature interaction (magnetic button, hover reveal, scroll reveal, or number roll);
5. two or three layer shadows tinted from the base colour;
6. editorial detail: section numbers, margin notes, hairlines, tracked small-caps labels;
7. display typography: oversized, outlined, vertical or overlapping type;
8. fluid heading size with a clamped range;
9. custom scrollbar in the brand colour;
10. a footer detail that is human, not boilerplate;
11. hand-drawn or project-specific illustration or icon set; no emoji stand-ins;
12. material detail: inner highlight, glass edge, paper texture, or print offset.

Constraints: an item must serve the direction (no paper texture in a terminal aesthetic); at most one
signature interaction per page; density is not noise.

## 3. Two-round loop

Render, critique, refine. A single round is a gamble.

1. **Round one.** Build the full page from direction, DNA and density.
2. **Render.** Open it in a real browser, capture desktop at 1280px or wider. At 1x, check that the page reads
   at a glance. Then capture two or three 4x close-ups of the hero, the main illustration and key components:
   look for soft edges, broken lines, lines that touch nothing, bare surfaces and empty corners. A region with
   nothing to see when zoomed is unfinished; add real detail that belongs to the part, not noise. If motion
   exists, check frames at slow speed for jumps. If no browser is available, read the code and simulate the render.
3. **Four-view critique.** Each view names its weakest point; name at least four and at most six in total.
   - *Art director:* which screen is most template-like? Does the hero earn the headline?
   - *Engineer:* what misaligns, overflows, lacks a state, or breaks spacing?
   - *Client:* in three seconds, what is remembered? If nothing, that is a blocker. Can the user start the
     page's task within three seconds? A failed page contract outranks any aesthetic point.
   - *Reader:* squint through the full body text: which passage is hardest, which control is unreadable, what
     texture or low contrast interferes?
4. **Round two.** Fix only the three to five named items. No rebuild and no unrequested redesign.
   Re-render, re-check, then deliver.

Critique must be severe. "No problems" is not a valid result; the four-view step exists to find a weakness.

## 4. Priority

Two-round loop, then reference DNA, then the density count. The gates (preflight) are never skipped: they
guarantee the floor, and this file is for reaching the ceiling.

## Provenance

The three mechanisms (reference DNA, craft density, two-round loop) are adapted concepts from
`qiaomu-design` (`references/craft-loop.md`, MIT, reviewed at commit `ccd9cecb5b1f1e994eebf7bd814f2f0c35fe3bea`).
Wording, the menu and the constraints here are this repository's own. `codeCopied: false`.
