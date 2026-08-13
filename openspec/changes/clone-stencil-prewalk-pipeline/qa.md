# QA: Prewalk pipeline reconstruction

## Scope And Authority

- Mode: exact reconstruction of `https://stencil.so/blog/prewalk` for local comparison.
- Candidate: `experiments/prewalk-pipeline/index.html`.
- Coverage: all 12 observed regions, from `site-header` through `site-footer`.
- Baseline A remains separate at `experiments/prewalk-story/` and was not used as implementation
  authority.
- Final comparison used no masks and no accepted differences.

## Gate Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Browser provenance | Pass | Visible Chromium 151, device scale 1; `targets/stencil-so-blog-prewalk/evidence/reference/capture-summary.json` |
| Design and motion foundations | Pass | `designer-pipeline foundation check --kind all`; hashes recorded in `design.md` and `motion.md` |
| Direction | Pass, waived | Exact-primary-target waiver in `direction-preview.json` |
| Reference and reconstruction | Pass | Approved v2 intent, 12 landmarks across 5 regions, mean/max error `0px`; `reference-evidence.json`, `reconstruction.json` |
| Spec reconciliation | Pass | Fresh `graybox.png`; zero implementation value changes from the measured spec |
| Builder | Pass | Builder self-test; 22 localized assets; `experiments/prewalk-pipeline/build-receipt.json` |
| Runtime source independence | Pass | Zero forbidden iframe, live Stencil CSS, module preload, external script, or root-relative asset matches |
| Asset integrity | Pass | All 22 manifest destinations exist and match their SHA-256 values |
| Website clone evaluator | Pass | Verdict `complete`, no reasons; `website-cloning.json`, `verification.json` |
| Pipeline lifecycle | Pass | v2 state at `gate-review`, status `verifying`, event history `consistent` |
| Regression checks | Pass | 39/39 website-cloning and pipeline CLI tests; both local adapters passed self-test and syntax check |

## Visual And Responsive Evidence

| Viewport | Pixel difference | SSIM | Max layout delta | Text | Assets | Interactions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `1440×900` | `0.0001743703` | `0.9997225956` | `0px` | `1.0` | `16/16` | `8/8` |
| `768×1024` | `0.0005896641` | `0.9997802973` | `0px` | `1.0` | `16/16` | `8/8` |
| `390×844` | `0.0003907620` | `0.9998522865` | `0px` | `1.0` | `16/16` | `8/8` |

All three pixel ratios are below the declared `0.001` ceiling and all SSIM values exceed `0.999`.
The authority's intentional horizontal document overflow on the mobile layout is preserved rather
than normalized away. Full renders, observations, diffs, and the comparison receipt are under
`verification-final/`.

## A/B Evidence

The same EvidencePort also measured preserved baseline A against the same source capture. A failed
the exact gates: pixel difference was `0.0756578760`, `0.1885120318`, and `0.0875369356`; layout
delta reached `4188.34px`, `4259.73px`, and `5641.63px`; text coverage was `0.9043`; interaction
coverage was `0.375`; and only `13/16` observed assets were present. B reduced pixel difference by
about `434×`, `320×`, and `224×` respectively, while reaching full text, asset, and interaction
coverage with zero layout delta. Raw A evidence is under `verification-baseline-a/`; the normalized
comparison is `ab-comparison.json`.

## Interaction, Accessibility, And Motion

- Actual-browser hover and focus states were replayed for the source and candidate.
- All eight controls remain keyboard reachable in source order and expose non-empty accessible
  names: brand, blog, three share links, copy link, article link, and hash link.
- The copy button wrote `https://stencil.so/blog/prewalk` in both source and candidate and reproduced
  the `Copied` state without layout movement.
- Semantic header, navigation, main article, headings, lists, tables, links, button, and footer remain
  real DOM. Only the four non-interactive canvas explanations use localized responsive frames.
- Reduced-motion audit found zero active animations and zero non-zero animation or transition
  durations. Native scrolling and hash navigation remain available.
- Runtime audit found zero console errors and zero failed requests; see
  `verification-final/runtime-audit.json`.

## Engineering Fit And Limits

- The implementation adds no framework, runtime library, package, iframe, analytics, or hydration
  dependency. Existing Node, Playwright, PNGJS, and Pixelmatch installations are reused.
- Localized source assets are licensed here only as local evaluation evidence and are not cleared for
  publication.
- The repository-local pipeline was authoritative for this run. The globally installed copy lacks
  four newer repository references, so it was not used to make or validate target decisions.

## Scorecard And Verdict

- Fidelity: `10/10`
- Content and interaction coverage: `10/10`
- Responsive and accessibility behavior: `10/10`
- Evidence and engineering fit: `10/10`

Verdict: **PASS — exact reconstruction complete for all declared pages, regions, viewports, and
interaction states.**
