## ADDED Requirements

### Requirement: ASCII art composition template is scaffolded self-contained

`composition scaffold --template ascii-art --output <new-dir>` SHALL create, in a new directory of
the project, a page, its player, a preset table, the exact text of each vendored ascii.rest piece
module and the MIT notice, without network access, package installation or workflow state.

#### Scenario: Scaffold an offline project
- **GIVEN** an installed or source skill and a project directory
- **WHEN** `composition scaffold --template ascii-art --output ascii` runs for that project
- **THEN** the directory holds `index.html`, `ascii-art.js`, `presets.js`, `pieces.js` and `LICENSE.ascii-rest`, each piece's text hashes to the vendor manifest, and the page opened from disk draws its default preset without any request leaving the directory

#### Scenario: Preserve authored work and refuse altered sources
- **GIVEN** an existing output directory, or a vendored piece whose bytes no longer match its manifest hash
- **WHEN** the scaffold runs
- **THEN** it fails without overwriting project files or copying the altered piece

### Requirement: Vendored ascii.rest source is pinned

The skill SHALL keep the ascii.rest files the template needs byte for byte under
`skill/vendor/ascii-rest/` with the MIT license and a manifest recording the npm package version and
tarball integrity, the upstream repository and full revision, the fork alias, and a sha256 per file.

#### Scenario: Verify the snapshot
- **GIVEN** the vendor bundle
- **WHEN** the source check runs
- **THEN** every file matches its manifest size and hash, no unlisted file is present, the package version matches the manifest and the MIT notice is retained

### Requirement: ASCII art frames are addressed by explicit time

The page SHALL draw a preset's frame for an explicit time, as text in a `<pre>` for a mono piece and
in palette colours on a canvas for a piece with a palette, and SHALL show the same frame for the
same time after cold, repeated and reordered seeks, including pieces whose output depends on
earlier calls.

#### Scenario: Seek a piece that carries a simulation
- **GIVEN** the doom fire preset, whose upstream frame advances an internal simulation by the time since its previous call
- **WHEN** the page is asked for 2 s cold, after later times, or after 1 s
- **THEN** it shows the frame that playing from 0 at the preset's sample rate shows at 2 s, and 1 s shows an earlier fire rather than a frozen first moment

#### Scenario: Seek a coloured scene
- **GIVEN** the night coast preset drawn on a canvas, whose colours upstream come from a cache filled by earlier frames
- **WHEN** the same progress is drawn on a fresh page and after other progress values
- **THEN** the canvas pixels are identical, and another progress gives other pixels

#### Scenario: Reject an inconsistent preset
- **GIVEN** a preset whose grid differs from its piece, an unknown field, an unknown piece or an unknown preset name
- **WHEN** the page loads it
- **THEN** it shows the error on the page and the capture hooks throw instead of drawing a frame

### Requirement: ASCII art page exposes the composition capture contract

The page SHALL implement `window.renderStudy(progress)` and register a `window.__timelines` seek
hook that `composition capture --seek` drives, SHALL stop live playback and hide its controls when
either is called, and SHALL use no network request or render-time clock to draw the captured frame.

#### Scenario: Capture a seeked frame
- **GIVEN** a scaffolded project
- **WHEN** `composition capture --composition <dir>/index.html --seek 1` runs twice and `--seek 2` once
- **THEN** both 1 s images are pixel-identical, the 2 s image differs, and the glyphs are drawn in the default preset's ink on its ground

#### Scenario: Capture another preset without editing code
- **GIVEN** the scaffolded directory served on the local machine
- **WHEN** `composition capture --url <local>/index.html?preset=night-coast --seek 2` runs
- **THEN** the image shows the scene's own palette colours on its ground

#### Scenario: Fail instead of capturing an empty page
- **GIVEN** a page that cannot draw, such as an unknown preset or a missing player file
- **WHEN** `composition capture --seek` runs
- **THEN** the capture exits with the page's error and writes no screenshot

### Requirement: ASCII art live preview honours reduced motion

The page SHALL run its looping live preview only for live viewing, SHALL hold the first frame when
the viewer prefers reduced motion until the viewer chooses to play, and SHALL stop the preview when
a capture hook draws a frame.

#### Scenario: Reduced motion is preferred
- **GIVEN** `prefers-reduced-motion: reduce`
- **WHEN** the page opens and time passes
- **THEN** no frame advances on its own and the play control offers to play anyway

#### Scenario: Live viewing then capture
- **GIVEN** no reduced-motion preference
- **WHEN** the page opens, plays, and then `renderStudy` is called
- **THEN** the preview advances while playing, and the call stops it and draws exactly the requested time
