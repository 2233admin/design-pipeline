# Film method maintenance examples

These two examples verify the selected methods with **Design Pipeline's actual account-settings
evaluation component**, not a production account service or an externally licensed UI. The source
is `evals/cases/skill-behavior/index.html`; both plans bind its byte hash, real labels and palette.
Browser capture runs its actual input, notification switch and submit handlers. No private user
data or account backend is involved.

```powershell
node scripts/run-film-methods-eval.cjs --render
```

Run from the repository root after `npm ci` and `npm run browser:install`, with FFmpeg/FFprobe
available. The existing maintenance toolchain is pinned; no global install or external generator
is needed. Each run creates a fresh ignored `.design-pipeline/film-methods-eval-*` directory with
selection, source captures/observations/hashes, method libraries, film output, timeline, existing
film-check result, contact sheets and render diagnostics. The default invocation captures and
prepares without rendering; `--render` completes the existing HyperFrames/film-check path.

- `brand-promo`: 6-second actual form input, notification change and save result. Selected
  isolating push/native UI techniques use the maintained Cinetic `E.ui` easing in the film camera.
- `feature-loop`: 4-second actual on/off/on switch action and a finite camera-return cycle.
  Seamless-orbit's return/seam principle is explicitly adapted to flat 2D UI; no 3D orbit is claimed.

The focused regression checks actual browser timeline positions and adapter easing, including
the returning loop camera; it does not repeatedly render full videos during repository QA.
The render run checks the actual captured actions, source identity and existing film gates.
Inspect the ordered output frames before claiming output quality. Sound is deliberately silent;
no audio was auditioned. Component Conformance and user Visual Acceptance remain separate,
and these examples are maintenance evidence rather than user-approved golden cases.
