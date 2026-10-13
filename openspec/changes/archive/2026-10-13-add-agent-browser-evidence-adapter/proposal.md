# Add an agent-browser web evidence adapter

## Why

The `dynamic-web-verification` route requires DOM, screenshot, console, accessibility, network
and performance evidence. The only bundled web adapter, `adapters/playwright.cjs`, writes
`accessibility.json` and `performance.json` as `unknown`, writes `network.json` as `[]`, records
console events without uncaught page errors, and always returns `partial`. Filling those slots
by hand would mean shipping our own axe integration, request log and Web Vitals collector.

[vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) (Apache-2.0, a
single native binary distributed on npm) already provides all of them behind one CLI: an
embedded axe-core audit, tracked network requests with status codes, Web Vitals, console
messages, uncaught page errors, full-page screenshots, DOM evaluation and Chrome traces. A
2026-10-06 run against a React/Vite app filled every slot in one `batch --json` call and
surfaced a 404 that console events alone did not show.

Issue: 2233admin/design-pipeline#67.

## What Changes

- Add the bundled adapter `skill/adapters/agent-browser.cjs`. It fills all seven artifacts of
  the existing `design-pipeline.evidence-receipt.v1` and returns `complete` only when every
  artifact was captured.
- `evidence capture` gains `--agent-browser <path>` (the agent-browser executable or its npm
  wrapper, contained in the project root like `--playwright-module`) and forwards the existing
  `--chrome <exe>` option, because agent-browser cannot discover a browser inside the bounded
  adapter environment.
- Network evidence drops request and response headers; the receipt records the redaction as
  `applied`.
- The Chrome trace is stored gzipped (`trace.json.gz`); the raw trace of a small page is about
  60 MB.

## Non-Goals

- No new receipt schema, gate or request field. Device scale factor needs a request schema
  change and stays a follow-up.
- No change to `adapters/playwright.cjs`; callers keep choosing an adapter explicitly.
- The core still never installs or downloads agent-browser or a browser.
