# Video / render color management (After Effects)

How to diagnose and prevent the most common After Effects color complaint: a render that looks correct inside the AE composition viewer but appears washed-out, too bright, milky, or gamma-shifted when played in QuickTime Player, uploaded to a browser, or moved between macOS and Windows. The root cause is almost always a mismatch in how gamma / transfer functions are interpreted across AE, the codec metadata, the OS player, and the display pipeline — not a problem with the artwork.

## Mental model: where shifts come from

A pixel value travels through four stages, each of which can apply or assume a gamma. A shift is a mismatch between two of them:

1. **AE project working space** — the math AE uses internally (linear vs a tagged display space). Set in File > Project Settings > Color tab.
2. **The render's embedded tag** — what transfer/primaries metadata the codec writes (or omits) into the file.
3. **The player's interpretation** — QuickTime, Chrome, VLC, and Windows Media each guess differently when the tag is missing or when they apply ColorSync.
4. **The display + OS gamma** — macOS historically assumed ~1.8, now ~2.2/2.4-ish via ColorSync; the long-standing "QuickTime gamma bug" comes from QuickTime/AVFoundation applying an extra gamma curve (~1.96) that Chrome and most editors do not.

Key fact: most web video is **Rec.709**, whose camera/encode side is roughly gamma 2.2-ish but whose *standard display* gamma is **2.4** (BT.1886). macOS QuickTime effectively renders nearer **1.96**, which is why a file can look fine in QuickTime but slightly dark/contrasty in a browser, or vice-versa. The fix is never "eyeball it in QuickTime" — QuickTime is the least trustworthy reference.

## Decision tree: which problem is this?

```
Render looks DIFFERENT from comp preview?
├─ Looks washed-out / milky / brighter, low contrast
│  └─ Almost always: untagged or mistagged H.264/ProRes +
│     player applying its own gamma (QuickTime gamma bug).
│     → Use ProRes for masters; tag Rec.709; verify in
│       Chrome, NOT QuickTime.
├─ Looks fine in QuickTime, WRONG (dark/contrasty) in Chrome
│  └─ QuickTime is applying ~1.96 gamma; Chrome honors the
│     2.4/sRGB pipeline. The browser is the correct reference
│     for web delivery.
├─ Looks fine on macOS, wrong on Windows (or reverse)
│  └─ Missing color tag → each OS assumes a default. Embed an
│     explicit Rec.709 (or sRGB) tag on export.
└─ Banding / posterization in gradients
   └─ 8-bit project on heavy grades. Set Project > Depth to
      16 bpc and/or enable Linearize Working Space.
```

## Project Color Settings (exact menu paths)

Open **File > Project Settings… > Color** tab.

- **Depth**: set to **16 bits per channel** for grades/gradients (8 bpc is fine for simple cuts; 32 bpc float only for HDR/heavy linear comps).
- **Working Space**: For standard web/SDR delivery choose **Rec.709 Gamma 2.4** (or **sRGB IEC61966-2.1** if the deliverable is screenshots/UI). Setting any working space (not "None") turns AE color management ON, so the viewer now shows display-referred color consistently.
- **Linearize Working Space** / **Blend Colors Using 1.0 Gamma**: enable when doing glows, blurs, and additive composites so blending math is physically correct. This changes the look of feathered edges and screen blends — enable it early, not at the end.
- **Compensate for Scene-referred Profiles**: leave default unless mixing log/cineon footage.

To preview what a viewer/OS will actually see, use the composition viewer's **bottom toolbar > "Use Display Color Management"** toggle, and the eyedropper/Info panel to read numeric RGB values rather than trusting the on-screen brightness.

## Export settings per platform

Prefer the **Render Queue** (Composition > Add to Render Queue) for ProRes masters, or **File > Export > Add to Adobe Media Encoder Queue** for H.264 web files.

| Target | Codec / format | Color tag to embed | Notes |
|---|---|---|---|
| Editing master (FCP/Premiere/Resolve) | **ProRes 422 HQ / 4444** (QuickTime) | Rec.709 | Highest fidelity; avoids H.264 gamma guessing |
| Web / `<video>` / social | **H.264** (MP4) via Media Encoder | **Rec.709**, tagged | Set Match Source then override profile; verify in Chrome |
| YouTube / Vimeo upload | H.264 high bitrate or ProRes | Rec.709 | Platforms re-encode; correct tag prevents their guess |
| Transparency for web | **PNG / ProRes 4444 + alpha** then convert | sRGB | Browsers treat PNG as sRGB |
| HDR | ProRes 4444 / HEVC 10-bit | Rec.2020 PQ/HLG | Requires 32 bpc float project |

In **Adobe Media Encoder**, the QuickTime/ProRes color tag is governed by the AE **Output Module > Color Management** sub-tab. In the Render Queue, click the **Output Module** name > **Color Management** tab and set the output profile to **Rec.709 Gamma 2.4** (do not leave "Preserve RGB" if a shift is occurring).

## The QuickTime gamma bug — workarounds

QuickTime Player and any AVFoundation-based player can apply an extra ~1.96 gamma to ProRes/H.264, making files look darker/contrastier than they do in Chrome, Premiere, or Resolve. It is a *player* problem, not a render problem.

1. **Never grade or approve to QuickTime.** Use Chrome, Premiere, or Resolve as the reference, since those match how the web and other editors display the file.
2. For ProRes masters that must look right in QuickTime too, **embed the Rec.709 (Gamma 2.4) tag** via Output Module > Color Management. Correctly tagged ProRes is interpreted consistently by modern macOS.
3. If a legacy pipeline still shifts, render a **second 1:1 reference still** (Composition > Save Frame As > File) as PNG and compare numeric values — pixels, not perception.
4. Avoid the old "nudge gamma by 1.08 to cancel QuickTime" hacks for new work; they bake a wrong curve that breaks on every correct player. Only use a compensating curve if delivering *exclusively* to a known-broken legacy QuickTime target.

