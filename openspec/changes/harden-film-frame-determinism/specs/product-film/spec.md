# Product film delta

## ADDED Requirements

### Requirement: Frame-deterministic composition source

`film check` SHALL scan `index.html` and `compositions/*.html` and report `nondeterministic-source`,
with file, line and a fix, for `Math.random`, `Date.now`, `performance.now`,
`requestAnimationFrame` and autoplaying `<video>` or `<audio>` as errors, and for `setTimeout` and
`setInterval` as warnings. Comments and string contents SHALL be ignored, and a seeded hash of the
frame index SHALL pass. An error SHALL fail the timeline step even when no timeline was captured;
warnings alone SHALL NOT fail it. The timeline manifest schema SHALL NOT change.

#### Scenario: Unseeded randomness in the composition

- **WHEN** `index.html` calls `Math.random()` on line N
- **THEN** the timeline step SHALL be `failed` with a `nondeterministic-source` finding whose file is `index.html` and line is N
- **AND** the `fixes` entry SHALL carry the same file and line.

#### Scenario: Seeded jitter passes

- **WHEN** the composition derives jitter from `hash(seed, frameIndex)` and mentions `Math.random` only in comments or strings
- **THEN** the scan SHALL report no finding.

#### Scenario: No captured timeline

- **WHEN** no timeline was captured and the scan finds an error
- **THEN** the timeline step SHALL be `failed`
- **AND** with no error it SHALL remain `skipped`.

### Requirement: Local script sources are scanned inside the project only

`film check` SHALL apply the same scan to local `<script src>` files and report the script's own
path and line. A root-relative `src` such as `/js/app.js` SHALL resolve against the project root;
any other relative `src` SHALL resolve against the referencing HTML file, then the project root.
`film check` SHALL NOT read a script whose lexical or real (symlink-resolved) path lies outside the
project root, and SHALL NOT fetch network URLs. It SHALL list network URLs and filesystem-absolute
forms (drive letters, UNC, `file:`) as unscanned without a warning. A local minified script
(`*.min.js`) SHALL NOT be scanned, SHALL be listed as unscanned with the reason `minified, not
scanned`, and SHALL raise the warning `external-script-unscanned`. A `src` that escapes the project
root or names a missing file SHALL raise the same warning and SHALL NOT crash the check.

#### Scenario: A local script uses Math.random

- **WHEN** `index.html` loads `/js/app.js` whose line 2 calls `Math.random()`
- **THEN** the gate SHALL report `nondeterministic-source` naming `js/app.js` and line 2.

#### Scenario: Escapes are not read

- **WHEN** a `src` is `/../x.js`, `../x.js` or a symlink pointing outside the project root
- **THEN** the file SHALL NOT be read
- **AND** the gate SHALL report `external-script-unscanned` with severity `warn`.

#### Scenario: Unscannable forms

- **WHEN** a `src` is `https://cdn.example.com/x.js`, `//cdn.example.com/x.js`, `C:\a.js`, `\\host\share\a.js` or `file:///a.js`
- **THEN** it SHALL appear in `unscannedScripts` and SHALL NOT be fetched or read
- **AND** a local `js/bundle.min.js` SHALL appear there with a warning instead of an error.

### Requirement: Beat author contract

The HyperFrames reference SHALL state that jitter and noise derive from `hash(seed, frameIndex)`
and SHALL give a beat author contract covering overwrite-only output, determinism in time, palette
constants and where to edit.

#### Scenario: Guidance is present

- **WHEN** a reader opens `references/hyperframes.md`
- **THEN** it SHALL contain the `hash(seed, frameIndex)` rule and the four-point beat author contract.
