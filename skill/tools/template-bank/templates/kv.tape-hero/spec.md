# kv.tape-hero

First screen: a composited street scene with an original character, the brand sticker, the tilted download sticker and a platform line. Its layer contract renders the scene at 1920 x 1080, 1080 x 1920 and 920 x 430 from one set of layers.

Style: `street-tape` (`styles/street-tape/style.json`). The key visual of a street-tape game site and its store sizes.

## Layers

The scene and the character are layers, not drawn shapes. `manifest.json` `layers` declares the stack in paint order (bg, ghost type, mid plates, the cassette and REWIND sprites behind the figure, the character, the REC and star fx, the boombox occluder, paper and halftone texture, then the live type), the frame, plate crop and sprite boxes of every size, the character's foot point and height per size (the 920 x 430 size lets the legs break the bottom edge), the type boxes, and the light: key from the upper left, rim from the right in the palette's acid, cast shadow to the lower right.

1. `materials request --template kv.tape-hero` writes the character's generation task sheet.
2. The owner runs it in an image model and records the result with `materials add --kind generated --tool <tool> --prompt materials/requests/<name>.md --landmarks ...`, then cuts it (`materials cut --mode grabcut` for a plain backdrop, `--mode none` is not a matte).
3. `materials composite --template kv.tape-hero --set bg=... --set char=<piece> ...` writes `<WxH>-ground.png` (scene and shadows: the text ground) and `<WxH>-upper.png` (character, outline, fx, occluder) for every size, with the measurements in `composite.json`.
4. `template render kv.tape-hero --set scene=<1920x1080-ground.png> --set figure=<1920x1080-upper.png>` sets the type over them; the browser check samples the ground for contrast and does not count it as collage.

Without layers the slots show the frame and the character slot as hatched placeholders.

## Where it comes from

The replay-ward case's first screen, rebuilt as layers in the #311 compositing prototype with a CC0 stand-in figure (Cleveland Museum of Art 1972.368.6). Borrow grammar, never assets: every name and picture is the case's own.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `scene` | image (layer ground) | - | - |  |
| `figure` | image (layer char) | - | - |  |
| `brand_cjk` | text | 5 | head | 回放街区 |
| `brand_latin` | text | 12 | num | REPLAY WARD |
| `cta` | text | 4 | head | 立即下载 |
| `flash` | text | 3 | head | 公测中 |
| `platforms` | text | 30 | body | PC 启动器下载（Windows 10 64 位及以上） |
