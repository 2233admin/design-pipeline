# Design

Pixels: a dependency-free PNG decoder (non-interlaced 8/16-bit gray, RGB, palette, gray-alpha,
RGBA; byte-identical to the ffmpeg RGBA decode of a HyperFrames frame). The frame is box-averaged
to a 240-wide grid; the background is the dominant quantized border color; ink is any cell
farther than 28 RGB units from it. Metrics: ink share, full-bleed detection, weight center (ink
weighted by distance), luminance spread from full-resolution 0.1/99.9 percentiles (thin text must
count), subject separation (mean ink color against background, WCAG ratio), third-band occupancy,
outer-margin ink, saturated hue groups (15 degree bins, adjacent bins merged), connected masses
and the two largest shares.

Elements: `composition capture` extracts visible text runs with box, font size and weight, text
color and effective opaque background (unknown behind gradients or images, where contrast is
skipped), plus leaf and painted block boxes. Checks: WCAG contrast, off-canvas text, near-miss
edges (1.5-6 px, like kinds only, vertically separated), hierarchy on same-line runs, and
type-scale sprawl.

Severity: errors fail (`blank-frame`, `low-contrast`, `text-contrast`, `text-off-canvas`); all
other findings warn and can be allowed per run with a recorded reason. Profiles ui, poster and
frame set clutter limits and whether edges are checked. Result shape follows the film gates:
findings with `fix`, metrics, `creativeAcceptance: not-assessed`.

Calibration evidence (manual): a designed hero page passed with no findings; a planted-defect
page raised every planted defect (four contrast errors, off-canvas text, six-hue sprawl, near-miss
edges, flat hierarchy, off-balance, no focal point); the demo film frames raised weak-separation,
off-balance, dead-band and no-focal-point, matching visual review. Calibration removed three noisy
signals: 5/95 percentile contrast (missed thin text), text-versus-container near misses, and
same-line spans counted as separate hierarchy levels.

Reuse: browser resolution from the film capture core; `film check` runs the gate on each beat's
contact-sheet frame. Not yet part of `film-eval` scoring.
