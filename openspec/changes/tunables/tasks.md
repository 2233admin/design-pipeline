# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate tunables --strict` and `npm run specs:check`.

## 2. Contract

- [x] 2.1 `playground-core.cjs`: export `assertControl` and `valueMatches`; `assertControl` takes
  `options` (error scope, extra optional keys). Existing Playground tests unchanged and green.
- [x] 2.2 `skill/references/tunables.schema.json` and `skill/scripts/tunables-core.cjs`: validator
  (control rules through `assertControl`, `unit`, `window`, `dynamic`, colour and text limits, unique
  ids), effective values, coercion from a command-line string, `valuesDigest` through `canonicalJson`.
- [x] 2.3 `generateScript(effective)`: deterministic `tunables.js` (custom properties with units,
  `data-tn-*`, `data-tn-text`); unit test of byte-identical reruns and of the forbidden-word scan.
- [x] 2.4 The schema file and the validator agree on a table of valid and invalid fixtures.

## 3. Commands

- [x] 3.1 `cli-core.cjs`: `tunables` group with `init`, `list`, `set`, `reset`, `sync`, `check`,
  `probe`, `panel`; help lines in `publicHelp()`; `--param` read as `key=value` for `set` and as an id
  for `reset` and `probe`; `--port` and `--idle-minutes` in `KNOWN_OPTIONS`. Rejection cases leave
  files unchanged (compare hashes).
- [x] 3.2 Exit codes: 0 passed, 2 findings that are errors, 1 contract or usage error.

## 4. Film integration

- [x] 4.1 `checkFilmProject`: `tunables` step when `tunables.json` exists; no step and no finding when
  it does not (a test compares `film check` output on an existing fixture before and after).
- [x] 4.2 Read scan: literal `tunable("id")`, `tunable('id')`, `--tn-id`, `data-tn-text`, `data-tn-id`;
  `param-unread`, `read-undeclared`, `dynamic`.
- [x] 4.3 `render-older-than-values` on the render step; set then check fails, re-render passes.
- [x] 4.4 `scaffoldFilm` default template writes the three pieces; tests that list scaffold files are
  updated; `motion-study` and `tracking-hud` lists are asserted unchanged.

## 5. Runtimes, pages and probe

- [x] 5.1 Film fixture reads one value through GSAP, one through a CSS custom property and one in a
  canvas draw function; assert timeline length, computed colour and canvas pixel.
- [x] 5.2 Web fixture (`index.html`, no timeline) uses `var(--tn-*)` with a unit, a `[data-tn-*]`
  rule and `data-tn-text`; assert computed radius, rule match and heading text.
- [x] 5.3 `npx --no-install hyperframes check` passes on a scaffolded project that includes
  `tunables.js` with params (record the output); lint and the determinism rules do not object.
- [x] 5.4 `tunables probe`: wired colour passes on the film and the web fixture; read-but-overwritten
  reports `param-no-visible-effect`; project file hashes unchanged; no browser gives
  `BROWSER_UNAVAILABLE`.

## 6. Panel and preview server

- [x] 6.1 `skill/scripts/tunables-preview-core.cjs`: loopback server with the token, `Host` check,
  routes, containment through `resolveInside` plus `realpath`, method and size limits, idle shutdown,
  draft held in memory, `tunables.js` generated from draft or saved values.
- [x] 6.2 Save: validation shared with `set`, `revision` check and 409 `REVISION_CONFLICT`, `sync`,
  stale-render state in the response.
- [x] 6.3 `skill/tools/tunables-panel/panel.html`: controls per type, labels, defaults, reset, focus
  seeks to the param's `window`, scrubber and play only when a timeline is registered, 375/768/1280
  viewport buttons, debounced frame reload, conflict and invalid-entry states, footer saying it is a
  preview and not a render. Keyboard operable; every control has a label.
- [x] 6.4 `probe` reuses the server with a draft; the probe tests from 5.4 pass through it.
- [x] 6.5 A port already in use exits 1.
- [x] 6.6 `tests/tunables-panel.test.cjs` over HTTP on port 0: routes, token, host, traversal, encoded
  separators, symlink out of the root (skipped with the reason where symlinks cannot be created),
  `.git/` and `.env`, methods, body size, draft versus disk, save, conflict, invalid draft, idle
  shutdown, no accept or render control in the page.
- [x] 6.7 One browser test: change a colour control, read the frame's computed colour, Save, read the
  file. Skipped with the reason printed when no browser is available.

## 7. Guides and package

- [x] 7.1 `workflow-film.md#build` row and "what to expose" paragraph; `workflow-web.md#build` section;
  `hyperframes.md` determinism list says `tunables.js` is data; `SKILL.md` names `tunables` once;
  CHANGELOG `Unreleased / Added`.
- [x] 7.2 `package-resources.json` `required` gains the two modules, the panel page and the schema;
  `scripts/test-manifest.json` gains `tunables.test.cjs` and `tunables-panel.test.cjs`.

## 8. Checks

- [x] 8.1 `node --test tests/tunables.test.cjs tests/tunables-panel.test.cjs` and the film, scaffold,
  playground and CLI tests that list files or help text.
- [ ] 8.2 End to end on a scratch film project and on a scratch web page: `tunables panel`, change
  values in the page and Save, then for the film render and `film check`, for the page `tunables
  check`; screenshot the panel before and after; record commands and outputs in the PR.
- [ ] 8.3 `npm test` (repository QA), after `git add` of the new files.
