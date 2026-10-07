# Preload saved browser state for agent-browser evidence

## Why

`evidence capture` with `adapters/agent-browser.cjs` always starts from an empty browser profile
and captures the page right after load. Some surfaces only appear after saved state is restored.
KatanaConsole (2026-10-07) is one: its market-depth and tape panels need a saved layout, a
switched-on data source and a chosen instrument, all kept in localStorage. Its evidence therefore
showed an empty workspace, and the real surface had to be checked with ad-hoc scripts outside the
evidence lineage.

agent-browser already loads saved cookies and localStorage with `--state <file>` (the output of
`agent-browser state save`); measured with 0.38.2, it restored the saved workspace.

Issue: 2233admin/design-pipeline#83.

## What Changes

- `evidence capture` gains `--agent-browser-state <file>`. The file must resolve inside
  `--project-root`, the trust rule `--agent-browser` already uses. The host forwards it as
  `DESIGN_PIPELINE_AGENT_BROWSER_STATE`, and the adapter passes it to agent-browser as `--state`
  when the session starts.
- The receipt's probe message names the state file and its sha256, so the capture traces back
  to the exact state. The contents are never copied into the evidence, because state files can
  hold session cookies.
- The option fails closed without `--agent-browser`, so no other adapter can silently ignore it.

## Non-Goals

- No new receipt field, request field, schema or gate.
- No scripted interaction before capture. State that cannot be saved as cookies and
  localStorage stays out of scope.
- No change to `adapters/playwright.cjs`.
