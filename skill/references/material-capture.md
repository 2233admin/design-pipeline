# Capturing material yourself

Public-domain sources run out quickly (see [material sources](../tools/design-sources.md#public-domain-collage-materials)):
objects, papers and screens you own are often the better material. This is the owner's route:
photograph or scan, register with `materials add`, then cut, process or calibrate. Every file stays
in `materials/licenses.json` with who made it and under which licence.

## Objects (phone photos for cut-outs)

| Step | Do | Why |
| --- | --- | --- |
| Backdrop | A plain matte card that differs from the object in tone: mid-grey for pale or metal objects, white for dark ones. Fill the frame edge with it. | `materials cut --mode border` takes the border colour as the reference; a busy or tonally similar edge breaks it. |
| Light | Diffuse light from two sides at about 45° (window light on an overcast day, or two lamps through baking paper); light the backdrop separately or lift the object on clear glass 10-20 cm above it. | Kills the cast shadow that `matte-cast-shadow` warns about and the gradient that `matte-uneven-background` warns about. |
| Camera | Longest lens that still frames the object (2x/3x on a phone), 1-1.5 m away, square to the object; exposure locked on the object; no portrait/beauty mode, no HDR. | Less perspective distortion; computational modes paint halos the matte keeps. |
| White balance | Put a grey card in one test frame and correct to it, or shoot RAW. | The object's colour is the material; a blue cast shows up in every collage. |
| Export | Full resolution PNG (convert HEIC/RAW with ffmpeg or your editor). Long side 2000-4000 px is plenty for a 1920 px canvas. | Cutting reads PNG; more pixels only cost time. |

Register and cut:

```sh
designer-pipeline materials add --project-root . --file materials/owner/brass-key.png --license owner-photo --by "<your name>" --kind photo --use "collage: key"
designer-pipeline materials cut --project-root . --file materials/owner/brass-key.png --mode border --finish cut,sticker
```

`commercialUse` stays false for a licence that is not CC0 / public domain unless you pass
`--commercial-use`; pass it for your own photos of objects you may show.

## Paper, ink flats and screentone (scans for calibration)

A flatbed scanner gives a known scale, which a phone does not: `pxPerMm = dpi / 25.4`
(300 dpi = 11.81, 600 dpi = 23.62, 1200 dpi = 47.24).

| Material | Resolution | Settings | Region to measure |
| --- | --- | --- | --- |
| Paper (blank sheet, book margin, envelope) | 600 dpi (300 is the minimum: bands finer than 0.25 mm need at least 2.5 px per period) | 24-bit colour; switch off auto colour, auto levels, sharpening, dust removal and descreen; 100% scale, no rotation | A blank area at least 30 x 30 mm (two halves are compared, so 60 x 30 mm is better) |
| Ink flat (woodblock, litho, screen print, risograph) | 600 dpi | as above | A flat area of one ink without lines or letters |
| Screentone or halftone print | 1200 dpi, so one screen period spans at least 4 px (a 150 lpi screen is 8 px at 1200 dpi) | as above, and **descreen off**: it removes exactly the dots being measured | A flat tone area, not a gradient or a face |

A scanner lamp lights from one side, so paper tooth reads stronger across the lamp than along
it: scan once, rotate the sheet 90° and scan again, and keep both if the texture is directional
(laid paper). Moiré in the scanner preview usually comes from the preview's own resampling; check
the saved file at 100%. If a screen still beats against the scan grid there, scan at a higher
optical resolution rather than switching descreen on. Do not downscale before measuring.

Register the scan, then turn it into a calibration profile:

```sh
designer-pipeline materials add --project-root . --file materials/scans/ingres-paper-600dpi.png --license owner-scan --by "<your name>" --kind scan
designer-pipeline materials measure --project-root . --file materials/scans/ingres-paper-600dpi.png --kind paper \
  --params '{"pxPerMm":23.62,"roi":[0.1,0.1,0.9,0.5]}' --name ingres-paper
```

The roi is split into two halves: one is the fit, the other is held out, and their distance is
the sheet's natural variation (`materials/calibration/<name>.json`). Generate from it and see how
close the result lands:

```sh
designer-pipeline materials generate --project-root . --generator paper --params '{"profile":"ingres-paper","pxPerMm":4}' --seed 1
designer-pipeline materials measure --project-root . --file materials/generated/paper-ingres-paper-s1.png
```

`within-natural-variation` means the generated texture is as close to the held-out half as the
two halves of the real sheet are to each other on these statistics (octave-band spectrum of L*,
lightness quantiles); `within-real-range` means closer than two different real papers in the
built-in set; `unlike-reference` exits 2. None of these is visual acceptance. Spectrum and
histogram do not carry phase structure: single hairs, wood-grain lines and chain lines are not
reproduced by the synthesis even when the numbers match, so look at the result at 100%.

Changing a project profile later makes every file generated or processed from it (including a halftone or papercut printed on that paper) stale in `materials check`
until it is regenerated with `--replace`.
