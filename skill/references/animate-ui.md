---
sourceMeta:
  id: animate-ui
  kind: github
  url: https://github.com/imskyleen/animate-ui/tree/22a9236ae107328f8564edb7e3299375da3247af
  reviewedRevision: 22a9236ae107328f8564edb7e3299375da3247af
  reviewedContentHash: 8ff98fece9000f75e9b97574a372ea07524e6676cb050b081fa65978ef561e2a
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: skills/animate-ui/SKILL.md, skills/animate-ui/references/catalog.md, skills/animate-ui/references/vue.md, skills/animate-ui/references/migrate.md, skills/animate-ui/references/review.md, LICENSE.md
  reviewedAt: 2026-11-12T00:00:00.000Z
  freshnessDays: 365
  license: LicenseRef-MIT-Commons-Clause
  useBoundary: reference-only for the upstream skill text, which is restated here; components are installed into the target project from npm or the upstream registry after the user approves the route; do not copy upstream component source into this package
---

# Animate UI (component source)

Animate UI is a component source for motion. Its packages re-export the primitives of Radix UI,
Base UI and React Aria (reka-ui in Vue) with the same API and Motion inside, so a shadcn/ui
component or a hand-built one gains enter, exit, press and selection motion when its import
changes. It also has its own primitives for entrances, text, numbers, buttons and pointer effects,
and backgrounds, styled buttons, page transitions and animated icons that install as files from
its shadcn registry.

