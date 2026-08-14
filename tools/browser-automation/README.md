# Prewalk browser automation

Install the pinned runtime from this directory:

```powershell
npm ci
npm run install-browser
npm test
```

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
