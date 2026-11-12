## ADDED Requirements

### Requirement: A project declares what may change in `tunables.json`

A project MAY carry `tunables.json` with schema `design-pipeline.tunables.v1`. Each of its `params` SHALL be a Playground control (`id`, `label`, `group`, `type`, `default`, and the limits that type needs) and MAY add `unit`, `window` and `dynamic`. Its `values` SHALL hold only declared ids, each valid for its param. A param's effective value SHALL be its value, else its default. The file SHALL NOT name a motion runtime.

#### Scenario: A valid file gives effective values

- **WHEN** `params` declares `accent` (colour, default `#ff5a36`) and `beat-02-duration` (range 0.4 to 3, default 1.2) and `values` sets only `beat-02-duration` to 1.6
- **THEN** `tunables list` SHALL show `accent` as `#ff5a36` (default) and `beat-02-duration` as `1.6` (changed)

#### Scenario: A broken contract is rejected

- **WHEN** a file has a duplicate id, an id with a capital or underscore, a param without `label` or `group`, a range without `min` or `max`, a default outside its range, a select default not in `options`, or a `window` with `startSec >= endSec`
- **THEN** `tunables check` SHALL report `tunables-invalid` with the offending id and exit 2

#### Scenario: A value that does not fit its param is rejected

- **WHEN** `values` holds a number outside its range, a colour that is not `#rrggbb[aa]`, a select value not in `options`, or an id that is not declared
- **THEN** `tunables check` SHALL report `value-invalid` or `value-unknown` and exit 2.

### Requirement: `tunables.js` gives every runtime and page the same values

`tunables sync` SHALL write `tunables.js` from the effective values, deterministically. It SHALL define `window.tunable(id)`, which returns the value and throws for an undeclared id; set `--tn-<id>` custom properties for range and colour params; set `data-tn-<id>` on the root element for select and checkbox params; and set the text of elements marked `data-tn-text`. It SHALL NOT read location, storage, a clock or a random source.

#### Scenario: GSAP, CSS and canvas read the same value

- **WHEN** a fixture sets `beat-02-duration` to 1.6 and `accent` to `#00c2a8`, and a GSAP timeline, a CSS rule using `var(--tn-accent)` and a canvas draw function each read them
- **THEN** the captured GSAP timeline SHALL last 1.6 s for that beat, the computed CSS colour SHALL be `rgb(0, 194, 168)` and the canvas pixel SHALL be that colour

#### Scenario: A page is styled and filled without script

- **WHEN** a page uses `var(--tn-card-radius)`, a `[data-tn-grain="true"]` rule and `<h1 data-tn-text="title-text">`
- **THEN** the computed radius SHALL equal the value with its unit, the rule SHALL match when the checkbox is on, and the heading text SHALL equal the value

#### Scenario: An undeclared id fails loudly

- **WHEN** a page calls `tunable("nope")`
- **THEN** it SHALL throw `undeclared tunable: nope`

#### Scenario: The script is plain data

- **WHEN** `tunables sync` runs twice
- **THEN** both outputs SHALL be byte-identical
- **AND** the text SHALL NOT contain `location`, `localStorage`, `sessionStorage`, `Date`, `performance` or `Math.random`.

### Requirement: `tunables set` and `reset` change values only

`tunables set --param id=value` SHALL validate each value against its param, write `values`, and re-run `sync`. `tunables reset --param id` SHALL remove a value. Neither SHALL edit source files, `storyboard.json` or `params`. An invalid value SHALL exit 1 and leave every file as it was.

#### Scenario: A value is set and the script follows

- **WHEN** `tunables set --project-root <dir> --param beat-02-duration=1.6 --param accent=#00C2A8` runs
- **THEN** `values` SHALL hold `1.6` and `#00c2a8`, `tunables.js` SHALL carry them, and no other file SHALL change

#### Scenario: A bad value changes nothing

