# Composition delta

## ADDED Requirements

### Requirement: A page profile judges where text sits on a scrolling page

The composition gate SHALL accept a fourth profile, `page`, listed after `frame`, that keeps the `ui`
limits for the picture checks and for text contrast and differs only in how it treats text position.
Under `page`, text that is fully below the screen, runs past the bottom edge, or is fully outside the
screen on the left, right or top SHALL NOT be reported for position. Text that is partly on screen and
runs past the left, right or top edge SHALL be reported as a warning `text-off-canvas`, which `--allow
text-off-canvas` waives. `blank-frame`, `low-contrast` and `text-contrast` SHALL remain errors, and text
contrast SHALL still be read for every visible text item, on screen or not. The `ui`, `poster` and
`frame` profiles SHALL give the same findings as before.

#### Scenario: Text below the screen is not reported

- **WHEN** a page's elements include text whose box starts below the bottom edge of the viewport and text that runs past the bottom edge, checked with `page`
- **THEN** no `text-off-canvas` finding SHALL be reported for them
- **AND** the same elements checked with `ui` SHALL still report `text-off-canvas` errors for them.

#### Scenario: Text outside the screen on purpose is not reported

- **WHEN** text lies fully to the left of, fully to the right of, or fully above the viewport (a closed menu, a carousel card), checked with `page`
- **THEN** no `text-off-canvas` finding SHALL be reported for it.

#### Scenario: Text cut at an edge is a waivable warning

- **WHEN** text is partly on screen and its box runs past the right edge, checked with `page`
- **THEN** a `text-off-canvas` finding with severity `warn` SHALL be reported and the result status SHALL NOT be `failed` because of it
- **AND** with `allow: ["text-off-canvas"]` the finding SHALL move to `allowed`.

#### Scenario: Blank and unreadable stay errors

- **WHEN** a nearly empty picture, or text whose contrast is below 4.5:1 against a known background, is checked with `page`
- **THEN** `blank-frame`, `low-contrast` or `text-contrast` SHALL be reported with severity `error` and the status SHALL be `failed`.

#### Scenario: Unreadable text outside the screen still fails

- **WHEN** a text item with a contrast of about 2:1 against its known background lies fully below the bottom edge of the viewport, checked with `page`
- **THEN** a `text-contrast` finding with severity `error` SHALL be reported for it and the status SHALL be `failed`.

#### Scenario: Other profiles are unchanged

- **WHEN** the existing `ui`, `poster` and `frame` fixtures of the composition tests are checked
- **THEN** their finding codes, severities and statuses SHALL equal those before this change
- **AND** an unknown profile SHALL still fail with a message that contains `allowed: ui, poster, frame`.

#### Scenario: The profile works in the picture mode of verify composition

- **WHEN** `verify composition --image <png> --elements <json> --profile page` runs on the elements of a tall page whose text below the screen makes `--profile ui` fail
- **THEN** it SHALL report no `text-off-canvas` finding for that text.

### Requirement: A page can be checked at three sizes from one capture per size

The composition module SHALL provide a check of a web page's first screen at `375x812`, `768x1024` and
`1440x900`, in that order, that takes the capture as a function. It SHALL capture all three sizes, and
confirm that each left a picture and an elements file, before it writes any result. It SHALL check each
picture with the `page` profile and write `result.json` (the unchanged `design-pipeline.composition-check.v1`
document) next to the picture. It SHALL return a summary with the profile, a `status`, each size's status
and counts, every finding with its size and fix, and `creativeAcceptance` equal to `not-assessed`. It
SHALL throw when a capture leaves no picture or no elements file, and SHALL record no gate and read no
workflow state.

#### Scenario: Three good sizes pass

- **WHEN** the check runs with a capture that writes a good picture and elements for each size
- **THEN** nine files SHALL exist under `evidence/composition/`, each `result.json` SHALL have `schema` equal to `design-pipeline.composition-check.v1` and `profile` equal to `page`, and the summary SHALL list the three sizes in order with status `passed`
- **AND** `creativeAcceptance` SHALL be `not-assessed`.

#### Scenario: One bad size fails and the others are still written

- **WHEN** the capture for `768x1024` writes a nearly empty picture and the other two write good ones
- **THEN** the summary `status` SHALL be `failed`
- **AND** the `result.json` of all three sizes SHALL be written, and the findings of `768x1024` SHALL carry that size and a fix.

#### Scenario: A capture that leaves no picture writes no result

