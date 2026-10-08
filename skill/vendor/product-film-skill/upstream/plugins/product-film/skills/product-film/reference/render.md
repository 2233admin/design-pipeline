# Final render, verification and delivery

## Pipeline (`scripts/render.ts`)

1. **Master.** 240 fps, PNG frames, H.264 at CRF 8, `yuv444p`, muted: `--props '{"fps":240}' --image-format png --pixel-format yuv444p --crf 8 --muted`.
2. **Audio.** Once, at 60 fps: `--codec wav`.
3. **Motion blur.** ffmpeg `tmix=frames=4` averages each group of 4 subframes, and `select='not(mod(n+1\,4))'` keeps one, giving 60 fps. Convert color once: `scale=in_range=tv:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709`, then ProRes 4444 as the intermediate.
4. **Deliverables.**
   - a muted H.264 loop for the landing page (CRF 20, `yuv420p`, BT.709 tags, `+faststart`)
   - the same with music (AAC 256k)
   - a VP9 WebM
   - `poster.jpg` from the headline (not frame 0, which is empty)
   - a loop-seam sheet (the last 8 and first 8 frames, played twice)
5. Delete the master and the intermediate. Print the file sizes.

A full-frame render at 240 fps takes about 10 minutes for 50 s on a laptop. Run it in the background and review other things meanwhile.

## Verify before sending (`scripts/verify.py`)

```bash
uv run --with numpy --with imageio-ffmpeg python3 scripts/verify.py out/<film> --duration 52.8 --bg 10,10,10 --probe 9.4:944,800
```

It checks, for every deliverable:
- the duration
- decoded frame 0 at the center: expect the background ±2 (#0a0a0a comes back as 9 or 10)
- the last frame against frame 0: only encoder noise (a few hundred pixels off by a few values)
- optional probes (time:x,y) to check an accent color or a surface

If the background comes back lighter (#171717 for #0a0a0a), the color range was read wrong. Fix the `scale` filter above; never "fix" the tokens.

## Deliver

- Keep each version: `cp` the deliverables into `out/<film>/vN/` before the next render.
- Send the files (with music for review, the muted loop for the page, WebM, poster) with a two-line caption of what changed.
- Report: durations, sizes, the checks you ran.
- Do not commit or publish unless asked.