- **WHEN** `--param beat-02-duration=9` runs and `max` is 3, or one of two `--param` values is invalid
- **THEN** the exit code SHALL be 1 with code `VALUE_INVALID` naming the id and its limits
- **AND** the SHA-256 of every project file SHALL be unchanged.

### Requirement: `check` and `film check` find params that do not work

`tunables check` SHALL work on any project root with an `index.html`. `film check` SHALL run the same checks as a `tunables` step when `tunables.json` exists. They SHALL report `tunables-invalid`, `value-invalid`, `value-unknown`, `script-stale`, `script-not-included`, `param-unread` and `read-undeclared`, each with a `fix`. A project without the file SHALL see no new step and no new finding. A passing step SHALL NOT mean acceptance.

#### Scenario: A param nothing reads is an error

- **WHEN** `title-text` is declared and no project file contains `tunable("title-text")`, `--tn-title-text` or `data-tn-text="title-text"`
- **THEN** the check SHALL report `param-unread` for `title-text` unless the param has `dynamic: true`

#### Scenario: A hand-edited script is stale

- **WHEN** `tunables.json` changes by hand and `sync` has not run
- **THEN** the check SHALL report `script-stale` with the `tunables sync` command as its fix

#### Scenario: A page that never loads the script is an error

- **WHEN** params exist and `index.html` has no `<script src="tunables.js">` before its other scripts
- **THEN** the check SHALL report `script-not-included`

#### Scenario: No file, no change

- **WHEN** a project has no `tunables.json`
- **THEN** `film check` SHALL return the same steps and findings as before this change.

### Requirement: A changed value cannot pass on an older render

When `tunables.json` or `tunables.js` is newer than the newest render, `film check` SHALL report `render-older-than-values` as an error on the render step, with the re-render command as its fix. `film check` SHALL NOT record or imply acceptance of any render.

#### Scenario: Set, then check without rendering

- **WHEN** a render exists, `tunables set` changes a value, and `film check` runs
- **THEN** the render step SHALL fail with `render-older-than-values`

#### Scenario: Re-render clears it

- **WHEN** the film is rendered again after the change
- **THEN** the finding SHALL be absent and `creativeAcceptance` SHALL still be `not-assessed`.

### Requirement: `tunables probe` shows whether a param is visible

`tunables probe` SHALL, for each param or the one named, screenshot the page with the effective value and with a changed value, at three sampled times when the page registers a timeline and once after load when it does not. It SHALL report the warning `param-no-visible-effect` when every stable pair is byte-identical. It SHALL load the changed value as a draft from the preview server and SHALL NOT write project files.

#### Scenario: A wired colour shows

- **WHEN** `accent` fills a visible shape in the sampled window
- **THEN** the probe SHALL report no finding for it

#### Scenario: A param that is read but overwritten is reported

- **WHEN** a param is read by the script but a later line sets the same property to a constant
- **THEN** the probe SHALL report `param-no-visible-effect` with the sampled points, as a warning

#### Scenario: Project files are untouched

- **WHEN** the probe finishes
- **THEN** the SHA-256 of every project file SHALL equal its value before the run

#### Scenario: No browser

- **WHEN** no Chromium-based browser is available
- **THEN** the command SHALL exit 1 with `BROWSER_UNAVAILABLE` and the command that installs one.

### Requirement: `tunables probe` ignores a page that changes by itself

Before comparing, `tunables probe` SHALL load the page twice at the saved values and ignore a sampled point that differs between those loads. It SHALL report the warning `probe-unstable` for a param with no point left.

#### Scenario: A page that changes by itself is not judged

- **WHEN** two loads of the page at the same values differ at every sampled point
- **THEN** the probe SHALL report `probe-unstable` as a warning and SHALL NOT report `param-no-visible-effect` for that param

### Requirement: The default film scaffold is editable from the start

`film scaffold --template default` SHALL write an empty `tunables.json`, a synced `tunables.js`, and a `<script src="tunables.js">` in `index.html` before its other scripts. `motion-study` and `tracking-hud` SHALL be unchanged. `tunables init` SHALL add the two files to an existing project, film or web page, and print the line to add, without editing `index.html`.

