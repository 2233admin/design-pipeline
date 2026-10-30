## Why

Films and motion loops are a main deliverable, and `verify film-render` passes them without any
photosensitivity check. A render can strobe, flash a full-frame white cut on a beat, or flicker saturated
red and still exit 0. WCAG 2.3.1 and ITU-R BT.1702 define a measurable limit (no more than three
general or red flashes in any one second above an area threshold). It is the only safety limit in the
pipeline's output that no gate measures, so a green film gate today claims more than it checked.

## What Changes

- `verify film-render` measures general flashes and red flashes on every decoded frame of the render, at its
  native frame rate, and fails with `photosensitive-flash` when any one-second window holds
  more than three flashes of either kind above the area threshold.
- The finding lists each failing window with its start time, flash count, kind and the largest flashing
  area, and the render report gains a `photosensitivity` section with the method, thresholds and the
  worst window even when it passes.
- The method follows the WCAG 2.3.1 definitions and the WCAG 2.2 working definition of red flash
  (relative-luminance pairs of opposing changes, 10 % of maximum luminance, darker state below 0.80; saturated red
  with a CIE 1976 UCS chromaticity difference above 0.2) and the 25 %-of-10°-field area
  approximated as 341×256 px at 1024×768, scaled to the render size. Implemented in this repository from the
  public definitions; no analyzer is vendored or required.
- The report states that this is an automated approximation and not a certified Harding/PEAT result.

## Capabilities

- `design-pipeline`: ADDED `Film render is checked for photosensitive flashes`.

## Reuse

- `evaluateFilmRender`, its `findings`/`withFix` shape, exit codes and evidence directory.
- The existing FFmpeg decode path in `film-core.cjs` (`run`, `probe`).

## Impact

- New findings in the existing render report; storyboards are unchanged. A film that flashes now fails.
