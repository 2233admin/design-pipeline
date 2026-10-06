# Publication validation — 2026-10-07

- Source: [PR #70](https://github.com/2233admin/design-pipeline/pull/70).
- Live demo: [enamel badge](https://2233admin.github.io/design-pipeline/enamel-badge/).
- [Isolated GitHub CI](https://github.com/2233admin/design-pipeline/actions/runs/37516818728) passed repository QA, reproducible packaging and artifact upload on source commit `dd06aa30c40f2b648435dc6d2017e4085144b223`.
- The static site is published from a separate `gh-pages` tree containing only the example and its entry page. Runtime source is the same example tree as this PR.

## Performed checks

`node examples/enamel-badge/serve.cjs --check` passed local import closure, required assets/licenses, and encoded traversal/invalid-path rejection. The existing `lib/caustics.mjs` math/state self-check passed. Strict OpenSpec validation and whitespace checks passed.

Actual browser rendering was inspected at 1280×720 and 390×844. The narrow canvas correctly used a 780×1688 drawing buffer. Playback, pause, reset, canvas keyboard controls and the actual shader program links passed. The public HTTPS page loaded the local modules and daylight HDR, compiled both custom materials, and reported no console warnings/errors. Previews are actual screenshots of this renderer.

The first local repository QA run had 806 passing tests, one environment-dependent failure and three skips; its installed-package smoke passed 11/11. The old film-project test expected Puppeteer to be absent, but a host ancestor already provided it, so the intentionally invalid browser executable was reached. Its repository-status comparison also overlapped example authoring. Neither unrelated test nor runtime was altered; the clean GitHub runner passed the repository's complete QA command before merge.

## Acceptance and boundary

The owner explicitly requested open-source publication of this local sample. Publication and engineering checks do not assert reference fidelity or complete visual acceptance. This is the existing v7 material study with repeated human correction; glass remains an acknowledged approximation. No original reference video, extracted images, audio, private receipts or machine paths are published.
