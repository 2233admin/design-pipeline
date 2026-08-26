# QA

- Official source reviewed: `heygen-com/hyperframes` at revision
  `0e4da52c8222b8d18a1211b34f2fb3bd0f7e79ee` on 2026-08-14.
- Focused HyperFrames routing and reference-contract tests: 2 passed, 0 failed; the existing
  frontend routing tests also pass.
- Full repository/package QA: 401 repository tests passed; reproducible archives, isolated install,
  replacement guard, installed self-check, and installed CLI smoke passed.
- Live HyperFrames rendering is not run because this change does not install a target project
  runtime, Chrome, FFmpeg, or external workflow skill tree.