- Source: [imskyleen/animate-ui](https://github.com/imskyleen/animate-ui/tree/22a9236ae107328f8564edb7e3299375da3247af),
  documentation at <https://animate-ui.com/docs>, `Copyright (c) 2025 Elliot Sutton`.
- Licence: MIT with the Commons Clause. Use in any application, website or product is allowed,
  commercial included. Selling or redistributing the components themselves is not.
- Not bundled: this package holds names, import paths, install commands and its own descriptions.
  No upstream component source ships, and the project installs the components itself. Do not
  install the upstream `animate-ui` skill for this pipeline, and do not copy component source into
  a design-pipeline package, template or example.

## When to use it

Use it when the project is React or Vue, already has a motion-capable stack (or accepts Motion as a
dependency), and one of these holds:

- it uses shadcn/ui, Radix UI, Base UI, React Aria or reka-ui and its overlays, menus, disclosures
  or controls should animate without being rebuilt;
- the brief asks for an effect that ships here as a component: an entrance or scroll reveal, a
  counting or rolling number, changing text, a press or copy button, a gliding highlight, a page
  transition, an animated background or icon.

Do not reach for it to add motion nobody asked for. Whether a surface should move at all, and how
much, is decided first in the [motion gate](animation-opportunity-and-review.md#1-opportunity-screen-before-implementation).
The project's design system and existing components come first: when the project already has an
equivalent component, keep it.

## Find a component

The catalog record `animate-ui/components` in `component-source-catalog.json` lists every primitive
and registry item with its import or registry name, install command, dependencies and docs page.

```bash
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" design-system search \
  --root "$SKILL_ROOT" --snapshot "$SKILL_ROOT/references/component-source-catalog.json" \
  --query "animate-ui" --json
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" design-system route \
  --query "animate-ui dialog and sliding number" --platform web --json
```

`search` matches English and Chinese words in the record (`数字滚动`, `页面转场`, `动态背景`,
`动效图标`). `route` selects this source for every capability it covers when the brief names
`animate-ui` (also `animate ui`, `animateui`), and returns the package, the install command and,
for each recommended component, its import and docs page. A brief that does not name it keeps its
previous route and lists this source among the alternatives; a capability no other source covers
is still routed here.

Props are on each component's docs page. Without network, read them from the installed package's
types under `node_modules/@animate-ui/react/dist/primitives/<path>/index.d.ts`.

## Pick the path

| The component is | Do this |
| --- | --- |
| A shadcn/ui component (the project has `components.json`) | Run the upstream CLI: it swaps the primitive imports and removes the CSS animation classes Motion replaces |
| Hand-built on Radix UI, Base UI or React Aria | Swap the import yourself |
| Something one of Animate UI's own primitives does (an entrance, a counter, a copy button) | Import that primitive |
| A background, styled button, page transition or icon | Add the registry file with the shadcn CLI |
| Custom markup or another library, with nothing here that fits | Write the motion by hand through the [motion gate](animation-opportunity-and-review.md) and [motion-spec.md](motion-spec.md); this source adds nothing |
| A Vue or Nuxt project | The same paths with the Vue packages; see [Vue](#vue) |
| An Animate UI v1 project (files under `components/animate-ui/`) | See [Migrate from v1](#migrate-from-v1) |

A request that mixes kinds takes each component's own path.

### shadcn/ui components: the CLI

```bash
npx @animate-ui/cli@latest animate <component> --dry-run
npx @animate-ui/cli@latest animate <component>
npx @animate-ui/cli@latest animate all --exclude sidebar,calendar
```

`<component>` is the file's name in the project's `ui` folder. The CLI finds the files through
`components.json`, rewrites them in place, is idempotent, and names the primitives it does not
animate. It installs nothing. It needs Node.js 22.12 or later. Run `--dry-run` first and show the
user the change; run it for real only after the route is approved, as with any shadcn CLI call
([ui-craft-sources.md](ui-craft-sources.md#execution-boundary)). Do not hand-edit what the CLI
does; if its output looks wrong, report it.

### Hand-built components: swap the import

```tsx
import { Dialog } from 'radix-ui'; // before
import { Dialog } from '@animate-ui/react/primitives/radix-ui'; // after
import * as DialogPrimitive from '@radix-ui/react-dialog'; // before
import * as DialogPrimitive from '@animate-ui/react/primitives/radix-ui/dialog'; // after
import { Dialog } from '@base-ui/react/dialog'; // before
import { Dialog } from '@animate-ui/react/primitives/base-ui/dialog'; // after
import { Popover, Button } from 'react-aria-components'; // before
import { Popover, Button } from '@animate-ui/react/primitives/react-aria'; // after
```

Keep the import style the file has: an umbrella import changes only its source, a per-primitive
import takes the per-primitive path. Move the whole import: parts Animate UI does not animate are
re-exported unchanged. `vaul` maps to the Radix `drawer` path, `input-otp` to
`primitives/input-otp`, `embla-carousel-react` to `primitives/carousel`.

Parts that enter and leave accept optional `transition` and `exitTransition` props; parts that
only move accept `transition`.

## Install

```bash
npm install @animate-ui/react motion
```

Use the project's package manager, read from its lockfile. At the reviewed revision
`@animate-ui/react` needs React 19 and Motion 14; the base library the components already use
(`radix-ui`, `@base-ui/react`, `react-aria-components`) is an optional peer and stays installed.
Neither the CLI nor an import swap installs anything.

Registry items are files added to the project and need `components.json`:

```bash
npx shadcn@latest add @animate-ui/backgrounds-stars
```

The `@animate-ui` registry is declared in `components.json` as
`"registries": { "@animate-ui": "https://animate-ui.com/r/{name}.json" }`. Files land under
`components/animate-ui/`.

Adding a dependency or running an installer is the user's decision: name the package, the command
and what it changes, then act on the approved route. Motion code runs in client components, so a
file that writes it starts with `'use client'`; keep a server page server-side by moving the
animated part into its own component.

## Use it beside existing shadcn/ui components

After an import swap, remove the component's own CSS animation classes so they do not run on top
of Motion (the CLI does this for shadcn/ui files):

- tw-animate utilities: `animate-in`, `animate-out`, `fade-*`, `zoom-*`, `slide-in-from-*`,
  `slide-out-to-*`, and the `duration-*` beside them;
- Base UI `data-starting-style:*` and `data-ending-style:*` transitions, React Aria
  `data-entering:*` and `data-exiting:*`;
- height keyframes: `animate-accordion-down` / `up`, `animate-collapsible-*`.

Keep everything else: parts, props, data attributes, `forceMount` / `keepMounted`, positioning
classes, focus and highlighted backgrounds, and plain color transitions such as
`transition-colors`.

Tailwind's version matters for centered modals. Under Tailwind 4 the `translate` property composes
with Motion's `transform`, so `-translate-x-1/2 -translate-y-1/2` stays. Under Tailwind 3, or when
the version cannot be told, replace `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` with
`inset-0 m-auto h-fit`; the width classes stay.

A hand-rolled overlay stays hand-rolled unless the user asks to move it onto a library: moving it
changes its focus, modality and dismissal. Say what a primitive would add and let the user decide.

Tokens and components of the project's design system keep their authority. Animate UI changes how
a component moves, not its colors, type, radius or spacing; a registry file that brings its own
look (a background, a styled button) is restyled with the project's tokens after it is added.

## Components

Each group names what ships. The catalog record has the full list with imports.

### Drop-in primitives

Radix UI, Base UI and React Aria primitives with enter and exit motion: accordion, alert dialog,
checkbox, collapsible, combobox, context menu, dialog, drawer, dropdown menu, hover card, menubar,
navigation menu, popover, preview card, progress, radio group, select, slider, switch, tabs, toast
(Base UI), toggle, toggle group, tooltip. Anchored popups grow from their trigger; menus, tabs and
toggle groups have a highlight or indicator that glides to the active item; disclosures animate
their height; a dismissed dialog, drawer or sheet leaves faster than it entered. Import from
`@animate-ui/react/primitives/<radix-ui|base-ui|react-aria>/<name>`.

Animate UI also has standalone `tabs` (gliding highlight, sliding panels), `tooltip` (one popup
that moves between triggers), `carousel` (drop-in for `embla-carousel-react`), `input-otp` (drop-in
for `input-otp`), `bottom-navigation`, `avatar-group` and `pinned-list`, and the animated parts
behind shadcn/ui's `pagination`, `sidebar`, `questionnaire` and `code-block`.

### Entrances and scroll reveals

`effects/fade`, `effects/slide`, `effects/blur` and `effects/zoom` play on load or when the element
scrolls into view. `effects/effect` mixes them on one element or staggers them across its children.
`texts/splitting` brings text in by character, word or line. `effects/scroll-fade` fades the edges
of a scroll container, `scroll-progress` is a bar that follows the scroll position, and
`effects/auto-height` makes a container's height follow its content.

The page's main text is there on first paint: keep entrances for content below the fold or
decorative content, and say so when an explicit request animates the first viewport.

### Numbers

`texts/counting-number` counts up to a value (stats, totals). `texts/sliding-number` rolls digits
to a new value like an odometer. `texts/scrolling-number` is a wheel of numbers that settles on a
value. Set tabular figures so the width does not jump.

### Changing text

`texts/rotating` cycles words in place on a timer. `texts/morphing` turns one string into the
next, sliding the letters both share; it reads best between strings that share letters.
`texts/swapping` changes a label letter by letter. `texts/sliding` slides a link or button label
out as a copy slides in, on hover or press. `texts/rolling` rolls letters like a flip board.
`texts/typing` types text out with a cursor. `texts/highlight`, `texts/shimmering` and
`texts/gradient` sweep a highlighter, a glint or a gradient across text. Reserve the width of the
longest string so the line around a changing label does not move.

### Press and button feedback

`buttons/button` presses down on a spring. `buttons/copy` copies to the clipboard and swaps its
icon for a check. `buttons/icon` is a like or favorite that bursts particles. `buttons/ripple`
spreads a ripple from the click point. `effects/click` and `effects/particles` put an effect at a
click or around an element; `effects/shine` sweeps light across one. Registry files: `buttons-liquid`
(a fill rising on hover), `buttons-flip`, `buttons-theme-toggler`, `buttons-github-stars`.

### Shared highlight and layout

`effects/highlight` is one background that glides between the items of a nav, a list or a segmented
control. `tabs`, `bottom-navigation`, toggle groups and menus use the same idea for their selected
or hovered item. `pinned-list` glides items between a pinned and an unpinned group.

### Pointer effects

`effects/tilt` tilts a card toward the pointer, `effects/magnetic` pulls an element toward it,
`effects/image-zoom` zooms an image where the pointer is, `cursor` is a custom cursor or a label
that follows it, and `spring` is a draggable element pulled back to its place. Pointer effects run
only on devices that hover with a fine pointer.

### Page and theme transitions

Registry file `components-page-transition` (also `-react-router`, `-tanstack-router`) animates
changes between pages of a Next.js App Router, React Router or TanStack Router app, with a shared
element that can morph from one page to the next. `effects/theme-toggler` switches light and dark
with a wipe across the whole page, built on a view transition; do not write one by hand.

### Backgrounds and icons

Backgrounds are registry files `backgrounds-<name>`: `bubble`, `fireworks`, `glyph`, `gradient`,
`gravity-stars`, `hexagon`, `hole`, `stars`, `topography`. Animated icons are registry files
`icons-lucide-<name>` and `icons-hugeicons-<name>`, one file per icon, played on hover, tap, in
view or from state through `@animate-ui/react/icons`. A background is decoration: it sits behind
content that stays readable, pauses off screen, and stops under reduced motion.

## Reduced motion

Every primitive handles `prefers-reduced-motion: reduce` without setup and follows the setting
live: overlays, menus and dialogs fade in place, disclosures change height at once, indicators and
thumbs jump to their position, icons and loops do not animate. Roles, ARIA attributes, focus and
keyboard behavior stay the base library's.

`AnimateUIProvider`'s `reducedMotion` (`'never'` or `'always'`) overrides the system setting for the
app. Do not set `'never'` unless the user asks for it and accepts the accessibility cost.

Motion written by hand beside the primitives needs its own reduced-motion path; the tokens module
exports `ReducedMotionConfig` and `useShouldReduceMotion` for it. The project's rule is in
[motion-spec.md](motion-spec.md#accessibility-and-reduced-motion), and the review checks it with
the OS setting or `emulateMedia({ reducedMotion: 'reduce' })`.

## Pace

To make every Animate UI animation faster or slower at once, wrap the app in `AnimateUIProvider`
from `@animate-ui/react/provider` and set `tempo` (0.5 to 2; 1 is the default, lower is faster).
Durations and delays are multiplied by it and springs keep their shape. Hand-typed values elsewhere
in the app (Motion props, Tailwind `duration-*`, CSS transitions) do not follow it: name those
files to the user.

The package's motion values are exported from `@animate-ui/react/utils/motion` (`spring`,
`transition`, `scale`, `blur`, `shift`, `ease`, `stagger`, `useMotionTokens`, `useTempoTransition`).
Read them from the installed package; they are not copied here. When the project has its own motion
tokens in `MOTION.md` or its design system, those govern hand-written motion.

## Review existing motion

```bash
npx @animate-ui/cli@latest audit
npx @animate-ui/cli@latest audit src/components --json
```

`audit` reads the code and lists, per file and line, what each element animates and what it costs
(compositor, main thread, paint, layout), plus patterns such as `transition: all`, ease-in on an
entrance, long durations, hover scales, scales from zero, endless loops and files with no
reduced-motion path. It needs no install and changes nothing. Its output is facts, not findings:
judge each one in context with the [motion gate's review](animation-opportunity-and-review.md#3-review-and-evidence-before-completion)
and [compositor cost](animation-opportunity-and-review.md#5-compositor-cost) sections, rank by how
often the motion is felt, and never paste the raw report as the review. It does not see motion
inside the primitives or values behind a ternary.

## Migrate from v1

A v1 project has copied files under `components/animate-ui/`.

```bash
npm install @animate-ui/react motion
npx @animate-ui/cli@latest migrate all --dry-run
npx @animate-ui/cli@latest migrate all
```

`migrate` rewrites imports of the copied v1 primitives to the package, maps v1 export names to the
v2 parts and lists the manual steps (v1-only props, Headless UI primitives, which v2 does not
support). At the end it lists the v1 files nothing imports any more; a non-interactive run keeps
them, and `--delete` removes them. Deleting files is the user's decision: show the list first.
Compare the type-check before and after.

## Vue

A Vue or Nuxt project (shadcn-vue, reka-ui) takes the same paths with these swaps:
`@animate-ui/react` becomes `@animate-ui/vue`, `motion` becomes `motion-v`, and every import path
keeps its place under `@animate-ui/vue/primitives/`. Drop-ins are under
`@animate-ui/vue/primitives/reka-ui`. The CLI reads `components.json`, recognises shadcn-vue and
runs the same `animate` commands. There is no `'use client'`; in Nuxt, `<ClientOnly>` covers what
must not render on the server. Props are kebab-case in templates and callbacks are events.

## What the upstream skill does and where it is here

| Upstream skill | Here |
| --- | --- |
| Choose between the CLI, an import swap and hand-written motion | [Pick the path](#pick-the-path) |
| Check what already ships before writing motion | `design-system search` and `design-system route` over `animate-ui/components` ([Find a component](#find-a-component)) |
| Install with the project's package manager; Tailwind 3 and 4 differences | [Install](#install), [Use it beside existing shadcn/ui components](#use-it-beside-existing-shadcnui-components) |
| Decide how much a component should move | [Motion gate, opportunity screen](animation-opportunity-and-review.md#1-opportunity-screen-before-implementation) |
| Name an effect from a loose description or a feel word | [motion-vocabulary.md](motion-vocabulary.md) |
| Motion rules for hand-written code | [ui-transition-rules.md](ui-transition-rules.md), [motion-spec.md](motion-spec.md), [emil-design-eng](ui-craft-sources.md#emil-design-eng); the upstream rule text is not copied |
| Token values | Read from the installed package ([Pace](#pace)); not copied |
| Recipes for overlays, menus, lists, toasts and named interactions | The primitives above first; otherwise the packaged motion recipes through `design-system search --kind doc` |
| Change the pace of the whole app | [Pace](#pace) |
| Review existing motion | [Review existing motion](#review-existing-motion) |
| Reproduce an animation from a link or a video | [reference-spec.md](reference-spec.md): ordered frames, measured values, then the motion gate |
| Animated icons | Registry icons under [Backgrounds and icons](#backgrounds-and-icons); an icon that is not there is hand-written motion |
| Migrate a v1 project | [Migrate from v1](#migrate-from-v1) |
| Vue and Nuxt | [Vue](#vue) |
| Verify | [Verify](#verify) |

## Verify

- Run the project's type-check before the change and after it; an import swap or a CLI run adds no
  new error.
- The diff of a swap contains only changed imports, removed animation classes, the modal centering
  change where Tailwind 3 needs it, and the package entries.
- In a browser, look at frames in the middle of each animation, trigger it twice quickly (it
  retargets, it does not restart), use the keyboard path, and repeat under reduced motion: things
  still appear and disappear, nothing moves.
- Without a browser, say that it was not run in one.

These checks show the components are wired correctly. They are Component Conformance evidence and
do not grant visual acceptance.

## Keeping it current

`sources.lock.json` pins the revision (`animate-ui`). `npm run sources:update` moves it and
rewrites `reviewedContentHash` above when one of the listed upstream files changed.
`tests/animate-ui-source.test.cjs` then fails until
`node scripts/refresh-animate-ui-fixture.cjs --checkout <clone>` has pinned the new upstream
inventory and the catalog record lists every primitive and registry item it names. Descriptions in
the catalog record are this project's own; edit them there.