- **WHEN** the capture for the second size leaves no `screenshot.png`
- **THEN** the check SHALL throw with the size and file in the message
- **AND** no `result.json` SHALL exist for any size.

### Requirement: The capture can wait for the picture to settle

The composition capture script SHALL accept `--settle-ms <n>`, an integer from 1 to 10000. With it, the
script SHALL take a picture, then take another every 250 ms until two in a row are identical, at most
`ceil(n / 250)` more times, and SHALL save the last picture. Without it the script SHALL take one picture
and behave as before. No CLI option SHALL let a user set it: `composition capture` SHALL NOT pass it, only
`verify interaction` SHALL pass it to the script (fixed at 4000), and the CLI's known options SHALL NOT
change. A value that is not an integer in range SHALL be refused before any browser starts.

#### Scenario: A bad settle value is refused without a browser

- **WHEN** the script runs with `--settle-ms 99999` or `--settle-ms abc`
- **THEN** it SHALL exit 1 with a message naming `--settle-ms`, before resolving any browser.

#### Scenario: The script waits only when asked

- **WHEN** a page whose picture changes twice and then stays still is captured through `verify interaction` (which passes the option) and through `composition capture` (which does not)
- **THEN** the first capture SHALL save a picture byte-equal to the last picture taken, after the extra pictures
- **AND** the second SHALL take exactly one picture.

#### Scenario: A page that animates on load is saved after it settles

- **WHEN** the capture runs in a real browser on a page whose text appears during a 1.6 s entrance animation, with `--settle-ms 4000`
- **THEN** the saved picture SHALL show all of the text
- **AND** the same page captured without the option MAY fail the `page` check with `low-contrast`. This scenario needs a real browser and is skipped where none is available.

### Requirement: No new finding code, schema id or verb

This change SHALL NOT add a finding code, a schema id, a receipt type, a CLI command or a CLI option to the
composition gate. The set of finding codes SHALL equal the set before this change. Gate results SHALL keep
`creativeAcceptance` equal to `not-assessed` and SHALL NOT report Visual Acceptance; the gate status is a
Component Conformance result, and the pictures and warnings are evidence for a reviewer.

#### Scenario: The finding codes are unchanged

- **WHEN** the finding codes of the composition gate are compared with those before this change
- **THEN** they SHALL be equal
- **AND** `design-pipeline.composition-check.v1` SHALL still be the `schema` of every composition result.

### Requirement: The page a probe names is told apart from pages that cannot be bound to a record

The composition module SHALL provide one check that, for a project folder and a probe `url`, says whether
the `url` names a regular file whose real path is inside the project folder (a file, with its path
relative to the folder), or is elsewhere (an address starting with `http://` or `https://`, in any letter
case; or something that exists but is not a regular file inside the folder: a link that leads outside it,
a folder, the folder itself), or is absent (no such file). For a project folder it SHALL also read
`interaction.json` with the validator of `verify interaction` and return the same answer, with the list of
the probe file, the page file and the nine evidence paths when the answer is a file, or the answer invalid
with the validator's reason when the probe file is missing, unreadable or not valid. It SHALL read no
workflow state and SHALL record nothing. `verify interaction` and the web `probe` stage SHALL both use it,
so that the command and `next` cannot disagree about which pages count.

#### Scenario: A page file inside the project is a file

- **WHEN** the `url` is `index.html`, `pages/demo/index.html`, `pages/../index.html`, or a path through a folder link whose target is another folder inside the project
- **THEN** the answer SHALL be a file, with its path relative to the project folder and forward slashes.

#### Scenario: An address, a link leading out and a folder are elsewhere

- **WHEN** the `url` is `http://localhost:5173/`, `HTTPS://example.com/x`, a path through a folder link whose target lies outside the project, a folder inside the project, or `.`
- **THEN** the answer SHALL be elsewhere.

#### Scenario: A missing page is absent

- **WHEN** the `url` names no existing path, or carries a fragment such as `index.html#hero`
- **THEN** the answer SHALL be absent.

#### Scenario: The probe file decides invalid

- **WHEN** `interaction.json` is missing, is not JSON, or has a `url` that climbs out of the folder or is an absolute path
- **THEN** the answer for the folder SHALL be invalid and SHALL carry the validator's reason.

#### Scenario: The list is exact

- **WHEN** the answer for a folder is a file
- **THEN** the list SHALL be exactly `interaction.json`, the page file, and `evidence/composition/<size>/screenshot.png`, `elements.json` and `result.json` for `375x812`, `768x1024` and `1440x900`, and SHALL contain `index.html` only when the `url` names it.