## Per-player / per-OS gamma reference

| Environment | Effective transfer assumption | Notes |
|---|---|---|
| Rec.709 standard display (BT.1886) | **2.4** | The correct broadcast/web display gamma |
| sRGB display | **~2.2** (piecewise) | UI, screenshots, PNG |
| macOS QuickTime / AVFoundation | **~1.96** | Source of the "QuickTime gamma bug"; brighter/contrast-shifted vs browser |
| Chrome / Firefox `<video>` | honors 2.4 / sRGB pipeline | Correct reference for web delivery |
| macOS classic (pre-10.6) | 1.8 | Legacy only; ignore for new work |
| Windows default | 2.2 | Assumed when file is untagged |

Takeaway: the *only* reliable cross-environment guarantee is an **explicit embedded tag**. Without it, every player above falls back to its own default and they disagree.

## Numeric test-patch method (perception-free)

Eyes adapt; numbers do not. To prove whether a shift exists:

1. In the comp, add a Solid (Layer > New > Solid) filled with **50% grey: RGB 128,128,128** (or 188,188,188 for a known mid-light patch).
2. Note the value AE reports in the **Info panel** when hovering with managed display on.
3. Render the file with the intended export settings.
4. Re-import the rendered file into a fresh comp (or open in an app with a pixel readout) and sample the same patch.
5. If the sampled value differs from 128 by more than ~2-3 levels, a gamma transform is being applied somewhere in the chain. A washed-out look corresponds to the value rising (e.g. 128 → 150+).

This isolates whether the shift is in the *render* (values changed in the file) vs the *playback* (file values correct, player re-curving).

## Verify the embedded tag with ffprobe

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=color_transfer,color_primaries,color_space,color_range \
  -of default=nk=0 export.mp4
```

Desired for SDR web (Rec.709):

```
color_space=bt709
color_primaries=bt709
color_transfer=bt709
color_range=tv          # (limited) for video; pc/full for some web pipelines
```

If `color_transfer=unknown` or fields are absent, the file is untagged → re-export with the tag, or stamp it without re-encoding:

```bash
ffmpeg -i export.mp4 -c copy \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  export_tagged.mp4
```

Note: `-c copy` only writes container/stream metadata; it does not fix pixels that were already baked wrong — use it to *tag*, not to *correct*.

## Limited vs full range pitfall

H.264 for video is typically **limited/TV range** (luma 16-235). If AE/AME outputs full-range pixels but the file is tagged limited (or vice versa), blacks crush or wash. Symptoms: milky blacks = full data read as limited; crushed blacks = limited data read as full. Keep range consistent end-to-end and tag it (`color_range`).

## Quick reference

| Symptom | Likely cause | Fix |
|---|---|---|
| Washed-out / milky blacks | Untagged H.264, player adds gamma | Tag Rec.709 in Output Module > Color Management |
| Fine in QuickTime, dark in Chrome | QuickTime ~1.96 gamma | Trust Chrome; QuickTime is wrong for web |
| Differs macOS vs Windows | No embedded color tag | Embed explicit Rec.709/sRGB tag |
| Banding in gradients | 8 bpc project | Project Settings > Depth = 16 bpc |
| Glows/blurs look wrong | Non-linear blending | Enable Linearize Working Space |
| Screenshots/UI look off | Wrong working space | Use sRGB working space, not Rec.709 |

## Gotchas

- "Working Space = None" disables AE color management entirely — the viewer then lies about the final look. Always set an explicit space for managed delivery.
- Toggling Linearize Working Space late changes the look of every feather, glow, and screen blend; decide at project start.
- AME "Match Source" can silently drop the color tag; verify the exported file's tag (e.g. with `ffprobe -show_streams`, look for `color_transfer`/`color_primaries`).
- ProRes is not magic — an untagged ProRes still shifts. The *tag* is what fixes consistency, not the codec.
- sRGB and Rec.709 share primaries but differ in transfer (sRGB ~2.2 piecewise vs Rec.709 display 2.4); using the wrong one shifts midtone brightness.

## Pre-export checklist

- [ ] Project Settings > Color: Working Space set to the deliverable's space (Rec.709 Gamma 2.4 for SDR video; sRGB for UI/stills).
- [ ] Project Settings > Color: Depth = 16 bpc (or 32 for HDR/heavy linear).
- [ ] Linearize Working Space decision made at project start (on for glow/blur-heavy comps).
- [ ] Display Color Management toggle ON while reviewing, so the viewer reflects final look.
- [ ] 50% grey test patch placed and noted before render.
- [ ] Output Module > Color Management: explicit output profile = Rec.709 Gamma 2.4 (not "Preserve RGB" when a shift exists).
- [ ] Codec chosen per target (ProRes 422 HQ/4444 master, H.264 web).
- [ ] Reviewed final in **Chrome / Premiere / Resolve**, not QuickTime.
- [ ] `ffprobe` confirms color_primaries/transfer/space = bt709 (or sRGB target) and color_range consistent.
- [ ] Re-imported render and re-sampled the grey patch; value matches within ~2-3 levels.

## When the client only has QuickTime

If the approval environment is genuinely locked to macOS QuickTime and the file must look right *there*:

1. Deliver correctly tagged ProRes (modern macOS QuickTime respects Rec.709 tags fairly well).
2. If a residual shift remains and cannot be avoided, produce a *separate* QuickTime-targeted file with a measured compensating gamma adjustment — and clearly label it "QuickTime-only; do not use for web." Never let this compensated file become the web master.
3. Educate: provide the same file opened in Chrome side-by-side so the difference is attributed to the player, not the work.
