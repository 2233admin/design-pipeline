# Prewalk browser automation

Install the pinned workspace runtime from the repository root (Node.js 22.12+):

```powershell
cd <repository-root>
npm ci
npm run browser:install
npm run test:browser
```

`npm run browser:install` installs Playwright Chromium and prepares the HyperFrames browser.
From the repository root, `npm test` runs repository QA and then this workspace's self-tests.
These private maintenance dependencies are not installed into downstream projects or included
with the packaged skill.

Comparison reports keep `prewalk.pipeline.comparison.v1` and record pixelmatch 8.0.0's OKLab HyAB
metric, the actual options, threshold meaning, and total-pixel count mode. The threshold remains
0.1 on the 0–1 scale (`1` is black versus white) and anti-aliased pixels remain included. Version 8
changes the color metric from version 7's YIQ, so pixel-difference counts are not directly
comparable; preserve old reports and goldens instead of rewriting or re-approving them.

Local implementation arguments may be repo-relative paths; the adapter converts them to `file:`
URLs only while navigating, so generated comparison receipts remain portable.

Run fidelity comparisons in the default headed mode because the retained Chromium baseline was
captured headed. `--headless` is useful for smoke tests, but its font rasterization is not equivalent
to that baseline.

```powershell
node prewalk-pipeline.cjs compare `
  --url https://stencil.so/blog/prewalk `
  --implementation-url ../../experiments/prewalk-pipeline/index.html `
  --reference-dir ../../openspec/changes/clone-stencil-prewalk-pipeline/verification-4/reference `
  --out <temporary-output-directory>
```
