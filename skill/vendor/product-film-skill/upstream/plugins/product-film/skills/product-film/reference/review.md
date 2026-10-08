# Review loop: look at frames, fix, repeat

Stills are cheap; renders are not. Review in this order.

## 1. Stills at the moments that matter

```bash
bun scripts/stills.ts out/review/vN 250 700 962 1130 --composition MyFilm
bun scripts/stills.ts out/review/vN-debug 1812 1860 --composition MyFilm --debug
```

- Frame numbers are at 60 fps: frame = seconds × 60, and seconds = bar and beat on the grid.
- Look at full resolution for anything with small text. Stack several frames into one sheet to save tokens:

```bash
F=$(uv run --quiet --with imageio-ffmpeg python3 -c "import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())")
$F -v error -y -i a.png -i b.png -i c.png -i d.png -filter_complex \
  "[0:v]scale=960:540[a];[1:v]scale=960:540[b];[2:v]scale=960:540[c];[3:v]scale=960:540[d];[a][b][c][d]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0" sheet.png
```

## 2. A half-res draft, a contact sheet and a handoff sheet

```bash
npx remotion render src/index.ts MyFilm out/review/draft.mp4 --scale=0.5 --codec=h264 --crf=24 --concurrency=6 --log=error
$F -v error -y -i out/review/draft.mp4 -vf "select='not(mod(n\,24))',scale=240:135,tile=9x15:padding=4:color=0x333333" -frames:v 1 -vsync vfr contact.png
```

For the handoff sheet, select 8 frames every 0.1 s around each handoff (`eq(n\,N)+eq(n\,M)...`, one tile row each). If two windows overlap, `select` emits each frame only once and the rows shift. Keep the windows apart.

## 3. The checklist, every round

- **Background:** one color. No invented shades. Surfaces only where the product has them.
- **Borders:** none around floating elements. Lines only where they mean something.
- **Text:**
  - above everything, readable at 1080p, never off frame
  - never covered by a cursor or chip
  - never crossing other text in a move
  - never re-centering while it builds
- **Words:** fewer. Anything that restates the picture goes. Brand names have their logos.
- **Loading states:** buttons keep their width.
- **Textures:** calm behind UI, thinned behind words.
- **Pacing:** something happens on every beat. No dead bar. Nothing too fast to read.
- **Handoffs:** each lands exactly on its destination (debug-measured).
- **Brand element (if any):** on brand, alive from the first second, nothing showing through its cut-outs.
- **Loop:** the last frame equals frame 0 (decode and compare).
- **Claims:** only what the product does. Human approval where the product requires it.

## 4. Show the product owner

Send frames or a draft as soon as a round is coherent. Their notes come fast and precise ("remove the borders", "same background", "it's slow here"). Fold every note into BRAND.md or the prompt, so the next film starts from it.
