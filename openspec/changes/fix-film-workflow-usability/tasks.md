## 1. Composition gate layout samples

- [x] 1.1 Add `layout-probe.js` and `captureLayout` (kernel `--layout-times`), sampling visible text with clip, cover, nesting and clip-window handling.
- [x] 1.2 Add `checkFilmLayout` with `text-overlap`, `text-edge-margin` and `text-too-small` and their fixes; merge its findings into the existing composition step of `film check`; wire `--allow`.
- [x] 1.3 Calibrate on the dogfooding finals and rebuilt rounds; keep the captures as fixtures and the table in design.md.

## 2. Quick film review

- [x] 2.1 Add the review stage with the frame-review `first` instruction to quick film; prefix ask lines with `first`.
- [x] 2.2 Update the film guide, README and `film check` next text.

## 3. Pinned scaffold

- [x] 3.1 Export the HyperFrames/GSAP pins; default preview and catalog calls to them.
- [x] 3.2 Write `package.json` from `film scaffold`, load GSAP from `node_modules`, use `npx --no-install` in guides and actions.

## 4. Action commands and product-promo scaffold steps

- [x] 4.1 `next` actions keep `command` for an executable command only, spelled `node <absolute path of designer-pipeline.cjs> ...` (the `record` template of an `ask` action likewise), and move free text to a new `instruction` field; an action with nothing to execute carries only `instruction`, `line` shows both, and `blocked` actions explain in `instruction`. `CLI` in `workflows/shared.cjs` derives the path from `__dirname`. `tests/workflow-action-commands.test.cjs` walks film, edit, web and ui and asserts every `command`/`record` starts with that invocation and that one returned command runs from another directory; tests in `workflow-next` and `product-source-workflow` that matched prose in `command` now read `instruction`. `SKILL.md`, `stages.md` and `workflow-film.md` describe the fields.
- [x] 4.2 `film scaffold` for a project bound to a `product-launch-video` plan adds the `productSource` record step before the reference/storyboard steps and the sample step before the build step to `next[]`; other scaffolds keep their output. `tests/film-project.test.cjs` covers it and the action-commands test checks the scaffold run from a `next` command.

## 5. Verify

- [x] 5.1 Focused tests: `tests/film-layout.test.cjs`, `tests/film-project.test.cjs`, `tests/workflow-next.test.cjs`, `tests/film-catalog-3d.test.cjs`, `tests/hyperframes-routing.test.cjs`, `tests/workflow-action-commands.test.cjs`; record the red result against f41da71.
- [x] 5.2 `npm run specs:check` and `node scripts/qa.cjs` from the clean worktree.
- [x] 5.3 Smoke: fresh scaffold, `npm install`, `npx --no-install hyperframes --version`, quick `next` review step, `film check` flags an injected boundary overlap.
