## ADDED Requirements

### Requirement: ASCII art composition template is scaffolded self-contained

`composition scaffold --template ascii-art --output <new-dir>` SHALL create, in a new directory of
the project, a page, its player, a preset table, the exact text of each vendored ascii.rest piece
module, the bundled monospace font and the MIT and font notices, without network access, package
installation or workflow state.

#### Scenario: Scaffold an offline project
- **GIVEN** an installed or source skill and a project directory
- **WHEN** `composition scaffold --template ascii-art --output ascii` runs for that project
- **THEN** the directory holds `index.html`, `ascii-art.js`, `presets.js`, `pieces.js`, `font.js`, `LICENSE.ascii-rest` and `LICENSE.font`, each piece's text hashes to the vendor manifest, and the page opened from disk draws its default preset without any request leaving the directory

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

The page SHALL draw a preset's frame for an explicit time and SHALL show the same frame, text and
colours, for the same time after cold, repeated and reordered seeks, including pieces whose output
depends on earlier calls.

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

### Requirement: ASCII art glyphs are coloured by default

The page SHALL draw every preset by default in coloured glyphs, one colour a cell on a canvas cell
grid: a piece with a palette in the colours it writes to `env.color`, and a text piece in the
colours its preset's paint rules give each drawn cell from the cell's glyph, row or column.

#### Scenario: Draw a text preset in colour
- **GIVEN** a shipped text preset such as doom fire, opened without `?mono`
- **WHEN** a frame mid-way through its duration is drawn
- **THEN** it is drawn on the canvas and its drawn cells carry at least three of its palette colours, each on at least 2% of them, and no drawn glyph falls back to the ink

#### Scenario: Draw a scene in its own palette
- **GIVEN** the aurora fjord, night coast or ocean sunset preset
- **WHEN** a frame is drawn
- **THEN** each cell takes the palette colour the piece wrote for it

### Requirement: ASCII art one ink is an explicit option

The page SHALL draw a text preset as the same text in a `<pre>` in the preset's one ink when its
row says `mono: true` or the page URL carries `?mono`, and SHALL refuse a text preset with neither
paint nor mono, paint on a piece with a palette, and mono for a piece with a palette.

#### Scenario: Ask for one ink
- **GIVEN** a text preset opened with `?mono`, or a row with `mono: true`
- **WHEN** a frame is drawn
- **THEN** it is the same text as in colour, drawn as one text node in a `<pre>` in the preset's ink

#### Scenario: Refuse a colour that cannot be drawn
- **GIVEN** a text preset with neither paint nor mono, a malformed paint rule, paint on a scene, or `?mono` for a scene
- **WHEN** the page loads it
- **THEN** it shows the error on the page and the capture hooks throw instead of drawing a frame

### Requirement: ASCII art glyphs sit on an exact cell grid

The page SHALL draw every preset in the monospace font bundled with the scaffold, which SHALL cover
every character the vendored pieces contain at one cell's width, so every row of a preset drawn
mono is exactly the preset's columns wide whatever fonts the host has and every glyph drawn in
colour sits in a whole-pixel canvas cell, and SHALL refuse to draw when that font is missing or
does not load.

#### Scenario: A host font lacks box-drawing glyphs
- **GIVEN** a host whose monospace font lacks some block or box-drawing characters the pieces draw
- **WHEN** each preset is drawn in colour, and each text preset mono, at several times
- **THEN** each is drawn with its mode's renderer, every row of a mono preset measures its columns times the cell width, and a coloured preset's canvas is a whole number of device pixels per cell

#### Scenario: The font file is missing
- **GIVEN** a scaffolded copy without `font.js`
- **WHEN** the page opens
- **THEN** it shows the error and the capture hooks throw instead of drawing in a host font

### Requirement: ASCII art page exposes the composition capture contract

The page SHALL implement `window.renderStudy(progress)` and register a `window.__timelines` seek
hook that `composition capture --seek` drives, SHALL stop live playback and hide its controls when
either is called, and SHALL use no network request or render-time clock to draw the captured frame.

#### Scenario: Capture a seeked frame
- **GIVEN** a scaffolded project, whose page names the `aurora-fjord` scene as its `data-preset` default
- **WHEN** `composition capture --composition <dir>/index.html --seek 1` runs twice and `--seek 2` once
- **THEN** both 1 s images are pixel-identical, the 2 s image differs, and the cells are drawn in at least eight of the scene's own palette colours on its ground

#### Scenario: Capture another preset or one ink without editing code
- **GIVEN** the scaffolded directory served on the local machine
- **WHEN** `composition capture --url <local>/index.html?preset=night-coast --seek 2` runs, and `--url <local>/index.html?preset=donut&mono --seek 1`
- **THEN** the first image shows the scene's own palette colours on its ground, and the second the donut in its ink and none of its paint colours

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
