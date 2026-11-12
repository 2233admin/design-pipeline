# Proposal: tunables, a runtime-neutral surface the owner edits without touching code

## Why

A finished film, page or UI motion is code. To change one caption, one colour or one duration the
owner has to ask an agent to reopen the source, because nothing says which values are meant to
change or where they live. There is no file an owner, a script or a second agent can edit and see.

MotionHarness (npm `@motionharness/cli` 0.1.5) closes this for video in its own runtime: parameter
contracts in source, saved values in `document.json`, `mh param set` changing a value without
touching code (checked on a Pro project, 2026-11-12). It has no frontend page or UI tooling. The
comparison is in
[docs/research/motionharness-cli-comparison-2026-11-12.md](../../../docs/research/motionharness-cli-comparison-2026-11-12.md)
(gap G1). Ideas only: it is closed source (`UNLICENSED`), so none of its text, code or binary is
copied or redistributed, and nothing depends on its React SDK.

This pipeline already has most of the parts:

- `playground.json` declares controls (`range`, `select`, `checkbox`, `color`, `text`) and
  `playground-core.cjs` validates them. A Playground tunes an accepted system and hands an agent a
  prompt; nothing is saved into the project.
- `film check` is the gate envelope for film; `film-capture-core.cjs` drives a browser over a
  composition; `browser-locate.cjs` finds the browser.
- The web workflow builds pages in any stack and verifies them in a browser.

What is missing is the step between: a declared, validated, saved set of values that a project
reads, plus an editor an owner can use. This change adds that, for film and for frontend pages and
UI alike, in plain data that GSAP, Anime.js, CSS, WAAPI, canvas, Three.js and Lottie can all read.

## What changes

- New file `tunables.json` in a project root (schema `design-pipeline.tunables.v1`):
  - `params`: what may change. Each is a Playground control (`id`, `label`, `group`, `type`
    `range|select|checkbox|color|text`, `default`, `min/max/step`, `options`) plus optional `unit`,
    `window` (the seconds where it shows) and `dynamic`.
  - `values`: the owner's changes, by id.
- New generated file `tunables.js`: defines `window.tunable(id)`, sets `--tn-<id>` CSS custom
  properties (range with its CSS unit, colour), `data-tn-<id>` attributes on `<html>` (select,
  checkbox), and fills elements marked `data-tn-text="<id>"`. A page loads it first.
- New command group `designer-pipeline tunables`: `init`, `list`, `set`, `reset`, `sync`, `check`,
  `probe`, `panel`. `set` validates against the param, writes `values`, regenerates `tunables.js`;
  it never edits source, `storyboard.json` or the param list.
- `tunables panel` starts a local editor on `127.0.0.1`: a control per param, a preview of the page
  or composition with a time scrubber (when it has a timeline) and viewport buttons (phone, tablet,
  desktop), and Save. A change shows in the preview at once from a draft held in the server; the
  project's files change only on Save, through the same validation as `set`.
- `film check` gains a `tunables` step when `tunables.json` exists, and a stale-render finding when
  a value changed after the newest render. `tunables check` runs the same static checks on any
  page project.
- `tunables probe` loads the page with a default and a changed value and warns when nothing on
  screen moved, so a declared param that is not wired cannot pass as editable.
- `film scaffold` (default template) writes an empty `tunables.json`, `tunables.js` and the include.
- `workflow-film.md`, `workflow-web.md` and `hyperframes.md` say what to expose and how to read it.

## Reused, not added

- Control vocabulary and validation: `playground-core.cjs` exports `assertControl` and
  `valueMatches` (they gain a `scope` argument and an extra-keys list); tunables validates its
  params with them. There is one control contract.
- Gate shape: the new step is one more entry in `film check`'s `steps`, with findings that carry a
  `fix`, in the same envelope as storyboard, timeline, render and composition.
- Render freshness: `newestRender` already orders renders by modification time.
- Canonical digest: `canonicalJson` and `sha256` from `contract-utils.cjs`.
- Browser: `browser-locate.cjs` and the Puppeteer resolution `film-capture-core.cjs` uses.
- Option names: `--param` (repeatable `key=value`, already used by `template render`) and
  `--project-root`.
- Path containment: `resolveInside` from `contract-utils.cjs` for every file the server returns.
- Acceptance: a re-render already reopens the owner's review; no receipt schema or acceptance state
  is added.

## Boundaries

- The panel does not render, play sound or play video clips: for a film it shows frames by seeking
  the paused timeline; for a page it is the live page. It has no accept or reject control;
  acceptance stays the owner's words recorded by `decide`.
- No keyframes or curves. A value is one constant; motion over time stays in the timeline.
- No Blender, audio or footage-edit parameters.
- No sync between a timing param and `storyboard.json`. A param that moves a beat boundary is
  caught by the existing timeline gate.
- No new web `next` step. A web project uses the `tunables` commands and the guide; the existing
  web gates run on the page as before.
- `film scaffold` templates `motion-study` and `tracking-hud` are unchanged.
- No adapter entry for MotionHarness. An owner who wants its Studio can install it.
- No ticket: this line of work records in OpenSpec and the PR.

## Capabilities

- `design-pipeline`: ADDED nine requirements (contract file, generated script, edit commands, check
  step, stale render, probe, scaffold, panel serving and preview, panel saving).
