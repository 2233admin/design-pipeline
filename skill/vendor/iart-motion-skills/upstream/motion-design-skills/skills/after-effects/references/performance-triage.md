# Performance Triage — Slow, Laggy, Crashing, Frozen

Diagnose slow previews, slow renders, freezes, and crashes in a fixed order, from cheapest fix to most invasive. Work top-down and stop when the symptom clears — most issues are solved in the first few steps.

Most fixes live in Preferences. Open `Edit > Preferences` (Windows) or `After Effects > Settings/Preferences` (macOS).

## First: identify the symptom

- **Slow / non-real-time previews (RAM preview)** → Flow A
- **Slow renders (final output)** → Flow B
- **Crashes / freezes / hangs** → Flow C

## Flow A — Slow previews (do in order)

1. **Set Resolution to Auto/Half/Third.** In the Composition viewer, change Resolution from Full to **Half** or **Third**. Adaptive/Draft resolution gives the biggest instant win.
2. **Enable Multi-Frame Rendering (MFR).** `Preferences > Memory & Performance > Enable Multi-Frame Rendering`. Uses all CPU cores for preview and render (AE 2022+). Confirm "CPUs reserved for other applications" isn't set too high.
3. **Check RAM allocation.** `Preferences > Memory & Performance`. Leave ~6 GB for the OS; give the rest to AE. Too little RAM = a tiny green preview bar.
4. **Set Fast Previews to Adaptive Resolution.** Viewer's lightning-bolt icon → **Adaptive Resolution** (degrades resolution only while interacting).
5. **Purge the cache.** `Edit > Purge > All Memory & Disk Cache`. Stale/full cache stalls previews.
6. **Verify the Disk Cache is on a fast drive.** `Preferences > Media & Disk Cache` → Enable Disk Cache, point it at a fast **SSD/NVMe**, give it 50–100+ GB. Never on a slow external HDD.
7. **Solo the offending layer/effect.** Toggle effects off (the fx switch) or solo layers to find the bottleneck. Heavy culprits: blurs, glows, Mocha/tracking, particles, expressions, large 3D, and many third-party plugins.
8. **Enable GPU / hardware-accelerated decoding.** `Preferences > Video Preview` (Mercury GPU) and `Preferences > Import > Hardware Accelerate H.264/HEVC decoding`. Helps long-GOP source footage.
9. **Pre-render or proxy heavy comps.** Pre-render a finished/slow precomp to ProRes and set it as a **proxy** (`File > Create Proxy`, or right-click footage → Set Proxy). Frees compute for the part being worked on.
10. **Trim the work area** to just the section in progress so RAM preview fills faster.

## Flow B — Slow renders (do in order)

1. **Confirm Multi-Frame Rendering is on** (`Memory & Performance`) — the single largest render speedup on multi-core CPUs.
2. **Render with the Render Queue for masters, AME for delivery** — and don't run heavy work in AE while AME renders.
3. **Enable hardware-accelerated decoding** for H.264/HEVC sources (`Preferences > Import`).
4. **Pre-render slow precomps** once and reuse them, instead of recomputing every frame. Heavy effect stacks, time-remapping, and 3rd-party renderers benefit most.
5. **Replace effects with cheaper equivalents** where possible (e.g., Fast Box Blur over Gaussian; native over plugin).
6. **Convert long-GOP source to an intermediate** (ProRes/DNxHR). Decoding H.264 every frame is slow; ProRes is cheap to read.
7. **Check the renderer:** `Composition > Composition Settings > 3D Renderer`. Classic 3D is fastest; Cinema 4D/Ray-traced renderers are far slower.
8. **Disk Cache on NVMe** so repeated frames aren't recomputed.
9. **Close other apps**, especially other Adobe apps and browsers, to free RAM/CPU for MFR.

## Flow C — Crashes / freezes / hangs (do in order)

1. **Purge cache** (`Edit > Purge > All`). A full/corrupt cache causes hangs.
2. **Clear the Disk Cache folder** in `Preferences > Media & Disk Cache > Empty Disk Cache`. Corrupt cache files cause crash-on-open.
3. **Update GPU drivers** (NVIDIA Studio driver / AMD). Outdated/Game-Ready drivers cause Mercury GPU crashes. As a test, switch Project renderer GPU→CPU (`File > Project Settings > Video Rendering and Effects: Mercury Software Only`).
4. **Reset Preferences:** hold `Ctrl+Alt+Shift` (Win) / `Cmd+Opt+Shift` (Mac) while launching AE. Corrupt prefs are a top crash cause.
5. **Disable third-party plugins** by temporarily moving them out of the plug-ins folder, then reintroduce to find the offender. Old plugins are a leading crash/freeze source after AE updates.
6. **Check Disk Cache and Output drives for free space.** A full scratch/cache disk causes freezes mid-render.
7. **Lower or disable MFR** if crashes appear only during multi-frame render — some plugins are not MFR-safe; reserve more CPUs or disable MFR for those projects.
8. **Roll back the AE version** if crashes started right after an update. Install a previous version via Creative Cloud (Other Versions) — many crash waves are version-specific regressions.
9. **Look for a single corrupt asset** — import comps one at a time, or replace footage, to isolate a bad file.

## Quick reference

| Symptom | First three moves |
|---|---|
| Choppy RAM preview | Half resolution → enable MFR → purge cache |
| Tiny green preview bar | Raise RAM allocation → SSD disk cache → trim work area |
| Slow final render | Enable MFR → HW decode H.264 → pre-render precomps |
| Crash on launch | Reset prefs (modifier keys) → empty disk cache → update GPU driver |
| Crash mid-render | Free disk space → disable/reserve CPUs for MFR → disable 3rd-party plugins |
| Started after update | Roll back AE version → update plugins → reset prefs |
| Laggy with footage | HW-accelerated decode → transcode to ProRes → proxy heavy comps |