#### Scenario: A fresh scaffold checks clean

- **WHEN** `film scaffold --output <dir>` runs and then `film check`
- **THEN** the `tunables` step SHALL pass with zero params

#### Scenario: Other templates are untouched

- **WHEN** `film scaffold --template motion-study` or `--template tracking-hud` runs
- **THEN** the written file list SHALL equal the list before this change

#### Scenario: An existing project is initialised without editing its page

- **WHEN** `tunables init --project-root <dir>` runs on a project that has `index.html`
- **THEN** `tunables.json` and `tunables.js` SHALL be created, the script-tag line SHALL be printed, and `index.html` SHALL be byte-identical
- **AND** a project that already has `tunables.json` SHALL be refused with `OUTPUT_EXISTS` unless `--replace` is given.

### Requirement: `tunables panel` serves a local editor with a draft preview

`tunables panel` SHALL start an HTTP server bound to `127.0.0.1`, print one URL, and serve a page with one control per param and a preview of the project. Every route SHALL need a random token in its path and a loopback `Host`. The preview SHALL be built from a draft held in memory; the project's files SHALL NOT change until Save. The server SHALL serve only regular files inside the project root and SHALL stop after the idle time.

#### Scenario: Each param type gets its control

- **WHEN** the panel opens on a project with a range, colour, text, checkbox and select param
- **THEN** it SHALL show a slider with a number box, a colour picker, a text box with a length counter, a switch and a menu, each with its label, default and a reset button

#### Scenario: A page gets viewport buttons and a film gets a scrubber

- **WHEN** the project's page registers no `window.__timelines`
- **THEN** the panel SHALL show buttons for 375, 768 and 1280 px frame widths and no scrubber
- **AND** when the page registers a timeline, the panel SHALL also show a scrubber that seeks it.

#### Scenario: The preview follows the draft and the disk does not

- **WHEN** the draft sets `accent` to `#00c2a8` and the preview frame reloads
- **THEN** the frame's `tunable("accent")` SHALL return `#00c2a8`
- **AND** the SHA-256 of `tunables.json` and `tunables.js` on disk SHALL be unchanged.

#### Scenario: Requests that should fail do

- **WHEN** a request has no token or a wrong token, a `Host` of another name, a path with `..`, an encoded separator, an absolute path, a symlink out of the root, `.git/` or `.env`, a method other than GET, PUT or POST, or a body over 64 KB
- **THEN** the response SHALL be 403, 404, 405 or 413 and nothing outside the root SHALL be read

#### Scenario: The server stops on its own

- **WHEN** no request arrives for `--idle-minutes`
- **THEN** the server SHALL close its port and the command SHALL exit 0.

### Requirement: Saving from the panel uses the same checks as `set`

Save SHALL write the draft as `values`, re-run `sync`, and return the new file revision and the render-older-than-values state. It SHALL send the revision it loaded, and the server SHALL answer 409 `REVISION_CONFLICT` with the current state when the file has changed since. An invalid draft SHALL write nothing. The panel SHALL NOT render, accept or reject.

#### Scenario: A save writes values and marks the render stale

- **WHEN** the draft changes `beat-02-duration` to 1.6 and Save is pressed after a render exists
- **THEN** `tunables.json` `values` SHALL hold `1.6`, `tunables.js` SHALL carry it, and the response SHALL say the render is older than the values with the render command

#### Scenario: A concurrent edit is not overwritten

- **WHEN** `tunables set` changes the file after the panel loaded it and the panel then saves
- **THEN** the response SHALL be 409 `REVISION_CONFLICT` and the file SHALL keep the `set` result

#### Scenario: An invalid draft writes nothing

- **WHEN** the draft holds a number outside its range
- **THEN** Save SHALL be refused with `VALUE_INVALID` naming the id and the SHA-256 of every project file SHALL be unchanged

#### Scenario: Acceptance stays outside

- **WHEN** the panel page is read
- **THEN** it SHALL contain no accept, reject or render control.
