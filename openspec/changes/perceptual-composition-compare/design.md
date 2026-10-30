## Decisions

1. Vendor pixelmatch at a pinned release into `skill/vendor/pixelmatch/` (source and LICENSE, unmodified),
   record it in `THIRD_PARTY_NOTICES.md` and `package-resources.json`. Call it with `threshold: 0.1` and
   `includeAA: false`; count anti-aliased pixels from its output colour.
2. SSIM: luminance from premultiplied RGBA, 8×8 non-overlapping windows, standard constants
   (K1 = 0.01, K2 = 0.03, L = 255), mean over windows. About 40 lines in `diagnostics.cjs`.
3. Report fields: `metrics.perceptualChangedFraction`, `metrics.antialiasedPixels`, `metrics.ssim`, and a
   `metricsMethod` entry naming pixelmatch's version and threshold and the SSIM window.
4. The viewer page shows the new difference image under its own heading.

## Risks

- pixelmatch's anti-aliasing detection can hide a one-pixel hairline that really changed. The original
  `difference.png` stays, so that change is still visible.
