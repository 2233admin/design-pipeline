# Film methods execution evidence

Date: 2026-10-09. This records the QA worker's independent selection/output review and native
Windows run. Repository-wide frozen-tree checks, package/install synchronization and exact CI
head are recorded by the primary agent separately.

## Provenance and selection review

- Prompt Motion's index and both requested case pages were actually read using the web tool.
  Authors, repository links, page dates and descriptions are in `skill/references/prompt-motion.md`.
  Embedded videos were not watched and soundtracks were not heard. No media was mirrored.
- Ordinary Chinese CSS focus/reduced-motion work and a Chinese account-settings page both
  returned the existing `product-design` job from the public `route` command. The new preparation
  does not enter those flows or require a storyboard, audio or Remotion.
- Method preparation received explicit `product-film`/`feature-loop` tasks, source methods and
  technique IDs. Both keep 30fps, intentional silence and the existing HyperFrames engine.
- Project identity comes from the actual Design Pipeline README; application presentation comes
  from `evals/cases/skill-behavior/index.html`. Root DESIGN.md states each target owns its identity
  and does not define a shared application palette. This is Design Pipeline's real evaluation
  example, not a production account service or an external brand endorsement.

## Reproduction and actual discovery

```powershell
node scripts/run-film-methods-eval.cjs --render
node --test tests/film-methods-eval.test.cjs
```

The script accepts only `--render` and `--help`, always creates a new ignored local evidence
directory and refuses output escapes or existing case evidence. It uses no global install,
private data, paid generation, cloud score service or upstream shell renderer.

Successful evidence root: `.design-pipeline/film-methods-eval-d8ZGyL/`.

Before preparation, `project inspect --scope evals/cases/skill-behavior/index.html --query
profile-form` produced `project-discovery.json` with actual paths/lines/hash and no exhausted
scope budget. Actual browser capture then read computed background, foreground, font, button
color and control labels into `assets/capture.json`. The source HTML SHA-256 is
`f0c9fde141f76cb3d16e882be1ef7eb61d1eca5e3d492f262263981b8d945a7c`.

The chain is inspected real source → computed tokens and original controls → actual demo
interaction recording → frame-twin footage → selected technique/adapter → existing render and
checks. The script compares source identity to the method selection again after capture.
No source component is replaced by a generic card. Each `selection.json` includes actual brand,
component, storyboard, complete technique recipe and locked source revision identities.

Both compositions load the selected original Cinetic motion source plus the maintained adapter.
`FilmMotion.create({fps:30,bpm:120}).E.ui` actually drives finite camera push/pan/return; adapter
beat-to-frame conversion sets the durations. The focused regression seeks the actual browser
timeline to start, midpoint, quarter and end, comparing actual x/y/scale and the selected easing.
The loop's orbit recipe is explicitly adapted to a bounded flat 2D camera return because this
source provides no 3D depth. Upstream aesthetic bans and recipe FPS are not adopted.

## Outputs and checks

Host: native Windows PowerShell, Node 26.3.1, HyperFrames 0.8.137, GSAP 3.15.0,
Chrome-headless-shell 152.0.7977.30, FFmpeg/FFprobe 9.0.2. Existing resolver/toolchain paths are used.

| Example | Actual action | Output | Existing film checks | Output SHA-256 |
| --- | --- | --- | --- | --- |
| `brand-promo` | Type demo name/email into the original inputs, toggle notifications off, submit its real handler, read `资料已保存。` | 1920×1080, 30fps, 6s, silent | storyboard, timeline, render, composition and check passed | `45bde4cbb1ed817ad212e3c18d0eb19177fe1a0a64d5c3449d1167de37da1804` |
| `feature-loop` | Original notification switch on → off → on, with finite camera return | 1920×1080, 30fps, 4s, silent | storyboard, timeline, render, composition and check passed | `e76fbc0b42b42745dad295c39e9701c945f609fc2f6ab9f1cb15a7da77420315` |

Actual interaction assertions passed. Film technical results are `passed`; **Component Conformance
is not assessed by film check**. Source behavior assertions are recorded separately. **User Visual
Acceptance is not assessed**; neither technical gates nor this frame review grant approval.

## Independent output inspection

The QA worker used `view_image` on decoded files, rather than inferring success from metadata:

- Promo: `review-first.png` at 0s, `evidence/beat-001.png` at 3s and `review-last.png` at
  5.9667s. The observed frames show initial placeholders, the real typed demo fields, the switched
  notification control and the final actual saved confirmation. Source labels/form shape and
  light green presentation remain visible; the camera has a small spatial push and return.
- Loop source and render: `source-loop-{0,1,3}.png` and `render-loop-{0,1,3}.png` at 0,
  1.8 and 3.9667s. The initial/final control is green/on, the middle control is gray/off, and the
  camera returns. A second decoded middle at 2.3s also participates in the pixel check.
- The frame comparisons use channel delta >16 to tolerate codec noise. Both middle frames must
  differ from the start by >0.02%; the seam must differ by <0.5%. Source seam measured 0.001889%,
  both source middles 0.11778%; rendered seam 0.034192%, rendered middles 2.91001%/2.84867%.
  `source-loop-pixels.json` and `render-loop-pixels.json` retain times, limits and measured values.
  A static middle cannot pass this test. These limits do not measure aesthetic quality.

Both existing composition checks return `dead-band` and `no-focal-point` warnings. Reviewed
disposition: the deliberate light-background split presents an explanation beside the real UI;
the original form remains readable and visible. This is sufficient for bounded maintenance
evidence, and is not a claim of finished marketing quality. Warnings remain in the reports.
HyperFrames warns that sidecar `Microsoft YaHei` lacks a deterministic font mapping. This run
observed the installed Windows font; no matching typography across other platforms is claimed.

No uninterrupted full-speed playback or audio listening is claimed. Both examples intentionally
contain no audio track; sound/score quality and picture/music synchronization are not exercised.

## Failures found and corrected

1. `.design-pipeline/film-methods-eval-372Odq/`: actual loop assertion failed because the promo's
   saved localStorage state was inherited by the next browser page. Fixed by isolating each case
   in its own browser context. The failed encoded source and `failure.log` remain available.
2. `.design-pipeline/film-methods-eval-kidciL/`: existing timeline check rejected a scale-only
   camera (`beat-fade-only`), although actual recorded UI actions passed the render check. The
   chosen isolating camera push now includes a small motivated spatial pan and returns to origin;
   no gate was changed. The failed film-check, render output/log and failure log remain available.
3. An early focused test served multiple projects from a root lacking fallback `index.html`;
   missing media requests caused ENOENT. The test now serves each actual project directory and
   closes its owned server/browser. This regression uses actual browser seeking without repeating
   full renders; it does not claim missing test media is a rendered product.

The final focused suite passed 2/2. It covers unknown flags, output containment/overwrite refusal,
non-static pixel comparison and actual timeline/easing/duration/loop return.

## Execution boundary

Verified: Node method preparation, original-motion-plus-maintained-adapter classic scripts,
real source discovery/interaction capture, selected native Windows HyperFrames rendering and
existing film checks. Complete source readability is handled by separate source/package tests.

Not executed here: Cinetic macOS/Linux shell workflows, WSL, source-only Python/Bun/TS/TSX tools,
Product Film's Remotion kit, cloud providers, generated music, alpha/social alternate exports,
Prompt Motion videos or audio. Runtime libraries for arbitrary upstream scripts are not installed.
Existing target, policy, snapshot and receipt contracts remain unchanged; these are supporting
ordinary artifacts, not a new receipt schema or an acceptance authority.
