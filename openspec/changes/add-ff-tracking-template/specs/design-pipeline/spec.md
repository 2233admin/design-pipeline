## ADDED Requirements

### Requirement: Tracking HUD film reference has locked provenance

The packaged skill SHALL carry the complete reviewed ff-tracking Git tree with original bytes, inventory, hashes and MIT and font notices, registered with the existing film source importer and checks. Import SHALL reject an unreviewed revision or altered checkout and keep the previous snapshot. The vendored tree SHALL stay reference and provenance; it is never edited, built or run by the skill.

#### Scenario: The template travels with an isolated installation

- **WHEN** the package is installed without an ambient ff-tracking checkout
- **THEN** every reviewed tracked blob SHALL be readable locally and match its locked identity
- **AND** the manifest SHALL record the upstream repository, commit, license and render boundary.

#### Scenario: Arbitrary template refresh is refused

- **WHEN** an import uses an unreviewed commit, a modified checkout or an invalid review date
- **THEN** it SHALL fail without replacing the previous snapshot.

### Requirement: Tracking HUD films are built with the HyperFrames template

The film build guidance SHALL route a terminal or agent-screen tracking HUD film to `film scaffold --template tracking-hud`. The scaffold SHALL write a HyperFrames project whose one config drives the typed script, palettes, shots, camera and timing, and whose storyboard, composition and sound are rebuilt from that config. The film SHALL be rendered by HyperFrames and judged by the existing film stages, with no new gate or receipt.

#### Scenario: An agent-terminal tracking film is requested

- **WHEN** a film task asks for a camera filming an agent's terminal while a tracker locks onto typed glyphs
- **THEN** the agent SHALL scaffold the template, edit its config, rebuild, master the sound with `audio master` and render with HyperFrames
- **AND** the rendered video SHALL pass through `film check`, frame review and `decide`, reporting Component Conformance and Visual Acceptance separately.

#### Scenario: The upstream toolchain is not used

- **WHEN** the task uses the template
- **THEN** the agent SHALL NOT build or run the vendored Rust, fframes or Python pipeline and SHALL NOT install Rust, LLVM, FFmpeg development builds or Python packages for it.

#### Scenario: An unknown scaffold template is refused

- **WHEN** `film scaffold` receives a template other than `default`, `motion-study` or `tracking-hud`
- **THEN** it SHALL fail with the allowed values and write nothing.

#### Scenario: An ordinary film or interface task is selected

- **WHEN** the task is not a terminal or agent-screen tracking film
- **THEN** the template SHALL NOT replace the existing HyperFrames film route or interface workflow.

### Requirement: Tracker picture and sound share one camera and event source

The template's tracks module SHALL be the only source of shot timing, typed glyph cells, tracker boxes, lock events and per-frame camera. The flat pass, lens uniforms, overlay, storyboard and sound SHALL read it. Tracker labels SHALL state the real projected output pixel of their box, computed with the lens camera, and a config whose targets leave the frame or whose lines leave the screen SHALL be refused.

#### Scenario: A label is checked against the filmed glyph

- **WHEN** the self-test films a target glyph through the full lens with and without that glyph
- **THEN** the measured glyph centre SHALL lie within the declared pixel tolerance of the labelled projection
- **AND** a larger error SHALL fail the self-test, and no label alignment SHALL be claimed for the film.

#### Scenario: A config breaks the camera or screen invariants

- **WHEN** an edited config puts a tracked target outside the safe frame area or a typed line past the screen edge
- **THEN** the build SHALL fail with the shot and frame and write no storyboard, composition or sound.

#### Scenario: The port is compared with the reference

- **WHEN** the default config is evaluated
- **THEN** its focus, camera and projected focus for every frame SHALL match the vendored reference fixtures within their print precision and the declared single-precision error.

### Requirement: Tracking HUD builds refuse content that breaks the film

The template build SHALL refuse, writing nothing and naming the shot or frame, the value and the limit, a config whose typed line leaves the screen area, whose lock ping lies within 0.1 s of a cut, whose palette text stop is below 3:1 on its background, whose Done label overflows its pill, whose last frame does not show its whole subject, or that draws a character the vendored font lacks.

#### Scenario: New text uses glyphs JetBrains Mono does not have

- **WHEN** a typed line, the title, a log line or the Done label contains a character outside the vendored font, or one that is not one 0.6 em cell wide
- **THEN** the build SHALL fail with the character, its code point and the font, and SHALL NOT write a storyboard, composition or sound.

#### Scenario: A shot names the word it locks on

- **WHEN** `shots[].lock` is not part of the typed line, or the locked word or its LOCK label is cut by the frame or covered by another label on every lock frame
- **THEN** the config SHALL be refused; a lock taken implicitly from the last word that does not read SHALL only be reported as a warning.

#### Scenario: A palette or final shot would render blank

- **WHEN** a used palette's text stop is below 3:1 against its background stop, or the last frame cuts into the Done pill or target box
- **THEN** the build SHALL refuse the config before any render, independently of the composition gate.

### Requirement: Tracking HUD renders are claimed only when deterministic

A tracking HUD render SHALL be claimed only after the self-test renders sampled frames twice, in one page after reordered seeks and in a second browser process, and finds identical pixels. The WebGL renderer used SHALL be recorded. A missing WebGL2 context SHALL stop each frame with a named error, drawing only an error card, never a substitute picture.

#### Scenario: A frame differs between renders

- **WHEN** a sampled frame hashes differently across seeks or processes
- **THEN** the self-test SHALL fail and the agent SHALL NOT claim a deterministic render or deliver it as verified.

#### Scenario: WebGL2 is unavailable

- **WHEN** the browser cannot create a WebGL2 context
- **THEN** the composition SHALL report the missing context by name, the agent SHALL report it as a blocker, and no film SHALL be claimed.

### Requirement: Film render samples stay inside the video

The film render evidence SHALL sample beat midpoints and procedural-beat samples no later than the start of the video's last frame, so a short final beat yields a sampled frame instead of a missing evidence file.

#### Scenario: A short final procedural beat is sampled

- **WHEN** a procedural beat's 95% sample falls after the start of the last frame
- **THEN** the render gate SHALL sample the last frame and `film check` SHALL complete with its gate results instead of failing on a missing frame.

### Requirement: Planned hard cuts are found regardless of brightness

The render gate SHALL count a planned hard or match cut that the scene threshold and the one-step pixel detector miss when, within one frame of the boundary, a frame shares less than half its structure with the frame before (r² < 0.5) and the step before is at least four times calmer. It SHALL NOT count a dissolve or a camera that ramps into the boundary.

#### Scenario: A cut between two dark, grainy, moving shots is planned

- **WHEN** the scene score at the boundary stays under 0.3 and grain keeps every 10 fps pixel step busy
- **THEN** the render gate SHALL report the cut in `cuts.structureCutsSec` and SHALL NOT count it as missed.

#### Scenario: A planned cut renders as a dissolve or a whip

- **WHEN** the change at a planned boundary builds up over several frames, as in a 0.3 s dissolve or a camera that accelerates into a match cut
- **THEN** the cut SHALL stay missed and `planned-cuts-missing` SHALL apply as before.