## Gotchas

- **MFR needs RAM per core.** With many cores but little RAM, MFR can underperform or stall — aim for several GB per active core.
- **Game-Ready drivers crash AE.** Prefer the **Studio** driver branch on NVIDIA.
- **Disk Cache on an external HDD is worse than none** — it must be SSD/NVMe to help.
- **Plugins lag behind AE updates.** After a major AE upgrade, a sudden crash wave usually means a plugin needs updating or is not MFR-safe.
- **Purging clears the green bar.** Previews must rebuild afterward; that initial slowness is expected, not a new problem.
- **CPU/GPU effects are not equal.** A few GPU-accelerated effects are fast; mixing many CPU-only effects forces round-trips that kill preview speed.
- **Don't render in AE and AME simultaneously** on the same machine — they fight for cores and RAM.

---

# AE Performance — Detailed Diagnostics Reference

## Preference locations and recommended values

| Setting | Path | Recommended |
|---|---|---|
| RAM for AE | Preferences > Memory & Performance | Total RAM minus ~6 GB for OS |
| Multi-Frame Rendering | Memory & Performance > Enable MFR | On; reserve 0–2 CPUs for other apps |
| Disk Cache | Media & Disk Cache > Enable Disk Cache | On, SSD/NVMe, 50–150 GB |
| Conformed media cache | Media & Disk Cache | On SSD, separate from project if possible |
| HW decode (H.264/HEVC) | Import > Hardware Accelerate Decoding | On |
| Mercury GPU | Project Settings > Video Rendering and Effects | GPU (CPU as crash test) |
| Fast Previews | Viewer lightning icon | Adaptive Resolution |

## Multi-Frame Rendering (MFR) tuning
- Introduced in AE 2022 (22.x); renders multiple frames in parallel across CPU cores for both preview and final render.
- **RAM is the limiter.** Each rendering frame needs memory; with too little RAM, AE quietly reduces the cores it uses. Target several GB of free RAM per logical core you want active.
- "CPUs reserved for other applications" trades render speed for system responsiveness. Set 0–2 on a dedicated machine.
- Some legacy/3rd-party effects are **not MFR-safe** and can crash or render incorrectly under MFR. If a specific project crashes only with MFR on, disable MFR for that project or update the plugin.

## GPU and drivers
- Use the **NVIDIA Studio Driver** (not Game Ready) for stability with Adobe apps; keep AMD drivers current too.
- Mercury GPU acceleration speeds some effects and the renderer. If AE crashes on launch or while playing back, switch `Project Settings > Video Rendering and Effects` to **Mercury Software Only** to confirm GPU/driver fault, then update drivers.
- Hardware-accelerated **decoding** (separate from rendering) speeds reading H.264/HEVC source footage; enable in `Preferences > Import`.

## Disk cache sizing and placement
- Put the disk cache on the **fastest local drive** (internal NVMe ideal). Never on a slow USB HDD or a network drive.
- 50–150 GB is typical; more helps long projects retain cached frames between sessions.
- Symptoms of a bad cache: hangs on open, garbage frames, refusal to play. Fix via `Empty Disk Cache` and `Edit > Purge > All`.
- Keep the cache drive from filling up — a full cache/scratch disk causes mid-render freezes.

## Pre-render and proxy workflow
1. Identify a slow, finished precomp (heavy effects, particles, 3D, tracking).
2. Add it to the Render Queue and render to **ProRes 422/422 HQ** (or PNG sequence).
3. Right-click the footage/comp in the Project panel → **Set Proxy > File**, select the rendered file. A box icon shows the proxy is active.
4. Toggle the proxy off for final render if you want to re-render at full quality, or keep it if the pre-render is final.
5. Alternatively `File > Create Proxy > Movie/Still` to queue a proxy directly.
- Proxies let AE substitute a cheap-to-read file for an expensive comp/footage during editing.

## Heavy effect culprits (preview/render cost)
- Gaussian Blur, Camera Lens Blur, Glow → use Fast Box Blur where acceptable.
- Particle systems (Particular, Form), Element 3D, Plexus.
- Mocha tracking, Warp Stabilizer (analysis), motion tracking.
- Expressions that read many layers/time, especially per-frame heavy ones.
- Nested precomps with collapsed transformations and continuous rasterization.
- Ray-traced / Cinema 4D 3D renderer vs Classic 3D.

## Version-specific culprits
- After a **major AE update**, a sudden crash/slowdown wave usually traces to a third-party plugin not yet updated for that AE version — update plugins or remove them to test.
- If problems began immediately after updating AE, install the **previous version** from Creative Cloud → app → Other Versions, and report the regression.
- Reset corrupt preferences by holding `Ctrl+Alt+Shift` (Win) / `Cmd+Opt+Shift` (Mac) during launch; this resolves many post-update oddities.

## Isolation checklist for crashes
1. Reset preferences (modifier-key launch).
2. Empty disk cache + Purge All.
3. Update GPU driver (Studio branch).
4. Move 3rd-party plugins out, relaunch, reintroduce one at a time.
5. Switch Mercury to Software Only to rule out GPU.
6. Import comps/footage incrementally to find a corrupt asset.
7. Disable MFR for the project if crashes are MFR-specific.
8. Roll back AE version if the crash wave is version-correlated.

## When to pre-compose vs pre-render
- **Pre-compose** to organize and to apply an effect to a group — does not by itself speed anything up (it can even add overhead).
- **Pre-render** (render to a file + use as proxy/footage) when a precomp is finished and slow — this is the actual performance win.
